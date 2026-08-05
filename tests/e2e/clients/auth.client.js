const { createClient } = require("./http.client");

function createAuthClient() {
   const apiPromise = createClient(process.env.AUTH_SERVICE_URL);

   async function login(email, password) {
      const api = await apiPromise;
      const response = await api.post("login", {
         data: { email, password }
      });
      return {
         status: response.status(),
         body: await response.json()
      };
   }

   return {
      login
   };
   
}

module.exports = { createAuthClient };