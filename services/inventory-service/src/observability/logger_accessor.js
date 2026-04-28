const { getContext } = require('./context_storage');

function createLoggerAccessor({ baseLogger }) {
   return {
      info: (msg, meta) => {
         const ctx = getContext();
         const logger = ctx?.logger || baseLogger;
         logger.info(msg, meta);
      },
      error: (msg, meta) => {
         const ctx = getContext();
         const logger = ctx?.logger || baseLogger;
         logger.error(msg, meta);
      },
      warn: (msg, meta) => {
         const ctx = getContext();
         const logger = ctx?.logger || baseLogger;
         logger.warn(msg, meta);
      },
      debug: (msg, meta) => {
         const ctx = getContext();
         const logger = ctx?.logger || baseLogger;
         logger.debug(msg, meta);
      }
   };
}

module.exports = createLoggerAccessor;
