const express = require('express');
const router = express.Router();
const {
  getAllPerformances,
  getPerformanceById,
  createPerformance,
  updatePerformance,
  deletePerformance
} = require('../controllers/performanceController');

// GET /api/performance - Get all performances
router.get('/', getAllPerformances);

// GET /api/performance/:id - Get a single performance
router.get('/:id', getPerformanceById);

// POST /api/performance - Create a new performance
router.post('/', createPerformance);

// PUT /api/performance/:id - Update a performance
router.put('/:id', updatePerformance);

// DELETE /api/performance/:id - Delete a performance
router.delete('/:id', deletePerformance);

module.exports = router;
