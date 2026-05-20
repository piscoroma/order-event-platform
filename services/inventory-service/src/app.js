const express = require('express');

const metricsMiddleware = require('@order-event-platform/shared/observability/metrics.middleware');
const requestContextMw = require('@order-event-platform/shared/middlewares/requestContext.middleware');

function createApp({ 
   inventoryRoutes, systemRoutes, requestLoggerMw, errorHandlerMw 
}) {
   const app = express();
   
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