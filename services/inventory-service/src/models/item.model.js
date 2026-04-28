const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
   {
      _id: { type: String }, // usiamo nomi leggibili come ID es. "widget-a"
      name: { type: String, required: true },
      stock: { type: Number, required: true, min: 0 },
      price: { type: Number, required: true, min: 0 },
   }, 
   { timestamps: true }
);

const Item = mongoose.model('Item', itemSchema);
 
module.exports = Item;
