const { createContainer, asValue, asFunction, InjectionMode } = require('awilix');

const createLogger = require('@order-event-platform/shared/observability/logger');
const createMetrics = require('@order-event-platform/shared/observability/metrics');
const createMongoClient = require('@order-event-platform/shared/db/mongo.client');
const createNatsClient = require('@order-event-platform/shared/messaging/nats');
const createRequestContextMw = require('@order-event-platform/shared/middlewares/requestContext.middleware')
const createErrorHandlerMw = require('@order-event-platform/shared/middlewares/error.middleware')
const createRequestLoggerMw = require('@order-event-platform/shared/middlewares/requestLogger.middleware')

const { loadConfig } = require('./config/config');
const createInventoryMetrics = require('./observability/inventory.metrics')
const createInventoryService = require('./services/inventory.service');
const createInventoryController = require('./controllers/inventory.controller');
const createSystemController = require('./controllers/system.controller');
const createInventoryRoutes = require('./routes/inventory.routes');
const createSystemRoutes = require('./routes/system.routes');
const createOrderConsumer = require('./messaging/order.consumer');

const container = createContainer({
   injectionMode: InjectionMode.PROXY
});

const config = loadConfig();
const metrics = createMetrics('inventory-service');

container.register({
   // config
   configServer: asValue(config.server),
   configMongo: asValue(config.mongo),
   configNats: asValue(config.nats),
   configLog: asValue(config.logger),

   // logger
   logger: asFunction(createLogger).singleton(),

   // metrics
   metrics: asValue(metrics),
   inventoryMetrics: asFunction(createInventoryMetrics).singleton(),

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