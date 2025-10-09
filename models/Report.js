const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'reporterModel'
  },
  reporterModel: {
    type: String,
    required: true,
    enum: ['User', 'TeacherLogin']
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'reportedUserModel'
  },
  reportedUserModel: {
    type: String,
    required: true,
    enum: ['User', 'TeacherLogin']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Course' // This is correct, it refers to the model name "Course"
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'Inappropriate content',
      'Harassment or bullying',
      'Spam or unwanted messages',
      'Sharing personal information',
      'Inappropriate behavior',
      'Other safety concern'
    ]
  },
  description: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Update the updatedAt field before saving
reportSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

// Index for efficient queries
reportSchema.index({ reporterId: 1, createdAt: -1 })
reportSchema.index({ reportedUserId: 1, createdAt: -1 })
reportSchema.index({ status: 1, createdAt: -1 })
reportSchema.index({ courseId: 1, createdAt: -1 })

module.exports = mongoose.model('Report', reportSchema)
