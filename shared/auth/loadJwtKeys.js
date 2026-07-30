const fs = require("fs");

function loadJwtKeys(jwtConfig) {
   const result = {};

   if (jwtConfig.privateKeyPath) {
      result.privateKey = fs.readFileSync(jwtConfig.privateKeyPath, "utf8");
   }

   if (jwtConfig.publicKeyPath) {
      result.publicKey = fs.readFileSync(jwtConfig.publicKeyPath, "utf8");
   }

   return result;
}

module.exports = { loadJwtKeys };