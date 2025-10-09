const express = require('express');
const multer = require('multer');
const path = require('path');
const HappyLearnersController = require('../controllers/HappyLearnersController');

// Set up file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profile');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));  // Add timestamp to the image filename
    }
});

const upload = multer({ storage });

const router = express.Router();

// Routes for Happy Learners
router.post('/add', upload.single('image'), HappyLearnersController.addHappyLearner);
router.get('/', HappyLearnersController.getAllHappyLearners);

module.exports = router;
