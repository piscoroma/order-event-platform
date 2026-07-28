const express = require('express');

const requestContextMw = require('@order-event-platform/shared/middlewares/requestContext.middleware');

function createApp({ 
   inventoryRoutes, systemRoutes, 
   requestLoggerMw, errorHandlerMw, 
   httpMetricsMw, authenticationMw
}) {
   const app = express();
   
   app.use(express.json());
   app.use(httpMetricsMw);
   app.use(requestContextMw);
   app.use(requestLoggerMw);

   app.use('/inventory', authenticationMw, inventoryRoutes);
   app.use('/', systemRoutes);

   app.use(errorHandlerMw);

   return app;
}

module.exports = createApp;