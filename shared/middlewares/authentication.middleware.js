const { UnauthorizedError } = require('../errors/base.errors');

const createAuthenticationMiddleware = ({ jwtService }) => {
   return async (req, res, next) => {
      try {
         const authorizationHeader = req.headers['authorization'];
         const payload = await jwtService.validate(authorizationHeader);
         req.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role
         };
         next();
      } catch (err) {
         throw new UnauthorizedError(
            'Authentication failed: ' + err.message,
            { cause: err }
         );
      }
   };
};

module.exports = createAuthenticationMiddleware;