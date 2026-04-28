function createInventoryController({ inventoryService }) {

   async function listItems(req, res, next) {
      try {
         const items = await inventoryService.listItems();
         res.json(items);
      } catch (err) {
         next(err);
      }
   }

   async function getItem(req, res, next) {
      try {
         const item = await inventoryService.getItem(req.params.id);
         res.json(item);
      } catch (err) {
         next(err);
      }
   }

   async function updateItem(req, res, next) {
      try {
         const { stock } = req.body;
         if (typeof stock !== 'number' || stock < 0) {
            return res.status(400).json({ error: 'stock must be a non-negative number' });
         }
         const item = await inventoryService.updateItemStock(req.params.id, stock);
         res.json(item);
      } catch (err) {
         next(err);
      }
   }

   return { 
      listItems, 
      getItem, 
      updateItem
   };

}

module.exports = createInventoryController;
