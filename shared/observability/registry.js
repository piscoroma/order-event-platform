const client = require('prom-client');

function createRegistry(serviceName) {
   const register = new client.Registry();
   client.collectDefaultMetrics({ register, labels: { service: serviceName } });
   return register;
}

module.exports = createRegistry;