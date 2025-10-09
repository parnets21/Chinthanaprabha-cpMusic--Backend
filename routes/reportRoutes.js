const express = require('express')
const router = express.Router()
const {
  createReport,
  getAllReports,
  getReportsByUser,
  updateReportStatus,
  getReportStatistics
} = require('../controllers/reportController')

// Middleware for authentication (you should implement this based on your auth system)
const authenticateUser = (req, res, next) => {
  // Add your authentication logic here
  // For now, we'll just pass through
  next()
}

// Middleware for admin authentication (you should implement this based on your auth system)
const authenticateAdmin = (req, res, next) => {
  // Add your admin authentication logic here
  // For now, we'll just pass through
  next()
}

// Public routes (with user authentication)
router.post('/', authenticateUser, createReport)
router.get('/user/:userId', authenticateUser, getReportsByUser)

// Admin routes (with admin authentication)
router.get('/', authenticateAdmin, getAllReports)
router.put('/:reportId', authenticateAdmin, updateReportStatus)
router.get('/statistics', authenticateAdmin, getReportStatistics)

module.exports = router
