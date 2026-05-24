const express = require('express');

function createSystemRoutes({ systemController }) {

   const router = express.Router();

   router.get('/healthz', systemController.health);
   router.get('/readyz', systemController.ready);
   router.get('/metrics', systemController.getMetrics);

   return router;
}

module.exports = createSystemRoutes;
