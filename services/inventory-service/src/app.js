function createApp({ 
   inventoryRoutes, systemRoutes, requestLoggerMw, errorHandlerMw 
}) {
   const express = require('express');
   const app = express();

   const metricsMiddleware = require('./observability/metrics.middleware');
   const requestContextMw = require('./middlewares/requestContext.middleware');
   
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