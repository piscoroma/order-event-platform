require('dotenv').config();
const mongoose = require('mongoose');

const container = require('../src/di_container');
const { seedData } = require('../src/db/seed');

const requiredEnv = ['MONGO_URI', 'MONGO_DB_NAME'];

function assertEnv(name) {
   if (!process.env[name]) {
      throw new Error(`Missing required env var: ${name}`);
   }
}

async function main() {
   const mongoClient = container.resolve('mongoClient');
   const logger = container.resolve('logger');
   try {
      requiredEnv.forEach(assertEnv);

      await mongoClient.connect();
      await seedData({ logger });

   } catch (err) {
      logger.error('Seed failed', err);
      process.exitCode = 1;
   } finally {
      await mongoClient.disconnect();
   }
}

main();