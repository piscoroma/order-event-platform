const { request } = require("@playwright/test");

function createClient(baseURL) {
   return request.newContext({ 
      baseURL ,
      ignoreHTTPSErrors: process.env.IGNORE_TLS_ERRORS === "true"
   });
}

module.exports = { createClient };