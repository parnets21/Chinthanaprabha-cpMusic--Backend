const { uploadFile2 } = require('../middleware/aws');

const ShopItem = require('../models/ShopItem');
const path = require('path');

// Create new item
exports.createItem = async (req, res) => {
  try {
    const { name, category, price, rating, description } = req.body;
    const image = req.file ? `${req.file ? await uploadFile2(req.file, "category") : null}` : null;

    const newItem = new ShopItem({ name, category, price, rating, description, image });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all items
exports.getAllItems = async (req, res) => {
  try {
    const items = await ShopItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single item
exports.getItemById = async (req, res) => {
  try {
    const item = await ShopItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete item
exports.deleteItem = async (req, res) => {
  try {
    await ShopItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateItem = async (req, res) => {
  try {
    const { name, category, price, rating, description } = req.body;
    const itemId = req.params.id;

    const existingItem = await ShopItem.findById(itemId);
    if (!existingItem) return res.status(404).json({ message: 'Item not found' });

    const updatedData = {
      name: name || existingItem.name,
      category: category || existingItem.category,
      price: price || existingItem.price,
      rating: rating !== undefined ? rating : existingItem.rating,
      description: description || existingItem.description,
      image: req.file ? `${req.file ? await uploadFile2(req.file, "category") : null}` : existingItem.image,
    };

    const updatedItem = await ShopItem.findByIdAndUpdate(itemId, updatedData, { new: true });
    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
