const Item = require('../models/item.model')

async function seedData({ logger }) {
   const count = await Item.countDocuments();
   if (count > 0) 
      return;

   const items = [
      { _id: 'widget-a', name: 'Widget A', stock: 100, price: 9.99 },
      { _id: 'widget-b', name: 'Widget B', stock: 50, price: 19.99 },
      { _id: 'gadget-x', name: 'Gadget X', stock: 25, price: 49.99 },
      { _id: 'gadget-y', name: 'Gadget Y', stock: 10, price: 99.99 },
   ];

   await Item.insertMany(items);

   logger.info('Seed data inserted', { count: items.length });
}

module.exports = { seedData };
6