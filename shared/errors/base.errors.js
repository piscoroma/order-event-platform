class NotFoundError extends Error {
   constructor(resource, id) {
      super(`${resource} not found: ${id}`);
      this.name = 'NotFoundError';
      this.statusCode = 404;
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

class UnauthorizedError extends Error {
   constructor(message) {
      super(message);
      this.name = 'UnauthorizedError';
      this.statusCode = 401;
      this.retryable = false;
   }
}

class ConflictError extends Error {
   constructor(message) {
      super(message);
      this.name = 'ConflictError';
      this.statusCode = 409;
      this.retryable = false;
   }
}

module.exports = {
   NotFoundError,
   ValidationError,
   UnauthorizedError,
   ConflictError
};