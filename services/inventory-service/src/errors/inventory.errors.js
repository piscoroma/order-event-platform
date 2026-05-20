class InsufficientStockError extends Error {
   constructor(itemName, requested, available) {
      super(`Insufficient stock for "${itemName}": requested ${requested}, available ${available}`);
      this.name = 'InsufficientStockError';
      this.statusCode = 422;
      this.retryable = false;
   }
}

class AlreadyProcessingError extends Error {
   constructor(orderId) {
      super(`Order ${orderId} is already being processed`);
      this.name = 'AlreadyProcessingError';
      this.retryable = false;
   }
}

module.exports = {
   InsufficientStockError,
   AlreadyProcessingError
};