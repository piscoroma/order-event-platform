const { createContainer, asValue, asFunction, InjectionMode } = require('awilix');

const createLogger = require('@order-event-platform/shared/observability/logger');
const createRegistry = require('@order-event-platform/shared/observability/registry');
const createHttpMetrics = require('@order-event-platform/shared/observability/http.metrics');
const createMongoClient = require('@order-event-platform/shared/db/mongo.client');
const createRequestContextMw = require('@order-event-platform/shared/middlewares/requestContext.middleware')
const createErrorHandlerMw = require('@order-event-platform/shared/middlewares/error.middleware')
const createRequestLoggerMw = require('@order-event-platform/shared/middlewares/requestLogger.middleware')
const createHttpMetricsMw = require('@order-event-platform/shared/middlewares/metrics.middleware')

const { loadConfig } = require('./config/config');
const createAuthService = require('./services/auth.service');
const createAuthController = require('./controllers/auth.controller');
const createSystemController = require('./controllers/system.controller');
const createAuthRoutes = require('./routes/auth.routes');
const createSystemRoutes = require('./routes/system.routes');

const container = createContainer({
   injectionMode: InjectionMode.PROXY
});

const config = loadConfig();

container.register({
   // config
   config: asValue(config),
   configServer: asValue(config.server),
   configMongo: asValue(config.mongo),
   configLog: asValue(config.logger),

   // registry
   register: asValue(createRegistry(config.serviceName)),

   // logger
   logger: asFunction(createLogger).singleton(),

   // metrics
   httpMetrics: asFunction(createHttpMetrics).singleton(),

   // middlewares
   requestContextMw: asFunction(createRequestContextMw).singleton(),
   errorHandlerMw: asFunction(createErrorHandlerMw).singleton(),
   requestLoggerMw: asFunction(createRequestLoggerMw).singleton(),
   httpMetricsMw: asFunction(createHttpMetricsMw).singleton(),

   // db
   mongoClient: asFunction(createMongoClient).singleton(),

   // service
   authService: asFunction(createAuthService).singleton(),

   // controller
   authController: asFunction(createAuthController).singleton(),
   systemController: asFunction(createSystemController).singleton(),

   // routes
   authRoutes: asFunction(createAuthRoutes).singleton(),
   systemRoutes: asFunction(createSystemRoutes).singleton()

});

module.exports = container;