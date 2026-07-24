const mongoose = require('mongoose');

function createMongoClient({ logger, configMongo }) {
   const { 
      host, port, dbName, replicaSet, username, password 
   } = configMongo;
   let isManualDisconnect = false;
   let hasConnected = false;

   async function connect(maxRetries = 5, delay = 5000) {
      const uri = 
         `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}` +
         `@${host}:${port}/?authSource=${dbName}&replicaSet=${replicaSet}`;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
         try {
            logger.debug(`Try to connect to mongo ${host}:${port}, attempt ${attempt}/${maxRetries}...`);
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
               host,
               port,
               database: dbName,
               replicaSet
            });

            if (attempt === maxRetries) {
               logger.error(`Mongo connection retries exhausted - failed attempts: ${attempt}/${maxRetries}`);
               process.exit(1);
            }

            await new Promise(res => setTimeout(res, delay));
         }
      }
      hasConnected = true;
   }

   async function disconnect() {
      isManualDisconnect = true;
      await mongoose.disconnect();
   }

   function registerEvents() {
      mongoose.connection.on('connected', () => {
         logger.info(`Mongo connected`, {
            host,
            port,
            database: dbName,
            replicaSet
         });
      });

      mongoose.connection.on('disconnected', () => {
         if (isManualDisconnect) {
            logger.info('MongoDB manually disconnected');
            return;
         }
         if (hasConnected) {
            logger.warn('MongoDB disconnected, retrying...');
            setTimeout(connect, 5000);
         }
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
