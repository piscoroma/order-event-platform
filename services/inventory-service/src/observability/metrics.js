const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

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

const reservationsCounter = new client.Counter({
  name: 'inventory_reservations_total',
  help: 'Total stock reservation attempts',
  labelNames: ['status'],
  registers: [register],
});

const stockGauge = new client.Gauge({
  name: 'inventory_stock_quantity',
  help: 'Current stock quantity per item',
  labelNames: ['item_id', 'item_name'],
  registers: [register],
});


module.exports = {
   register,
   httpRequests,
   httpRequestDuration,
   reservationsCounter,
   stockGauge
};
