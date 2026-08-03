const { ValidationError } = require("@order-event-platform/shared/errors/base.errors");

const { toItemDto } = require('../mappers/item.mapper');

function createInventoryController({ inventoryService }) {

   async function listItems(req, res) {
      const items = await inventoryService.listItems();
      res.json(items.map(toItemDto));
   }

   async function getItem(req, res) {
      const item = await inventoryService.getItem(req.params.id);
      res.json(toItemDto(item));
   }

   async function updateItem(req, res) {
      const { stock } = req.body ?? {};
      if (!stock || typeof stock !== 'number' || stock < 0)
         throw new ValidationError(`stock must be a non-negative number`);

      const item = await inventoryService.updateItemStock(req.params.id, stock);
      res.json(toItemDto(item));
   }

   return { 
      listItems, 
      getItem, 
      updateItem
   };

}

module.exports = createInventoryController;
