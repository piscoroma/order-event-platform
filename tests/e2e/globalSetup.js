const createNatsClient = require("@order-event-platform/shared/messaging/nats");

const { request } = require("@playwright/test");


module.exports = async () => {

   const api = await request.newContext();

   // Auth
   /*let response = await api.get(`${process.env.AUTH_URL}/healthz`);
   if (!response.ok())
      throw new Error("Auth service is not ready");

   // Inventory
   response = await api.get(`${process.env.INVENTORY_URL}/healthz`);
   if (!response.ok())
      throw new Error("Inventory service is not ready");*/

   // NATS
   const nats = createNatsClient({
      configNats: {
         natsUrl: process.env.NATS_URL
      }
   });

   await nats.connect();
   await nats.close();
};