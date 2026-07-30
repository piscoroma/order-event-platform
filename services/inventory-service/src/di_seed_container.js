const { createContainer, asValue, asFunction, InjectionMode } = require('awilix');

const createLogger = require('@order-event-platform/shared/observability/logger');
const createMongoClient = require('@order-event-platform/shared/db/mongo.client');

const { loadConfig } = require('./config/config');

const container = createContainer({
   injectionMode: InjectionMode.PROXY
});

const config = loadConfig();

container.register({
   // config
   configMongo: asValue(config.mongo),
   configLog: asValue(config.logger),

   // logger
   logger: asFunction(createLogger).singleton(),

   // db
   mongoClient: asFunction(createMongoClient).singleton(),

});

module.exports = container;