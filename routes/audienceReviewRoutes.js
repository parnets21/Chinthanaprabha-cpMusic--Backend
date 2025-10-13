const express = require('express');
const router = express.Router();
const {
  getAllAudienceReviews,
  getAudienceReviewById,
  createAudienceReview,
  updateAudienceReview,
  deleteAudienceReview
} = require('../controllers/audienceReviewController');

// GET /api/audienceReview - Get all audience reviews
router.get('/', getAllAudienceReviews);

// GET /api/audienceReview/:id - Get a single audience review
router.get('/:id', getAudienceReviewById);

// POST /api/audienceReview - Create a new audience review
router.post('/', createAudienceReview);

// PUT /api/audienceReview/:id - Update an audience review
router.put('/:id', updateAudienceReview);

// DELETE /api/audienceReview/:id - Delete an audience review
router.delete('/:id', deleteAudienceReview);

module.exports = router;
