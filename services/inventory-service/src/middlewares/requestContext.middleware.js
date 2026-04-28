const { runWithContext } = require('../observability/context_storage');
const { randomUUID } = require('crypto');

function createRequestContextMiddleware({ baseLogger }) {
   return (req, res, next) => {
      const requestId = req.headers['x-request-id'] || randomUUID();

      const childLogger = baseLogger.child({
         requestId
      });

      const context = {
         requestId,
         logger: childLogger
      };

      runWithContext(context, () => {
         res.setHeader('x-request-id', requestId);
         next();
      });
   };
}

module.exports = createRequestContextMiddleware;
