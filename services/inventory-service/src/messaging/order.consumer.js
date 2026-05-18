const crypto = require('crypto');
const { runWithContext } = require('../observability/context_storage');
const { getBackoffMs } = require('./consumer.utils');
const { createOrderCreatedHandler } = require('./order.created.handler')
const { createOrderCancelledHandler } = require('./order.cancelled.handler')
const {
   natsMessagesReceivedTotal,
   natsMessagesProcessedTotal,
   natsMessageProcessingDuration,
} = require('../observability/metrics');

const ORDERS_STREAM = 'ORDERS'; 
const INVENTORY_STREAM = 'INVENTORY';
const CONSUMER_NAME = 'inventory-service';

const MAX_RETRIES = 5;

function createOrderConsumer({ natsClient, inventoryService, logger }) {

   let nc = null;
   let js = null;
   let jc = null;
   let orderCreatedHandler = null;
   let orderCancelledHandler = null;

   // -------------------------
   // BOOTSTRAP
   // -------------------------
   async function start() {
      nc = natsClient.getNc();
      js = natsClient.getJs();
      jc = natsClient.jc;
      orderCreatedHandler = createOrderCreatedHandler({ js, jc, inventoryService, logger});
      orderCancelledHandler = createOrderCancelledHandler({ js, jc, inventoryService, logger});

      if (typeof nc.jetstreamManager !== 'function') {
         throw new Error('JetStream not supported by server/client');
      }
      const jsm = await nc.jetstreamManager();

      // check that stream to consume exists
      try {
         await jsm.streams.info(ORDERS_STREAM);
         logger.info('Stream found,', { stream: ORDERS_STREAM });
      } catch (_) {
         throw new Error(`Stream ${ORDERS_STREAM} does not exist`);
      }

      // check that stream to publish exists. Create it if not exists
      try {
         await jsm.streams.info(INVENTORY_STREAM);
         logger.info('Stream found', { stream: INVENTORY_STREAM });
      } catch (_) {
         await jsm.streams.add({
            name: INVENTORY_STREAM,
            subjects: ['inventory.>'],
            storage: 'memory',
            retention: 'limits',
         });
         logger.info('Stream created', { stream: INVENTORY_STREAM });
      }
      
      // consume on ORDERS stream
      try {
         await jsm.consumers.info(ORDERS_STREAM, CONSUMER_NAME);
         logger.info('Consumer already exists', { consumer: CONSUMER_NAME });
      } catch (_) {
         await jsm.consumers.add(ORDERS_STREAM, {
            durable_name: CONSUMER_NAME,
            filter_subject: 'order.*',
            ack_policy: 'explicit',
            deliver_policy: 'all',
            ack_wait: 30 * 1e9,
            max_deliver: MAX_RETRIES,
         });
         logger.info('Consumer created', { consumer: CONSUMER_NAME });
      }

      const consumer = await js.consumers.get(ORDERS_STREAM, CONSUMER_NAME);
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
            const result = await handleMessage(msg);
            natsMessagesProcessedTotal.inc({ subject: msg.subject, result: result ?? 'ack' });
         } catch (err) {
            logger.error('Fatal message handling error', {
               error: err.message,
               seq: msg.seq,
            });

            msg.nak(getBackoffMs((msg.info.redeliveryCount ?? 0) + 1));
            natsMessagesProcessedTotal.inc({ subject: msg.subject, result: 'nak' });
         }
      });
   }

   // -------------------------
   // CORE LOGIC
   // -------------------------
   async function handleMessage(msg) {
      const payload = jc.decode(msg.data);

      natsMessagesReceivedTotal.inc({ subject: msg.subject });
      const startMs = Date.now();

      let res;
      switch (msg.subject) {
         case 'order.created':
            res = await orderCreatedHandler.handle(msg, payload);
            break;
         case 'order.cancelled':
            res = await orderCancelledHandler.handle(msg, payload);
            break;
         default:
            logger.warn('Unknown subject, discarding', { subject: msg.subject });
            msg.ack();
            res = 'ack'
      }

      const durationSeconds = (Date.now() - startMs) / 1000;
      natsMessageProcessingDuration.observe({ subject: msg.subject }, durationSeconds);
      
      return res;
   }

   return { start };
}

module.exports = createOrderConsumer;
