const mongoose = require('mongoose');

const errorHandler = ({ logger }) => (err, req, res, next) => {
   
   if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: err.message })
   }

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
