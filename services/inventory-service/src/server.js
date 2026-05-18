require('dotenv').config();

const createApp = require('./app');
const container = require('./di_container');

async function start() {
   const logger = container.resolve('logger');
   const mongoClient = container.resolve('mongoClient');
   const natsClient = container.resolve('natsClient');
   const orderConsumer = container.resolve('orderConsumer');
   const configServer = container.resolve('configServer');

   const PORT = configServer.port;
   const SHUTDOWN_TIMEOUT = configServer.shutdownTimeoutMs

   let server = null;
   let isShuttingDown = false;

   try {
      await mongoClient.connect();
      await natsClient.connect();

      await natsClient.ensureStream(
         'ORDERS',
         ['order.created', 'order.confirmed', 'order.failed']
      );

      orderConsumer.start().catch((err) => {
         logger.error('Order consumer crashed', { error: err.message });
         process.exit(1);
      });

      const app = createApp({ 
         inventoryRoutes: container.resolve('inventoryRoutes'),
         systemRoutes: container.resolve('systemRoutes'),
         requestLoggerMw: container.resolve('requestLoggerMw'),
         errorHandlerMw: container.resolve('errorHandlerMw'),
      });

      server = app.listen(PORT, () => {
         logger.info(`Inventory service running on ${PORT}`);
      });

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);

   } catch (err) {
      logger.error('Startup failed', { error: err.message });
      process.exit(1);
   }

   async function shutdown(signal) {
      if (isShuttingDown) 
         return;
      isShuttingDown = true;
      logger.info(`Received ${signal}, shutting down...`);
      
      // Timeout totale di sicurezza
      const forceExit = setTimeout(() => {
         logger.error('Shutdown timeout exceeded, forcing exit');
         process.exit(1);
      }, SHUTDOWN_TIMEOUT);

      forceExit.unref(); // non blocca il processo se tutto va bene

      try {
         // Stop HTTP - no nuove richieste
         await shutdownComponent(
            'HTTP server', 
            () => new Promise((resolve, reject) => {
               server.close((err) => err ? reject(err) : resolve());
            }), 
            logger
         );

         // Stop consumer - no nuovi messaggi
         await shutdownComponent(
            'Order consumer', 
            () => orderConsumer.stop?.(), 
            logger
         );

         //NATS e Mongo in parallelo - non dipendono l'uno dall'altro
         await Promise.allSettled([
            shutdownComponent(
               'NATS', () => natsClient.close(), logger
            ),
            shutdownComponent(
               'MongoDB', () => mongoClient.disconnect(), logger
            ),
         ]);

         clearTimeout(forceExit);
         process.exit(0);

      } catch (err) {
         logger.error('Shutdown error', { error: err.message });
         process.exit(1);
      }
   }
}

async function shutdownComponent(name, fn, logger) {
   try {
      await fn();
      logger.info(`${name} closed`);
   } catch (err) {
      logger.error(`${name} failed to close`, { error: err.message });
   }
}

start();
