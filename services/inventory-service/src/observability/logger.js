const winston = require('winston');

function createLogger({ configLog }) {
   return winston.createLogger({
      level: configLog.level,
      format: winston.format.combine(
         winston.format.timestamp(),
         winston.format.json()
      ),
      defaultMeta: {
         service: configLog.serviceName
      },
      transports: [new winston.transports.Console()]
   });
}

module.exports = createLogger;
