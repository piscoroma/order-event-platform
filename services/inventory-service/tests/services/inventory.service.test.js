const mongoose = require('mongoose');

const Item = require('../../src/models/item.model');
const createInventoryService = require('../../src/services/inventory.service');
const { NotFoundError, InsufficientStockError, ValidationError, AlreadyProcessingError } = require('../../src/errors/inventory.errors');
const { mockLogger } = require('../utils/mock_logger')

const inventoryService = createInventoryService({ logger: mockLogger });

describe('reserveItems', () => {

   test('update stock after reservation', async () => {
      const item = await Item.create({
         _id: new mongoose.Types.ObjectId(),
         name: 'Widget',
         stock: 10,
         price: 5,
      });

      const result = await inventoryService.reserveItems([
         { itemId: item._id, quantity: 3 }
      ]);

      expect(result.totalAmount).toBe(15);
      expect(result.reserved[0].quantity).toBe(3);

      const updated = await Item.findById(item._id);
      expect(updated.stock).toBe(7); //check directly on mongo
   });

   test('raise InsufficientStockError if stock is not enough', async () => {
      const item = await Item.create({
         _id: new mongoose.Types.ObjectId(),
         name: 'Widget',
         stock: 1,
         price: 5,
      });

      await expect(
         inventoryService.reserveItems([{ itemId: item._id, quantity: 5 }])
      ).rejects.toThrow(InsufficientStockError);

      const unchanged = await Item.findById(item._id);
      expect(unchanged.stock).toBe(1); // verify that rollback worked
   });

   test('raise ValidationError if quantity is < 1', async () => {
      const item = await Item.create({
         _id: new mongoose.Types.ObjectId(),
         name: 'Widget',
         stock: 1,
         price: 5,
      });

      await expect(
         inventoryService.reserveItems([{ itemId: item._id, quantity: -1 }])
      ).rejects.toThrow(ValidationError);

      const unchanged = await Item.findById(item._id);
      expect(unchanged.stock).toBe(1); // verify that rollback worked
   });

   test('raise ValidationError if itemId is not passed', async () => {
      const item = await Item.create({
         _id: new mongoose.Types.ObjectId(),
         name: 'Widget',
         stock: 1,
         price: 5,
      });

      await expect(
         inventoryService.reserveItems([{ quantity: 5 }])
      ).rejects.toThrow(ValidationError);

      const unchanged = await Item.findById(item._id);
      expect(unchanged.stock).toBe(1); // verify that rollback worked
   });

   test('raise NotFoundError if item is not found', async () => {
      const item = await Item.create({
         _id: new mongoose.Types.ObjectId(),
         name: 'Widget',
         stock: 1,
         price: 5,
      });

      const fakeItemId = item._id + "_fake"
      await expect(
         inventoryService.reserveItems([{ itemId: fakeItemId, quantity: 5 }])
      ).rejects.toThrow(NotFoundError);

      const unchanged = await Item.findById(item._id);
      expect(unchanged.stock).toBe(1); // verify that rollback worked
   });

});

describe('isProcessed / markDone', () => {

   test('return false if order does not exist', async () => {
      expect(await inventoryService.isProcessed('order-999')).toBe(false);
   });

   test('return true after markDone', async () => {
      await inventoryService.markProcessing('order-1');
      expect(await inventoryService.isProcessed('order-1')).toBe(false);

      await inventoryService.markDone('order-1');
      expect(await inventoryService.isProcessed('order-1')).toBe(true);
   });

   test('return AlreadyProcessingError after call markProcessing twice', async () => {
      await inventoryService.markProcessing('order-1');
      await expect(
         inventoryService.markProcessing('order-1')
      ).rejects.toThrow(AlreadyProcessingError);
   });

});