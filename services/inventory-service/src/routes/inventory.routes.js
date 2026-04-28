const express = require('express');

function createInventoryRoutes({ inventoryController }) {

   const router = express.Router();

   router.get('/items', inventoryController.listItems);
   router.get('/items/:id', inventoryController.getItem);
   router.patch('/items/:id', inventoryController.updateItem);

   return router;
}

module.exports = createInventoryRoutes;
