const winston = require('winston');
const { getContext } = require('./context_storage');

function createLogger({ configLog }) {
   return winston.createLogger({
      level: configLog.level,
      format: winston.format.combine(
         winston.format.timestamp(),
         // context injection
         winston.format((info) => {
            const ctx = getContext();
            if (ctx?.correlationId)
               info.correlationId = ctx.correlationId;
            return info;
         })(),
         winston.format.json()
      ),
      defaultMeta: {
         service: configLog.serviceName
      },
      transports: [new winston.transports.Console()]
   });
}

module.exports = createLogger;
