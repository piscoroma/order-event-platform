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
      buckets: [
         0.01,   // 10 ms
         0.025,  // 25 ms
         0.05,   // 50 ms
         0.1,    // 100 ms
         0.2,    // 200 ms
         0.25,   // 250 ms
         0.5,    // 500 ms
         1,      // 1 s
         2       // 2 s
      ],
      registers: [register],
   });

   return {
      httpRequests,
      httpRequestDuration
   };
}

module.exports = createHttpMetrics;