const mongoose = require('mongoose');
const Item = require('../models/item.model');
const OrderProcessingState = require('../models/order-processing-state.model');
const { NotFoundError, InsufficientStockError, ValidationError, AlreadyProcessingError } = require('../errors/inventory.errors');
const {
   inventoryReservationsTotal,
   inventoryReleasesTotal,
} = require('../observability/metrics');

function createInventoryService({ logger }) {

   async function listItems() {
      return Item.find();
   }

   async function getItem(id) {
      const item = await Item.findById(id);
      if (!item) throw new NotFoundError('Item', id);
      return item;
   }

   async function reserveItems(items) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         let totalAmount = 0;
         const reserved = [];

         for (const { itemId, quantity } of items) {
            if (!itemId || quantity < 1) {
               throw new ValidationError(`Invalid item entry: ${itemId}`);
            }

            const item = await Item.findById(itemId).session(session);
            if (!item) throw new NotFoundError('Item', itemId);
            if (item.stock < quantity) {
               throw new InsufficientStockError(item.name, quantity, item.stock);
            }

            item.stock -= quantity;
            await item.save({ session });

            stockGauge.set({ item_id: item._id, item_name: item.name }, item.stock);

            totalAmount += item.price * quantity;
            reserved.push({ itemId, name: item.name, quantity, unitPrice: item.price });
         }

         await session.commitTransaction();
         inventoryReservationsTotal.inc({ status: 'success', reason: '' });

         logger.info('Stock reserved', { items: reserved, totalAmount });

         return { reserved, totalAmount: Math.round(totalAmount * 100) / 100 };

      } catch (err) {
         await session.abortTransaction();
         logger.warn('Reservation failed', { error: err.message });
         inventoryReservationsTotal.inc({ status: 'failed', reason: err.name });
         throw err;
      } finally {
         session.endSession();
      }
   }

   async function releaseItems(items) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try{
         for (const { itemId, quantity } of items) {
            if (!itemId || quantity < 1) {
               throw new ValidationError(`Invalid item entry: ${itemId}`);
            }

            const item = await Item.findById(itemId).session(session);
            if (!item) throw new NotFoundError('Item', itemId);
            
            item.stock += quantity;
            await item.save({ session });

            inventoryReleasesTotal.inc({ status: 'success', reason: '' });
         }

         await session.commitTransaction();

         logger.info('Inventory released');

      } catch (err) {
         await session.abortTransaction();
         logger.warn('Inventory release failed', { error: err.message });
         inventoryReleasesTotal.inc({ status: 'failed', reason: err.name });
         throw err;
      } finally {
         session.endSession();
      }
   }

   // aggiorna stock manualmente (utile per test)
   async function updateItemStock(id, stock) {
      const item = await Item.findByIdAndUpdate(id, { stock }, { new: true });
      if (!item) throw new NotFoundError('Item', id);
      stockGauge.set({ item_id: item._id, item_name: item.name }, item.stock);
      logger.info('Stock updated', { itemId: item._id, newStock: item.stock });
      return item;
   }

   // -------------------------
   // IDEMPOTENCY
   // -------------------------
   async function isProcessed(orderId) {
      const record = await OrderProcessingState.findOne({ orderId });
      return record?.status === 'done' || record?.status === 'failed' || record?.status === 'cancelled';
   }

   async function markProcessing(orderId) {
      try {
         await OrderProcessingState.create({ orderId, status: 'processing' });
         logger.debug('Order marked as processing', { orderId });
      } catch (err) {
         if (err.code === 11000) {
            // duplicate key — another pod has already taken this order
            throw new AlreadyProcessingError(orderId);
         }
         throw err;
      }
   }

   async function markDone(orderId) {
      await OrderProcessingState.findOneAndUpdate(
         { orderId },
         { status: 'done' }
      );
      logger.debug('Order marked as done', { orderId });
   }

   async function markFailed(orderId) {
      await OrderProcessingState.findOneAndUpdate(
         { orderId },
         { status: 'failed' }
      );
      logger.debug('Order marked as failed', { orderId });
   }

   async function markCancelled(orderId) {
      await OrderProcessingState.findOneAndUpdate(
         { orderId },
         { status: 'cancelled' }
      );
      logger.debug('Order marked as cancelled', { orderId });
   }

   async function resetProcessing(orderId) {
      await OrderProcessingState.deleteOne({ orderId });
   }

   async function getStatus(orderId) {
      const record = await OrderProcessingState.findOne({ orderId });
      return record.status
   }

   return {
      listItems,
      getItem,
      reserveItems,
      releaseItems,
      updateItemStock,
      isProcessed,
      markProcessing,
      markDone,
      markCancelled,
      markFailed,
      resetProcessing,
      getStatus
   };

}

module.exports = createInventoryService;
