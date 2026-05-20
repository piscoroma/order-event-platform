const errorHandler = ({ logger }) => (err, req, res, next) => {
   const status = err.statusCode ?? 500;

   if (status === 500) {
      logger.error(err.stack);
   } else {
      logger.warn(err.message, { name: err.name });
   }

   res.status(status).json({
      error: status === 500 ? 'Internal Server Error' : err.message,
   });

};

module.exports = errorHandler;
