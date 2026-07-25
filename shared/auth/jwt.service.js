const jwt = require('jsonwebtoken')

const { UnauthorizedError } = require('../errors/base.errors');

function createJwtService({ configJwt }) {

   function sign(payload){
      if (!configJwt.privateKey) {
         throw new Error(
            'JWT private key not configured'
         );
      }
      return jwt.sign(
         payload,
         configJwt.privateKey,
         { 
            algorithm: 'ES256', 
            expiresIn: configJwt.expiresIn,
            issuer: configJwt.issuer,
            audience: configJwt.audience
         }
      )
   }

   function verify(token){
      if (!configJwt.publicKey) {
         throw new Error(
            'JWT public key not configured'
         );
      }
      try{
         const payload = jwt.verify(
            token, 
            configJwt.publicKey,
            {
               algorithms: ['ES256'],
               issuer: configJwt.issuer,
               audience: configJwt.audience
            }
         )
         return payload;
      }catch{
         throw new UnauthorizedError("Invalid or expired access token");
      }
   }

   function validate(authorizationHeader) {
      if (
         !authorizationHeader || 
         !authorizationHeader.startsWith('Bearer ')
      ){
         throw new UnauthorizedError(
            "Missing or malformed Authorization header"
         );
      }

      const token = authorizationHeader.slice(7);

      return verify(token);  
   }

   return {
      sign,
      verify,
      validate
   }
}

module.exports = createJwtService
