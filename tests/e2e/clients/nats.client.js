const createNatsClient = require('@order-event-platform/shared/messaging/nats');

const natsClient = createNatsClient({
   configNats: {
      natsUrl: process.env.NATS_URL
   }
});

module.exports = natsClient;