const fs = require('fs')

function loadConfig() {
   return {
      serviceName: process.env.SERVICE_NAME,
      server: {
         port: process.env.SERVER_PORT || 3011,
         shutdownTimeoutMs: process.env.SHUTDOWN_TIMEOUT || 25000
      },
      mongo: {
         uri: process.env.MONGO_URI || 'mongodb://user:pass@localhost:27017/?authSource=admin',
         dbName: process.env.MONGO_DB_NAME
      },
      logger: {
         serviceName: process.env.SERVICE_NAME,
         level: process.env.LOG_LEVEL || 'info'
      },
      jwt: {
         privateKey: fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH || './certs/private.pem', 'utf8'),
         publicKey: fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH || './certs/public.pem', 'utf8'),
         expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      },      
      refreshToken: {
         expiresInDays: process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7
      },
   };
}

module.exports = { loadConfig };
