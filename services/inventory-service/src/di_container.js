const { createContainer, asValue, asFunction, InjectionMode } = require('awilix');
const { loadConfig } = require('./config/config');

const createLogger = require('./observability/logger');
const createRequestContextMw = require('./middlewares/requestContext.middleware')
const createErrorHandlerMw = require('./middlewares/error.middleware')
const createRequestLoggerMw = require('./middlewares/requestLogger.middleware')
const createMongoClient = require('./db/mongo.client');
const createInventoryService = require('./services/inventory.service');
const createInventoryController = require('./controllers/inventory.controller');
const createSystemController = require('./controllers/system.controller');
const createInventoryRoutes = require('./routes/inventory.routes');
const createSystemRoutes = require('./routes/system.routes');
const createNatsClient = require('./messaging/nats');
const createOrderConsumer = require('./messaging/order.consumer');

const container = createContainer({
   injectionMode: InjectionMode.PROXY
});

const config = loadConfig();

container.register({
   // config
   configServer: asValue(config.server),
   configMongo: asValue(config.mongo),
   configNats: asValue(config.nats),
   configLog: asValue(config.logger),

   // logger
   logger: asFunction(createLogger).singleton(),

   // middlewares
   requestContextMw: asFunction(createRequestContextMw).singleton(),
   errorHandlerMw: asFunction(createErrorHandlerMw).singleton(),
   requestLoggerMw: asFunction(createRequestLoggerMw).singleton(),

   // db
   mongoClient: asFunction(createMongoClient).singleton(),

    // messaging
   natsClient: asFunction(createNatsClient).singleton(),
   orderConsumer: asFunction(createOrderConsumer).singleton(),

   // service
   inventoryService: asFunction(createInventoryService).singleton(),

   // controller
   inventoryController: asFunction(createInventoryController).singleton(),
   systemController: asFunction(createSystemController).singleton(),

   // routes
   inventoryRoutes: asFunction(createInventoryRoutes).singleton(),
   systemRoutes: asFunction(createSystemRoutes).singleton()

});

module.exports = container;