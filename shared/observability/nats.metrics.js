const client = require('prom-client');

function createNatsMetrics({ register }) {

   const natsMessagesReceivedTotal = new client.Counter({
      name: 'nats_messages_received_total',
      help: 'Total NATS messages received',
      labelNames: ['subject'],
      registers: [register],
   });

   const natsMessagesProcessedTotal = new client.Counter({
      name: 'nats_messages_processed_total',
      help: 'Total NATS messages processed',
      labelNames: ['subject', 'result'], // ack | nak
      registers: [register],
   });

   const natsMessageProcessingDuration = new client.Histogram({
      name: 'nats_message_processing_duration_seconds',
      help: 'NATS message processing duration',
      labelNames: ['subject'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register],
   });

   return {
      natsMessagesReceivedTotal,
      natsMessagesProcessedTotal,
      natsMessageProcessingDuration
   };
}

module.exports = createNatsMetrics;