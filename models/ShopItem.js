const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  description: { type: String },
  image: { type: String }, // Path to the uploaded image
}, { timestamps: true });

module.exports = mongoose.model('ShopItem', shopItemSchema);
