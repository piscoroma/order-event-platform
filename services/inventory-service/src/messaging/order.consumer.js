const crypto = require('crypto');
const { runWithContext, getContext } = require('../observability/context_storage');
const { headers } = require('nats');
const { AlreadyProcessingError } = require('../errors/inventory.errors');

const STREAM_NAME = 'ORDERS';
const CONSUMER_NAME = 'inventory-service';

const MAX_RETRIES = 5;

function createOrderConsumer({ natsClient, inventoryService, logger }) {

   let nc = null;
   let js = null;
   let jc = null;

   // -------------------------
   // BOOTSTRAP
   // -------------------------
   async function start() {
      nc = natsClient.getNc();
      js = natsClient.getJs();
      jc = natsClient.jc;

      if (typeof nc.jetstreamManager !== 'function') {
         throw new Error('JetStream not supported by server/client');
      }
      const jsm = await nc.jetstreamManager();

      try {
         await jsm.consumers.info(STREAM_NAME, CONSUMER_NAME);
         logger.info('Consumer already exists', { consumer: CONSUMER_NAME });
      } catch (_) {
         await jsm.consumers.add(STREAM_NAME, {
            durable_name: CONSUMER_NAME,
            filter_subject: 'order.created',
            ack_policy: 'explicit',
            deliver_policy: 'all',
            ack_wait: 30 * 1e9,
            max_deliver: MAX_RETRIES,
         });
         logger.info('Consumer created', { consumer: CONSUMER_NAME });
      }

      const consumer = await js.consumers.get(STREAM_NAME, CONSUMER_NAME);

      await startConsuming(consumer);
   }

   // -------------------------
   // SAFE WRAPPER
   // -------------------------
   async function startConsuming(consumer) {
      while (true) {
         try {
            const messages = await consumer.consume();
            logger.info('Order consumer started');
            for await (const msg of messages) {
               handleSafe(msg).catch(err => {
                  logger.error('Unhandled error', { error: err.message });
               });
            }
         } catch (err) {
            logger.error('Consumer loop broken, restarting...', { error: err.message });
            await new Promise(r => setTimeout(r, 2000)); // restart
         }
      }
   }

   async function handleSafe(msg) {
      const correlationId =
         msg.headers?.get('correlation-id') || crypto.randomUUID();
      return runWithContext({ correlationId }, async () => {
         try {
            await handleMessage(msg);
         } catch (err) {
            logger.error('Fatal message handling error', {
               error: err.message,
               seq: msg.seq,
            });

            msg.nak(getBackoffMs((msg.info.redeliveryCount ?? 0) + 1));
         }
      });
   }

   // -------------------------
   // CORE LOGIC
   // -------------------------
   async function handleMessage(msg) {
      const payload = jc.decode(msg.data);
      if (!payload?.orderId || !Array.isArray(payload?.items) || payload.items.length === 0) {
         logger.warn('Invalid payload, discarding message', { payload, orderId: payload.orderId });
         await js.publish(
            'inventory.reservation.failed',
            jc.encode({ reason: "Invalid Payload", payload }),
            {headers: buildHeaders()}
         );
         logger.info('Pub on inventory.reservation.failed', {orderId: payload.orderId});
         msg.ack();
         return;
      }
      
      const orderId = payload.orderId;
      const attempt = (msg.info.deliveryCount ?? 1) 

      logger.info('A request order arrived', {orderId, attempt});
      if (await inventoryService.isProcessed(orderId)) {
         logger.info('Order already processed, skipping message', {orderId});
         msg.ack();
         return;
      }

      try {
         await inventoryService.markProcessing(orderId);
      } catch (err) {
         if (err instanceof AlreadyProcessingError) {
            logger.info('Order already being processed, skipping message', {orderId});
            msg.ack();
            return;
         }
         throw err;
      }

      try {
         logger.info('Start processing order', {orderId});
         const result = await inventoryService.reserveItems(payload.items);

         await js.publish(
            'inventory.reserved',
            jc.encode({ orderId, ...result }),
            {headers: buildHeaders()}
         );
         logger.info('Pub on inventory.reserved', {orderId});

         await inventoryService.markDone(orderId);

         msg.ack();
      }

      catch (err) {
         const retryable =
            ['ETIMEDOUT', 'ECONNRESET', 'EPIPE'].includes(err.code) ||
            err.retryable === true;

         logger.info('Order failed', {orderId, retryable});

         if (!retryable) {
            // Business failure
            await js.publish(
               'inventory.reservation.failed',
               jc.encode({ orderId, reason: err.message }),
               {headers: buildHeaders()}
            );
            logger.info('Pub on inventory.reservation.failed', {orderId});
            await inventoryService.markFailed(orderId);
            msg.ack();
            return;
         }

         // max retry reached, send DLQ
         if (attempt >= MAX_RETRIES) {
            await publishDLQ(msg, payload, err, attempt);
            logger.info('Pub on inventory.dlq', {orderId});
            await inventoryService.markFailed(orderId);
            msg.ack();
            return;
         }

         // delegate retry to JetStream
         await inventoryService.resetProcessing(orderId);
         msg.nak(getBackoffMs(attempt));
      }
   }

   // -------------------------
   // HELPERS
   // -------------------------
   async function publishDLQ(msg, payload, err, attempt) {
      await js.publish(
         'inventory.dlq',
         jc.encode({
            orderId: payload.orderId,
            reason: err.message,
            attempt,
            timestamp: Date.now(),
            originalSubject: msg.subject
         }),
         {headers: buildHeaders()}
      );
   }

   function getBackoffMs(attempt) {
      return Math.min(1000 * 2 ** attempt, 30_000);
   }

   function buildHeaders() {
      const ctx = getContext();
      const h = headers();

      if (ctx?.correlationId) {
         h.set('correlation-id', ctx.correlationId);
      }
      h.set('message-id', crypto.randomUUID());

      return h;
   }

   return { start };
}

module.exports = createOrderConsumer;
