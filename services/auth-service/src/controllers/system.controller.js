const mongoose = require('mongoose');

function createSystemController({ register }) {

   function health(req, res) {
      res.json({ status: 'ok' });
   };

   function ready(req, res) {
      const dbState = mongoose.connection.readyState;
      if (dbState !== 1) {
         return res.status(503).json({ status: 'degraded', db: 'disconnected' });
      }

      return res.json({ status: 'ok', db: 'connected' });
   };

   async function getMetrics(req, res) {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
   };

   return { 
      health, 
      ready, 
      getMetrics
   };

}

module.exports = createSystemController;