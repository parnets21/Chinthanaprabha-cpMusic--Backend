const express = require("express")
const router = express.Router()
const notificationController = require("../controllers/notificationController")

// Get all notifications for a user
router.get("/notifications/user/:userId", notificationController.getUserNotifications)

// Mark notification as read
router.put("/notifications/:notificationId/read", notificationController.markAsRead)

// Mark all notifications as read
router.put("/notifications/user/:userId/read-all", notificationController.markAllAsRead)

// Delete a notification
router.delete("/notifications/:notificationId", notificationController.deleteNotification)

// Get unread notification count
router.get("/notifications/user/:userId/unread-count", notificationController.getUnreadCount)

// Get teacher notifications
router.get("/notifications/teacher/:teacherId", notificationController.getTeacherNotifications)

// Update FCM token for a user
router.put("/user/:userId/fcm-token", notificationController.updateFcmToken)

// Update FCM token for a teacher
router.put("/teacher/:teacherId/fcm-token", notificationController.updateTeacherFcmToken)

module.exports = router
