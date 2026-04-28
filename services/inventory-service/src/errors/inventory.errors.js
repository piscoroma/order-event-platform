class NotFoundError extends Error {
   constructor(resource, id) {
      super(`${resource} not found: ${id}`);
      this.name = 'NotFoundError';
      this.statusCode = 404;
      this.retryable = false;
   }
}

class InsufficientStockError extends Error {
   constructor(itemName, requested, available) {
      super(`Insufficient stock for "${itemName}": requested ${requested}, available ${available}`);
      this.name = 'InsufficientStockError';
      this.statusCode = 422;
      this.retryable = false;
   }
}

class ValidationError extends Error {
   constructor(message) {
      super(message);
      this.name = 'ValidationError';
      this.statusCode = 400;
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
   NotFoundError,
   InsufficientStockError,
   ValidationError,
   AlreadyProcessingError
};