const express = require('express');

const requireRoleMw = require('@order-event-platform/shared/middlewares/requireRole.middleware');

function createInventoryRoutes({ inventoryController }) {

   const router = express.Router();

   router.get('/items', inventoryController.listItems);
   router.get('/items/:id', inventoryController.getItem);
   router.patch('/items/:id', requireRoleMw('admin'), inventoryController.updateItem);

   return router;
}

module.exports = createInventoryRoutes;
