const { createClient } = require("./http.client");

function createInventoryClient({ accessToken }) {

   const apiPromise = createClient(process.env.INVENTORY_SERVICE_URL);

   async function getItems() {
      const api = await apiPromise;
      const response = await api.get("items", {
         headers: {
            Authorization: `Bearer ${accessToken}`
         }
      });
      return {
         status: response.status(),
         body: await response.json()
      };
   }

   async function getItemById(id) {
      const api = await apiPromise;
      const response = await api.get(`items/${id}`, {
         headers: {
            Authorization: `Bearer ${accessToken}`
         }
      });
      return {
         status: response.status(),
         body: await response.json()
      };
   }

   return {
      getItems,
      getItemById,
   };

}

module.exports = { createInventoryClient };