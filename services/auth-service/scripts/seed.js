require('dotenv').config();

const container = require('../src/di_container');
const { seedData } = require('../src/db/seed');

async function main() {
   const mongoClient = container.resolve('mongoClient');
   const logger = container.resolve('logger');
   try {
      await mongoClient.connect();
      await seedData({ logger });

   } catch (err) {
      logger.error('Seed failed', {
         error: err.message,
         stack: err.stack
      });
      process.exitCode = 1;
   } finally {
      await mongoClient.disconnect();
   }
}

main();