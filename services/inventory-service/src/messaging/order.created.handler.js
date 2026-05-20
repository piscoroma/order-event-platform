const { buildHeaders, getBackoffMs } = require('@order-event-platform/shared/messaging/consumer.utils');

const { AlreadyProcessingError } = require('../errors/inventory.errors');

function createOrderCreatedHandler({ js, jc, inventoryService, logger }) {

   async function handle(msg, payload){
      if (!payload?.orderId || !Array.isArray(payload?.items) || payload.items.length === 0) {
         logger.warn('Invalid payload, discarding message', { payload, orderId: payload.orderId });
         await js.publish(
            'inventory.reservation.failed',
            jc.encode({ reason: "Invalid Payload", payload }),
            { headers: buildHeaders() }
         );
         logger.info('Pub on inventory.reservation.failed', {orderId: payload.orderId});
         msg.ack();
         return 'ack';
      }
      
      const orderId = payload.orderId;
      const attempt = (msg.info.deliveryCount ?? 1) 

      logger.info('An event order.created is arrived', {orderId, attempt});
      if (await inventoryService.isProcessed(orderId)) {
         logger.info('Order already processed, skipping message', {orderId});
         msg.ack();
         return 'ack';
      }

      try {
         await inventoryService.markProcessing(orderId);
      } catch (err) {
         if (err instanceof AlreadyProcessingError) {
            logger.info('Order already being processed, skipping message', {orderId});
            msg.ack();
            return 'ack';
         }
         throw err;
      }

      try {
         logger.info('Start processing order', {orderId});
         const result = await inventoryService.reserveItems(payload.items);

         await js.publish(
            'inventory.reserved',
            jc.encode({ orderId, ...result }),
            { headers: buildHeaders() }
         );
         logger.info('Pub on inventory.reserved', {orderId});

         await inventoryService.markDone(orderId);

         msg.ack();
         return 'ack'

      } catch (err) {
         const retryable =
            ['ETIMEDOUT', 'ECONNRESET', 'EPIPE'].includes(err.code) ||
            err.retryable === true;

         logger.info('Order failed', {orderId, retryable});

         if (!retryable) {
            // Business failure
            await js.publish(
               'inventory.reservation.failed',
               jc.encode({ orderId, reason: err.message }),
               { headers: buildHeaders() }
            );
            logger.info('Pub on inventory.reservation.failed', {orderId});
            await inventoryService.markFailed(orderId);
            msg.ack();
            return 'ack'
         }

         // max retry reached, send DLQ
         if (attempt >= MAX_RETRIES) {
            await publishDLQ(msg, payload, err, attempt);
            logger.info('Pub on inventory.dlq', {orderId});
            await inventoryService.markFailed(orderId);
            msg.ack();
            return 'ack';
         }

         // delegate retry to JetStream
         await inventoryService.resetProcessing(orderId);
         msg.nak(getBackoffMs(attempt));
         return 'nak'
      }
   }

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
         { headers: buildHeaders() }
      );
   }

   return { handle };
}

module.exports = { createOrderCreatedHandler }