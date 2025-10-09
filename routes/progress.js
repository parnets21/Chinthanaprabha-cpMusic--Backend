// routes/progress.js
const express = require('express');
const ProgressController = require('../controllers/ProgressController');

const router = express.Router();

// Get progress for a user and course
router.get('/progress/:userId/:courseId', ProgressController.getProgress);

// Save progress for a user and course
router.post('/progress', ProgressController.saveProgress);

module.exports = router;