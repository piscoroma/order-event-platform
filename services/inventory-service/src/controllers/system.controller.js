const mongoose = require('mongoose');
const metrics = require('../observability/metrics');

function createSystemController({ natsClient }) {

   function health(req, res) {
      res.json({ status: 'ok' });
   };

   function ready(req, res) {
      const dbState = mongoose.connection.readyState;
      if (dbState !== 1) {
         return res.status(503).json({ status: 'degraded', db: 'disconnected' });
      }

      if (!natsClient.isConnected()) {
         return res.status(503).json({ status: 'degraded', nats: 'disconnected' });
      }

      return res.json({ status: 'ok', db: 'connected', nats: 'connected' });
   };

   async function getMetrics(req, res) {
      res.set('Content-Type', metrics.register.contentType);
      res.end(await metrics.register.metrics());
   };

   return { 
      health, 
      ready, 
      getMetrics
   };

}

module.exports = createSystemController;