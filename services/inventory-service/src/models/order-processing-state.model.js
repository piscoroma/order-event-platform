const mongoose = require('mongoose');

const orderProcessingStateSchema = new mongoose.Schema(
   {
      orderId: { type: String, required: true, unique: true, index: true },
      status: {
         type: String,
         enum: ['processing', 'done', 'failed'],
         required: true,
      },
   },
   { timestamps: true }
);

const OrderProcessingState = mongoose.model(
   'OrderProcessingState', orderProcessingStateSchema, 'orderProcessingStates'
);

module.exports = OrderProcessingState;