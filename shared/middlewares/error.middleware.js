const errorHandler = ({ logger }) => (err, req, res, next) => {
   const statusCode = err.statusCode ?? 500
   const message = statusCode === 500 ? 'Internal Server Error' : err.message;

   if (statusCode === 500) {
      logger.error(err.stack);
   } else {
      logger.warn(err.message, { name: err.name });
   }

   res.status(statusCode).json({error: message});

};

module.exports = errorHandler;
