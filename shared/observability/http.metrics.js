const client = require('prom-client');

function createHttpMetrics({ register }) {

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

   return {
      httpRequests,
      httpRequestDuration
   };
}

module.exports = createHttpMetrics;