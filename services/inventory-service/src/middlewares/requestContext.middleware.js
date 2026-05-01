const { runWithContext } = require('../observability/context_storage');
const { randomUUID } = require('crypto');

function requestContextMw() {
   return (req, res, next) => {
      const correlationId = req.headers['x-correlation-id'] || randomUUID();

      runWithContext({ correlationId }, () => {
         res.setHeader('x-correlation-id', correlationId);
         next();
      });
   };
}

module.exports = requestContextMw;
