const { httpRequests, httpRequestDuration } = require('../observability/metrics');

module.exports = (req, res, next) => {
   const end = httpRequestDuration.startTimer();
   res.on('finish', () => {
      httpRequests.inc({
         method: req.method,
         route: req.route?.path || req.path,
         status: res.statusCode,
      });
      end({ 
         method: req.method, 
         route: req.route?.path || req.path, 
         status: res.statusCode
      });
   });

   next();
};
