const createNatsClient = require('@order-event-platform/shared/messaging/nats');
const createOrderConsumer = require('../src/messaging/order.consumer');
const { startNatsContainer } = require('./utils/nats_testcontainer');
const { mockLogger } = require('./utils/mock_logger');
const { waitFor } = require('./utils/wait_for');

describe('orderConsumer (integration)', () => {
   let container, url, natsClient, inventoryService, natsMetrics, consumer;

   beforeAll(async () => {
      ({ container, url } = await startNatsContainer());
      natsClient = createNatsClient({ logger: mockLogger, configNats: { natsUrl: url } });
      await natsClient.connect();

      // ORDERS deve esistere PRIMA di consumer.start(), altrimenti lancia
      await natsClient.getJsm().streams.add({
         name: 'ORDERS',
         subjects: ['order.*'],
      });
   }, 30000);

   afterAll(async () => {
      await natsClient.close();
      await container.stop();
   });

   beforeEach(async () => {
      jest.clearAllMocks();

      inventoryService = {
         isProcessed: jest.fn().mockResolvedValue(false),
         markProcessing: jest.fn().mockResolvedValue(),
         reserveItems: jest.fn().mockResolvedValue({ reservationId: 'r1' }),
         markDone: jest.fn().mockResolvedValue(),
         markFailed: jest.fn().mockResolvedValue(),
         resetProcessing: jest.fn().mockResolvedValue(),
         getStatus: jest.fn(),
         releaseItems: jest.fn().mockResolvedValue(),
         markCancelled: jest.fn().mockResolvedValue(),
      };

      natsMetrics = {
         natsMessagesReceivedTotal: { inc: jest.fn() },
         natsMessagesProcessedTotal: { inc: jest.fn() },
         natsMessageProcessingDuration: { observe: jest.fn() },
      };

      consumer = createOrderConsumer(
         { natsClient, inventoryService, logger: mockLogger, natsMetrics }
      );
      await consumer.start();
   }, 15000);

   afterEach(async () => {
      await consumer.stop();
      const jsm = natsClient.getJsm();
      try { await jsm.consumers.delete('ORDERS', 'inventory-service'); } catch { /* consumer already missing, ignore it */}
      try { await jsm.streams.purge('ORDERS'); } catch { { /* stream already missing, ignore it */}}
      try { await jsm.streams.purge('INVENTORY'); } catch { { /* stream already missing, ignore it */}}
   });

   test('order.created valid: reserve item and publish on inventory.reserver', async () => {
      await natsClient.getJs().publish(
         'order.created',
         JSON.stringify({ orderId: 'ord-1', items: [{ sku: 'A', qty: 2 }] })
      );

      await waitFor(() => inventoryService.markDone.mock.calls.length > 0);

      expect(inventoryService.reserveItems).toHaveBeenCalledWith([{ sku: 'A', qty: 2 }]);
      expect(inventoryService.markDone).toHaveBeenCalledWith('ord-1');
   });

   test('order.created with an invalid payload: publish on inventory.reservation.failed without calling inventoryService', async () => {
      const jsm = natsClient.getJsm();
      const consumerInfo = await jsm.consumers.add('INVENTORY', {
         durable_name: 'test-watcher-invalid',
         filter_subject: 'inventory.reservation.failed',
         ack_policy: 'explicit',
      });
      const watcher = await natsClient.getJs().consumers.get(
         'INVENTORY', 'test-watcher-invalid'
      );

      await natsClient.getJs().publish(
         'order.created',
         JSON.stringify({ orderId: 'ord-2', items: [] }) // empty items -> invalid
      );

      const msgs = await watcher.fetch({ max_messages: 1, expires: 3000 });
      let received = null;
      for await (const m of msgs) {
         received = m.json();
         m.ack();
      }

      expect(received).toMatchObject({ reason: 'Invalid Payload' });
      expect(inventoryService.reserveItems).not.toHaveBeenCalled();
   });

   test('order.cancelled with status "done": release items and publish on inventory.released', async () => {
      inventoryService.getStatus.mockResolvedValue('done');

      await natsClient.getJs().publish(
         'order.cancelled',
         JSON.stringify({ orderId: 'ord-3', items: [{ sku: 'B', qty: 1 }] })
      );

      await waitFor(() => inventoryService.markCancelled.mock.calls.length > 0);

      expect(inventoryService.releaseItems).toHaveBeenCalledWith([{ sku: 'B', qty: 1 }]);
      expect(inventoryService.markCancelled).toHaveBeenCalledWith('ord-3');
   });

   test('order.created with non-retryable error: missing nak, mark as failed', async () => {
      inventoryService.reserveItems.mockRejectedValue(new Error('business rule violated'));

      await natsClient.getJs().publish(
         'order.created',
         JSON.stringify({ orderId: 'ord-4', items: [{ sku: 'C', qty: 1 }] })
      );

      await waitFor(() => inventoryService.markFailed.mock.calls.length > 0);

      expect(inventoryService.markFailed).toHaveBeenCalledWith('ord-4');
   });
});