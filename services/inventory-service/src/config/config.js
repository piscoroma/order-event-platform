function loadConfig() {
   return {
      serviceName: process.env.SERVICE_NAME,
      server: {
         port: process.env.SERVER_PORT || 3010,
         shutdownTimeoutMs: process.env.SHUTDOWN_TIMEOUT || 25000
      },
      mongo: {
         host: process.env.MONGO_HOST || 'mongo.demo.svc.cluster.local',
         port: process.env.MONGO_PORT || 27017,
         dbName: process.env.MONGO_DB_NAME,
         replicaSet: process.env.MONGO_REPLICA_SET,
         username: process.env.MONGO_USERNAME,
         password: process.env.MONGO_PASSWORD
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
