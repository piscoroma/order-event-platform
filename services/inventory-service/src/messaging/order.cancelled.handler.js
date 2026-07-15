const { buildHeaders } = require('@order-event-platform/shared/messaging/consumer.utils');

function createOrderCancelledHandler({ js, inventoryService, logger }) {

   async function handle(msg, payload){
      const { orderId, items } = payload;

      const status = await inventoryService.getStatus(orderId);

      switch (status) {
         case null: // order does not exists
         case 'failed':
            msg.ack();
            return;

         case 'processing':
            msg.nack(2000);
            return;

         case 'done':
            await inventoryService.releaseItems(items);
            await inventoryService.markCancelled(orderId);
            await js.publish(
               'inventory.released',
               JSON.stringify({ orderId }),
               { headers: buildHeaders() }
            );
            msg.ack();
            return;
      }
   }

   return { handle }
}


module.exports = { createOrderCancelledHandler }