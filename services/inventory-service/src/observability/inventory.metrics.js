const client = require('prom-client');

function createInventoryMetrics({ register }) {

   const inventoryReservationsTotal = new client.Counter({
      name: 'inventory_reservations_total',
      help: 'Total inventory reservations',
      labelNames: ['status', 'reason'], // success | failed + reason
      registers: [register],
   });

   const inventoryReleasesTotal = new client.Counter({
      name: 'inventory_releases_total',
      help: 'Total inventory releases',
      labelNames: ['status', 'reason'], // success | failed + reason
      registers: [register],
   });

   return {
      inventoryReservationsTotal,
      inventoryReleasesTotal
   }

}

module.exports = createInventoryMetrics;
