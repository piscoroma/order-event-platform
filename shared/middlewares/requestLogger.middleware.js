const IGNORED_PATHS = new Set([
   '/healthz',
   '/readyz',
   '/metrics'
]);


const requestLogger = ({ logger }) => (req, res, next) => {
   if (IGNORED_PATHS.has(req.path)) {
      return next();
   }

   const start = Date.now();

   logger.info('Incoming request', {
      host: req.hostname,
      method: req.method,
      path: req.path,
      ip: req.ip
   });

   res.on('finish', () => {
      logger.info('Request completed', {
         host: req.hostname,
         method: req.method,
         path: req.path,
         statusCode: res.statusCode,
         responseTimeMs: Date.now() - start
      });
   });

   next();

};

module.exports = requestLogger;