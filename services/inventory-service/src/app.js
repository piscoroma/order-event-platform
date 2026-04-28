function createApp({ 
   inventoryRoutes, requestContextMw,
   requestLoggerMw, errorHandlerMw 
}) {
   const express = require('express');
   const app = express();

   const systemRoutes = require('./routes/system.routes');
   const metricsMiddleware = require('./observability/metrics.middleware');
   
   app.use(express.json());
   app.use(metricsMiddleware);
   app.use(requestContextMw);
   app.use(requestLoggerMw);

   app.use('/inventory', inventoryRoutes);
   app.use('/', systemRoutes);

   app.use(errorHandlerMw);

   return app;
}

module.exports = createApp;