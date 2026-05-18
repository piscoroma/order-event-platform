const { httpRequests, httpRequestDuration } = require('../observability/metrics');

function httpMetricsMiddleware(req, res, next) {
   const startMs = Date.now();

   res.on('finish', () => {
      const durationSeconds = (Date.now() - startMs) / 1000;
      const labels = {
         method: req.method,
         route: req.route?.path ?? req.path,
         status: res.statusCode,
      };

      httpRequests.inc(labels);
      httpRequestDuration.observe(labels, durationSeconds);
   });

   next();
}

module.exports = httpMetricsMiddleware;