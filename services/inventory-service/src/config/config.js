function loadConfig() {
   return {
      serviceName: process.env.SERVICE_NAME,
      server: {
         port: process.env.SERVER_PORT || 3010,
         shutdownTimeoutMs: process.env.SHUTDOWN_TIMEOUT || 25000
      },
      mongo: {
         uri: process.env.MONGO_URI || 'mongodb://user:pass@localhost:27017/?authSource=admin',
         dbName: process.env.MONGO_DB_NAME
      },
      nats: {
         natsUrl: process.env.NATS_URL || 'nats://nats.demo.svc.cluster.local:4222'
      },
      logger: {
         serviceName: process.env.SERVICE_NAME,
         level: process.env.LOG_LEVEL || 'info'
      }
   };
}

module.exports = { loadConfig };
