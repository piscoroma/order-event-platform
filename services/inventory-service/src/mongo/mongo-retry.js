const mongoose = require('mongoose');

function isRetryableMongoError(err) {
   return (
      err?.code === 112 ||
      err?.errorLabels?.includes('TransientTransactionError')
   );
}

async function mongoRetry(
   operation,
   {
      maxRetries = 3,
      delayMs = 20
   } = {}
){

   let attempt = 1;

   while(attempt <= maxRetries){

      try {

         return await operation();

      } catch (err) {

         if(!isRetryableMongoError || attempt === maxRetries){
            throw err;
         }

         attempt += 1;

         await new Promise(resolve =>
            setTimeout(resolve, delayMs * attempt)
         );

      }
   }
}


async function mongoRetryWithTransaction(
   operation,
   {
      maxRetries = 3,
      delayMs = 20
   } = {}
){

   let attempt = 1;

   while(attempt <= maxRetries){

      const session = await mongoose.startSession();

      try {

         session.startTransaction();

         const result = await operation(session);

         await session.commitTransaction();

         return result;

      } catch (err) {
         await session.abortTransaction();

         if(!isRetryableMongoError(err) || attempt === maxRetries){
            throw err;
         }

         attempt += 1;

         await new Promise(resolve =>
            setTimeout(resolve, delayMs * attempt)
         );

      } finally {
         await session.endSession();
      }
   }
}


module.exports = {
   mongoRetry,
   mongoRetryWithTransaction
}
