const fs = require("fs");
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

beforeAll(async () => {
   const options = {
      replSet: { count: 1 },
      instanceOpts: [
         {
            storageEngine: 'wiredTiger', // needed to use the transactions
         },
      ]
   }
   if (fs.existsSync("/usr/bin/mongod")) {
      options.binary = {
         systemBinary: "/usr/bin/mongod",
         version: "4.4.29",
      };
   }
   mongod = await MongoMemoryReplSet.create(options);
   await mongod.waitUntilRunning();
   await mongoose.connect(mongod.getUri(), { retryWrites: false });
});

afterAll(async () => {
   await mongoose.disconnect();
   await mongod.stop();
});

afterEach(async () => {
   // pulisce tutte le collection tra un test e l'altro
   const collections = mongoose.connection.collections;
   for (const key in collections) {
      await collections[key].deleteMany({});
   }
});