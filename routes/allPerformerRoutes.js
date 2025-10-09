// routes/allPerformerRoutes.js
const express = require('express');
const router = express.Router();
const allPerformerController = require('../controllers/allPerformerController');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/performerVideo');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '_' + file.originalname);
    },
});

const upload = multer();

// Upload performer
router.post('/upload', upload.single('video'), allPerformerController.createAllPerformer);

// Get all performers by category
router.get('/all-performers/:category', allPerformerController.getAllPerformersByCategory);

// Get a performer by ID
router.get('/all-performers/:id', allPerformerController.getAllPerformerById);

// Update a performer
router.put('/all-performers/:id', upload.single('video'), allPerformerController.updateAllPerformer);

// Delete a performer
router.delete('/all-performers/:id', allPerformerController.deleteAllPerformer);

router.post('/all-performers/:id/like', allPerformerController.likePerformer);



// Add a comment
router.post('/all-performers/:id/comments', allPerformerController.addComment);

// Get all comments for a performer
router.get('/all-performers/:id/comments', allPerformerController.getComments);

// Delete a comment
router.delete('/all-performers/:id/comments/:commentId', allPerformerController.deleteComment);
module.exports = router;