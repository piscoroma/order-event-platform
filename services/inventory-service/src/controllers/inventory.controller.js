const { ValidationError } = require("@order-event-platform/shared/errors/base.errors");

function createInventoryController({ inventoryService }) {

   async function listItems(req, res) {
      const items = await inventoryService.listItems();
      res.json(items);
   }

   async function getItem(req, res) {
      const item = await inventoryService.getItem(req.params.id);
      res.json(item);
   }

   async function updateItem(req, res) {
      const { stock } = req.body ?? {};
      if (!stock || typeof stock !== 'number' || stock < 0)
         throw new ValidationError(`stock must be a non-negative number`);

      const item = await inventoryService.updateItemStock(req.params.id, stock);
      res.json(item);
   }

   return { 
      listItems, 
      getItem, 
      updateItem
   };

}

module.exports = createInventoryController;
