const Item = require('../models/item.model')

const DEFAULT_ITEMS = [
   { _id: 'widget-a', name: 'Widget A', stock: 100, price: 9.99 },
   { _id: 'widget-b', name: 'Widget B', stock: 50, price: 19.99 },
   { _id: 'gadget-x', name: 'Gadget X', stock: 25, price: 49.99 },
   { _id: 'gadget-y', name: 'Gadget Y', stock: 10, price: 99.99 }
]

async function seedData({ logger }) {
   logger.info('Seed inventory...');
   await Item.deleteMany({});
   await Item.insertMany(DEFAULT_ITEMS);
   logger.info('Seed inventory completed', {
      count: DEFAULT_ITEMS.length
   });
}

module.exports = {
   seedData
};