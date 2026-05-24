const mongoose = require('mongoose');

function createMongoClient({ logger, configMongo }) {
   const { uri, dbName } = configMongo;
   let isManualDisconnect = false;

   async function connect(maxRetries = 5, delay = 5000) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
         try {
            await mongoose.connect(uri, { 
               dbName,
               serverSelectionTimeoutMS: 10000, // aumenta il timeout
            });
            break;
         } catch (err) {
            logger.error('Mongo connection failed', {
               error: err.message,
               attempt,
               maxRetries,
            });

            if (attempt === maxRetries) {
               logger.error('Mongo connection retries exhausted');
               process.exit(1);
            }

            await new Promise(res => setTimeout(res, delay));
         }
      }
   }

   async function disconnect() {
      isManualDisconnect = true;
      await mongoose.disconnect();
   }

   function registerEvents() {
      mongoose.connection.on('connected', () => {
         logger.info('Mongo connected');
      });

      mongoose.connection.on('disconnected', () => {
         if (isManualDisconnect) {
            logger.info('MongoDB manually disconnected');
            return;
         }
         logger.warn('MongoDB disconnected, retrying...');
         setTimeout(connect, 5000);
      });

      mongoose.connection.on('error', (err) => {
         logger.error('Mongo error', { error: err.message });
      });
   }

   registerEvents();

   return { 
      connect, disconnect 
   };

}

module.exports = createMongoClient;
