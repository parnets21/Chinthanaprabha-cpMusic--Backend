const Report = require('../models/Report')
const UserModel = require('../models/UserModel')
const TeacherLogin = require('../models/TeacherLogin')
const CourseModel = require('../models/CourseModel') // Correctly imports your Course model

// Create a new report
const createReport = async (req, res) => {
  try {
    const {
      reporterId,
      reportedUserId,
      courseId,
      reason,
      description,
      reporterRole,
      reportedUserRole
    } = req.body

    // Validate required fields
    if (!reporterId || !reportedUserId || !courseId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reporterId, reportedUserId, courseId, and reason are required'
      })
    }

    // Validate that reporter and reported user are different
    if (reporterId === reportedUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report yourself'
      })
    }

    // Determine the model types based on roles
    const reporterModel = reporterRole === 'user' ? 'User' : 'TeacherLogin'
    const reportedUserModel = reportedUserRole === 'user' ? 'User' : 'TeacherLogin'

    // Verify that the reporter exists
    const ReporterModelRef = reporterModel === 'User' ? UserModel : TeacherLogin;
    const reporter = await ReporterModelRef.findById(reporterId)
    if (!reporter) {
      return res.status(404).json({
        success: false,
        message: 'Reporter not found'
      })
    }

    // Verify that the reported user exists
    const ReportedUserModelRef = reportedUserModel === 'User' ? UserModel : TeacherLogin;
    const reportedUser = await ReportedUserModelRef.findById(reportedUserId)
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: 'Reported user not found'
      })
    }

    // Verify that the course exists
    const course = await CourseModel.findById(courseId) // Correctly uses CourseModel variable
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }

    // Create the report
    const report = new Report({
      reporterId,
      reporterModel,
      reportedUserId,
      reportedUserModel,
      courseId,
      reason,
      description: description || '',
      status: 'pending'
    })

    await report.save()

    // Populate the report with user details for response
    await report.populate([
      { path: 'reporterId', select: 'name email' },
      { path: 'reportedUserId', select: 'name email' },
      { path: 'courseId', select: 'name' }
    ])

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: report
    })

  } catch (error) {
    console.error('Error creating report:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

// Get all reports (admin only)
const getAllReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query

    // Build filter object
    const filter = {}
    if (status) {
      filter.status = status
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    // Get reports with pagination
    const reports = await Report.find(filter)
      .populate('reporterId', 'name email')
      .populate('reportedUserId', 'name email')
      .populate('courseId', 'name')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))

    // Get total count for pagination
    const totalReports = await Report.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReports / parseInt(limit)),
          totalReports,
          hasNextPage: skip + reports.length < totalReports,
          hasPrevPage: parseInt(page) > 1
        }
      }
    })

  } catch (error) {
    console.error('Error fetching reports:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

// Get reports by user (reports made by a specific user)
const getReportsByUser = async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const reports = await Report.find({ reporterId: userId })
      .populate('reportedUserId', 'name')
      .populate('courseId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const totalReports = await Report.countDocuments({ reporterId: userId })

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReports / parseInt(limit)),
          totalReports
        }
      }
    })

  } catch (error) {
    console.error('Error fetching user reports:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

// Update report status (admin only)
const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params
    const { status, adminNotes, reviewedBy } = req.body

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      })
    }

    const updateData = {
      status,
      updatedAt: new Date()
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes
    }

    if (reviewedBy) {
      updateData.reviewedBy = reviewedBy
      updateData.reviewedAt = new Date()
    }

    const report = await Report.findByIdAndUpdate(
      reportId,
      updateData,
      { new: true }
    ).populate([
      { path: 'reporterId', select: 'name email' },
      { path: 'reportedUserId', select: 'name email' },
      { path: 'courseId', select: 'name' },
      { path: 'reviewedBy', select: 'name email' }
    ])

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: report
    })

  } catch (error) {
    console.error('Error updating report:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

// Get report statistics (admin only)
const getReportStatistics = async (req, res) => {
  try {
    const stats = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    const reasonStats = await Report.aggregate([
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ])

    const totalReports = await Report.countDocuments()
    const reportsThisMonth = await Report.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    })

    res.status(200).json({
      success: true,
      data: {
        totalReports,
        reportsThisMonth,
        statusBreakdown: stats,
        reasonBreakdown: reasonStats
      }
    })

  } catch (error) {
    console.error('Error fetching report statistics:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

module.exports = {
  createReport,
  getAllReports,
  getReportsByUser,
  updateReportStatus,
  getReportStatistics
}
