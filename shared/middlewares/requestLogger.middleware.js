const requestLogger = ({ logger }) => (req, res, next) => {
   logger.info(`${req.hostname} ${req.method} ${req.path}`);
   const currentTime = Date.now();
   const originalSend = res.send;
   
   res.send = function (body) {
      const responseTime = Date.now() - currentTime;
      logger.info(`${req.hostname} ${req.method} ${res.statusCode} ${responseTime}ms`);
      originalSend.call(this, body);
   };

  next();
};

module.exports = requestLogger;