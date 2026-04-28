const { createContainer, asValue, asFunction, InjectionMode } = require('awilix');
const { loadConfig } = require('./config/config');

const createLogger = require('./observability/logger');
const createLoggerAccessor = require('./observability/logger_accessor');
const createRequestContextMw = require('./middlewares/requestContext.middleware')
const createErrorHandlerMw = require('./middlewares/error.middleware')
const createRequestLoggerMw = require('./middlewares/requestLogger.middleware')
const createMongoClient = require('./db/mongo.client');
const createInventoryService = require('./services/inventory.service');
const createInventoryController = require('./controllers/inventory.controller');
const createInventoryRoutes = require('./routes/inventory.routes');
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
   baseLogger: asFunction(createLogger).singleton(),
   logger: asFunction(createLoggerAccessor).singleton(),

   // middlewares
   requestContextMw: asFunction(createRequestContextMw).singleton(),
   errorHandlerMw: asFunction(createErrorHandlerMw).singleton(),
   requestLoggerMw: asFunction(createRequestLoggerMw).singleton(),

   // db
   mongoClient: asFunction(createMongoClient).singleton(),

   // service
   inventoryService: asFunction(createInventoryService).singleton(),

   // controller
   inventoryController: asFunction(createInventoryController).singleton(),

   // routes
   inventoryRoutes: asFunction(createInventoryRoutes).singleton(),

   // messaging
   natsClient: asFunction(createNatsClient).singleton(),
   orderConsumer: asFunction(createOrderConsumer).singleton()

});

module.exports = container;