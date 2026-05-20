const client = require('prom-client');

function createMetrics(serviceName) {

   const register = new client.Registry();
   client.collectDefaultMetrics({ 
      register, 
      labels: { service: serviceName } 
   });

   // --- HTTP ---
   const httpRequests = new client.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [register],
   });

   const httpRequestDuration = new client.Histogram({
   name: 'http_request_duration_seconds',
   help: 'Duration of HTTP requests in seconds',
   labelNames: ['method', 'route', 'status'],
   buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
   registers: [register],
   });

   // --- NATS ---
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
      register,
      httpRequests,
      httpRequestDuration,
      natsMessagesReceivedTotal,
      natsMessagesProcessedTotal,
      natsMessageProcessingDuration,
   };
}

module.exports = createMetrics;