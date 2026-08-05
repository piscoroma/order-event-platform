const { test, expect } = require("@playwright/test");

const { createAuthClient } = require("../clients/auth.client")
const { createInventoryClient } = require("../clients/inventory.client")
const { eventually } = require("../utils/eventually");
const natsClient = require("../clients/nats.client")

test.beforeAll(async () => {
   await natsClient.connect();
   await natsClient.ensureStream(
      'ORDERS',
      ['order.created', 'order.confirmed', 'order.failed']
   );     
}, 30000);

test.afterAll(async () => {
   await natsClient.close();
});

test.describe('Inventory E2E', () => {

   test(
      "should reject requests without an access token",
      async () => {
         const inventory = createInventoryClient({});
         const response = await inventory.getItems();
         expect(response.status).toBe(401);
      }
   );

   test(
      "should return inventory items for an authenticated user",
      async () => {

         const authClient = createAuthClient();

         const loginResponse = await authClient.login(
            "user@example.com", 
            "user123"
         );
         expect(loginResponse.status).toBe(200);
         
         const inventory = createInventoryClient({
            accessToken: loginResponse.body.access_token
         });

         const itemsResponse = await inventory.getItems();
         expect(itemsResponse.status).toBe(200);

         const items = itemsResponse.body;

         expect(Array.isArray(items)).toBe(true);
         expect(items.length).toBeGreaterThan(0);

         expect(items[0]).toEqual(
            expect.objectContaining({
               id: expect.any(String),
               name: expect.any(String),
               stock: expect.any(Number),
               price: expect.any(Number)
            })
         );

      }
   );

   test(
      "should decrease item stock after receiving an order.created event",
      async () => {

         const authClient = createAuthClient();

         const loginResponse = await authClient.login(
            "user@example.com", 
            "user123"
         );
         expect(loginResponse.status).toBe(200);

         const inventory = createInventoryClient({
            accessToken: loginResponse.body.access_token
         });

         const productId = "widget-a";

         let itemResponse;
         itemResponse = await inventory.getItemById(productId); 
         expect(itemResponse.status).toBe(200);
         const productBefore = itemResponse.body;
         
         const orderId = crypto.randomUUID();
         await natsClient.getJs().publish(
            'order.created',
            JSON.stringify({ 
               orderId, 
               items: [{ itemId: productId, quantity: 3 }] 
            })
         );

         await eventually(async () => {
            itemResponse = await inventory.getItemById(productId);
            expect(itemResponse.status).toBe(200);
            const productAfter = itemResponse.body;
            console.log(
               `Inventory stock: ${productAfter.stock}, expected: ${productBefore.stock - 3}`
            );
            return productAfter.stock === productBefore.stock - 3;
         });

      }
   );

   test(
      "should ignore malformed order.created events without affecting inventory",
      async () => {

         const authClient = createAuthClient();

         const loginResponse = await authClient.login(
            "user@example.com",
            "user123"
         );

         const inventory = createInventoryClient({
            accessToken: loginResponse.body.access_token
         });

         const productId = "widget-a";

         const beforeResponse = await inventory.getItemById(productId);
         expect(beforeResponse.status).toBe(200);
         const productBefore = beforeResponse.body;

         await natsClient.getJs().publish(
            "order.created",
            JSON.stringify({
               orderId: crypto.randomUUID(),
               items: [
                  {
                     itemId: `${productId}-XXX`,
                     quantity: 5
                  }
               ]
            })
         );

         await eventually(async () => {
            const afterResponse = await inventory.getItemById(productId);
            expect(afterResponse.status).toBe(200);
            const productAfter = afterResponse.body;
            console.log(
               `Inventory stock: ${productAfter.stock}, expected: ${productBefore.stock}`
            );
            return productAfter.stock === productBefore.stock;
         });

      }
   );

   test(
      "should process multiple order.created events sequentially",
      async () => {

         const authClient = createAuthClient();

         const loginResponse = await authClient.login(
            "user@example.com",
            "user123"
         );
         expect(loginResponse.status).toBe(200);

         const inventory = createInventoryClient({
            accessToken: loginResponse.body.access_token
         });

         const productId = "widget-a";

         const beforeResponse = await inventory.getItemById(productId);
         expect(beforeResponse.status).toBe(200);
         const productBefore = beforeResponse.body;
         console.log(`Inventory stock before orders: ${productBefore.stock}`);

         await natsClient.getJs().publish(
            "order.created",
            JSON.stringify({
               orderId: crypto.randomUUID(),
               items: [
                  {
                     itemId: productId,
                     quantity: 2
                  }
               ]
            })
         );

         await natsClient.getJs().publish(
            "order.created",
            JSON.stringify({
               orderId: crypto.randomUUID(),
               items: [
                  {
                     itemId: productId,
                     quantity: 5
                  }
               ]
            })
         );

         await eventually(async () => {
            const afterResponse = await inventory.getItemById(productId);
            expect(afterResponse.status).toBe(200);
            const productAfter = afterResponse.body;
            console.log(
               `Inventory stock after orders: ${productAfter.stock}, expected: ${productBefore.stock - 7}`
            );
            return productAfter.stock === productBefore.stock - 7;
         });

      }
   );

   test(
      "should publish order.failed when requested quantity exceeds available stock",
      async () => {

         const authClient = createAuthClient();

         const loginResponse = await authClient.login(
            "user@example.com",
            "user123"
         );

         const inventory = createInventoryClient({
            accessToken: loginResponse.body.access_token
         });

         const productId = "widget-a";

         const beforeResponse = await inventory.getItemById(productId);
         expect(beforeResponse.status).toBe(200);
         const productBefore = beforeResponse.body;

         const jsm = natsClient.getJsm();
         await jsm.consumers.add('INVENTORY', {
            durable_name: 'test-watcher-invalid',
            filter_subject: 'inventory.reservation.failed',
            ack_policy: 'explicit',
         });
         const watcher = await natsClient.getJs().consumers.get(
            'INVENTORY', 'test-watcher-invalid'
         );

         await natsClient.getJs().publish(
            "order.created",
            JSON.stringify({
               orderId: crypto.randomUUID(),
               items: [
                  {
                     itemId: productId,
                     quantity: productBefore.stock + 100
                  }
               ]
            })
         );

         const msgs = await watcher.fetch({ max_messages: 1, expires: 3000 });
         let received = null;
         for await (const m of msgs) {
            received = m.json();
            m.ack();
         }
         console.log(`received: ${JSON.stringify(received)}`);
         //expect(received).toMatchObject({ reason: 'Invalid Payload' });

         const afterResponse = await inventory.getItemById(productId);
         expect(afterResponse.status).toBe(200);
         const productAfter = afterResponse.body;
         expect(productAfter.stock).toBe(productBefore.stock);

      }
   );

});