const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const shopController = require('../controllers/shopController');

// Ensure uploads/shop folder exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'shop');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer();


// Routes
router.post('/', upload.single('image'), shopController.createItem);
router.get('/', shopController.getAllItems);
router.get('/:id', shopController.getItemById);
router.put('/:id', upload.single('image'), shopController.updateItem);
router.delete('/:id', shopController.deleteItem);

module.exports = router;
