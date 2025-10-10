const mongoose = require("mongoose")
const Notification = require("../models/notification")
const LiveClass = require("../models/LiveClassModel")
const User = require("../models/UserModel")
const TeacherLogin = require("../models/TeacherLogin")
const admin = require("firebase-admin")
const Course = require("../models/CourseModel")

// Initialize Firebase Admin SDK using environment variables
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID || "chinthanaprabha-d92ae",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : null,
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL,
  "universe_domain": "googleapis.com"
}

// Check if Firebase app is already initialized to prevent re-initialization errors
if (!admin.apps.length) {
  try {
    // Validate required environment variables
    if (!serviceAccount.private_key_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      console.error("Missing Firebase environment variables:")
      console.error("- FIREBASE_PRIVATE_KEY_ID:", !!serviceAccount.private_key_id)
      console.error("- FIREBASE_PRIVATE_KEY:", !!serviceAccount.private_key)
      console.error("- FIREBASE_CLIENT_EMAIL:", !!serviceAccount.client_email)
      throw new Error("Firebase credentials not properly configured")
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    console.log("Firebase Admin SDK initialized successfully")
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error.message)
    console.error("Please check your Firebase environment variables")
  }
} else {
  console.log("Firebase Admin SDK already initialized")
}

// Helper function to remove invalid FCM tokens
const removeInvalidToken = async (token) => {
  try {
    // Remove from users
    await User.updateMany({ fcmToken: token }, { $unset: { fcmToken: 1 } })

    // Remove from teachers
    await TeacherLogin.updateMany({ fcmToken: token }, { $unset: { fcmToken: 1 } })
    console.log(`Removed invalid FCM token: ${token}`)
  } catch (error) {
    console.error("Error removing invalid FCM token:", error.message, error.stack)
  }
}

// FIXED: Function to send chat message notifications - only to the specific receiver
exports.sendChatMessageNotification = async ({
  senderId,
  receiverId,
  courseId,
  messageContent,
  senderModel,
  receiverModel,
}) => {
  try {
    console.log(`Processing chat notification: ${senderId} -> ${receiverId} for course ${courseId}`)
    
    let receiverToken = null
    let receiverName = "Recipient"
    let senderName = "Sender"
    let receiverUserType = ""

    // Fetch receiver's FCM token and name - ONLY for the specific receiver
    if (receiverModel === "User") {
      const user = await User.findById(receiverId).select("fcmToken name isActive lastSeen")
      if (!user) {
        console.log(`Receiver user ${receiverId} not found`)
        return { success: false, error: "Receiver not found" }
      }
      
      // Check if user is active (optional - you can implement user activity tracking)
      receiverToken = user?.fcmToken
      receiverName = user?.name || receiverName
      receiverUserType = "student"
      
      console.log(`Found receiver (User): ${receiverName}, FCM Token: ${receiverToken ? 'Present' : 'Missing'}`)
    } else if (receiverModel === "TeacherLogin") {
      const teacher = await TeacherLogin.findById(receiverId).select("fcmToken name isActive lastSeen")
      if (!teacher) {
        console.log(`Receiver teacher ${receiverId} not found`)
        return { success: false, error: "Receiver not found" }
      }
      
      receiverToken = teacher?.fcmToken
      receiverName = teacher?.name || receiverName
      receiverUserType = "teacher"
      
      console.log(`Found receiver (Teacher): ${receiverName}, FCM Token: ${receiverToken ? 'Present' : 'Missing'}`)
    }

    // Fetch sender's name
    if (senderModel === "User") {
      const user = await User.findById(senderId).select("name")
      senderName = user?.name || senderName
    } else if (senderModel === "TeacherLogin") {
      const teacher = await TeacherLogin.findById(senderId).select("name")
      senderName = teacher?.name || senderName
    }

    // Fetch course name
    const course = await Course.findById(courseId).select("name")
    const courseName = course?.name || "a course"

    // --- Send Firebase Push Notification ONLY to the receiver ---
    if (receiverToken) {
      console.log(`Sending push notification to ${receiverName} with token: ${receiverToken.substring(0, 20)}...`)
      
      const message = {
        token: receiverToken, // ONLY send to this specific token
        notification: {
          title: `${senderName}`,
          body: messageContent,
        },
        data: {
          type: "chat_message",
          senderId: senderId.toString(),
          receiverId: receiverId.toString(),
          courseId: courseId.toString(),
          courseName: courseName,
          senderName: senderName,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        apns: {
          headers: {
            "apns-collapse-id": String(courseId).substring(0, 60),
          },
        },
        android: {
          collapseKey: String(courseId).substring(0, 60),
        },
      }

      try {
        const response = await admin.messaging().send(message)
        console.log("Successfully sent chat message push notification:", response)
      } catch (error) {
        console.error("Error sending chat message push notification:", error)
        // Check for invalid token errors and remove them
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          console.log(`Removing invalid FCM token for receiver ${receiverId}`)
          await removeInvalidToken(receiverToken)
        }
      }
    } else {
      console.log(`No FCM token found for receiver ${receiverId} (${receiverName}). User might be logged out.`)
    }

    // --- Save Notification to Database ---
    const notificationTitle = `New Message from ${senderName}`
    const notificationMessage = `You received a message in ${courseName}: "${messageContent}"`

    const newDbNotification = new Notification({
      userId: receiverId, // ONLY save for the receiver
      userType: receiverUserType,
      title: notificationTitle,
      message: notificationMessage,
      data: {
        type: "chat_message",
        senderId: senderId.toString(),
        receiverId: receiverId.toString(),
        courseId: courseId.toString(),
        courseName: courseName,
        senderName: senderName,
      },
      isRead: false,
    })

    await newDbNotification.save()
    console.log(`Successfully saved chat message notification to database for ${receiverName}`)

    return { success: true, message: "Chat notification processed successfully." }
  } catch (error) {
    console.error("Error processing chat message notification:", error)
    return { success: false, error: error.message }
  }
}

// NEW: Function to clear FCM token on logout
exports.clearFcmTokenOnLogout = async (req, res) => {
  try {
    const { userId, userType } = req.body

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID" })
    }

    if (!userType || (userType !== "student" && userType !== "teacher")) {
      return res.status(400).json({ message: "Invalid userType. Must be 'student' or 'teacher'" })
    }

    let updateResult

    if (userType === "student") {
      updateResult = await User.findByIdAndUpdate(
        userId,
        { 
          $unset: { fcmToken: 1 },
          isActive: false,
          lastSeen: new Date()
        },
        { new: true }
      )
    } else if (userType === "teacher") {
      updateResult = await TeacherLogin.findByIdAndUpdate(
        userId,
        { 
          $unset: { fcmToken: 1 },
          isActive: false,
          lastSeen: new Date()
        },
        { new: true }
      )
    }

    if (!updateResult) {
      return res.status(404).json({ message: "User not found" })
    }

    console.log(`FCM token cleared for ${userType} ${userId} on logout`)
    res.status(200).json({ message: "FCM token cleared successfully on logout" })
  } catch (error) {
    console.error("Error clearing FCM token on logout:", error)
    res.status(500).json({ message: "Failed to clear FCM token on logout" })
  }
}

// IMPROVED: Update FCM token for a user with better validation
exports.updateFcmToken = async (req, res) => {
  try {
    const { userId } = req.params
    const { fcmToken } = req.body

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID" })
    }

    if (!fcmToken) {
      return res.status(400).json({ message: "FCM token is required" })
    }

    // First, clear this FCM token from any other user it might be associated with
    await User.updateMany({ fcmToken: fcmToken, _id: { $ne: userId } }, { $unset: { fcmToken: 1 } })
    await TeacherLogin.updateMany({ fcmToken: fcmToken, _id: { $ne: userId } }, { $unset: { fcmToken: 1 } })

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        fcmToken, 
        fcmTokenUpdatedAt: new Date(),
        isActive: true,
        lastSeen: new Date()
      },
      { new: true }
    )

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    console.log(`FCM token updated for user ${userId}: ${fcmToken.substring(0, 20)}...`)
    res.status(200).json({ message: "FCM token updated successfully" })
  } catch (error) {
    console.error("Error updating FCM token:", error.message, error.stack)
    res.status(500).json({ message: "Failed to update FCM token" })
  }
}

// IMPROVED: Update FCM token for a teacher with better validation
exports.updateTeacherFcmToken = async (req, res) => {
  try {
    const { teacherId } = req.params
    const { fcmToken } = req.body

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: "Invalid Teacher ID" })
    }

    if (!fcmToken) {
      return res.status(400).json({ message: "FCM token is required" })
    }

    // First, clear this FCM token from any other user it might be associated with
    await User.updateMany({ fcmToken: fcmToken, _id: { $ne: teacherId } }, { $unset: { fcmToken: 1 } })
    await TeacherLogin.updateMany({ fcmToken: fcmToken, _id: { $ne: teacherId } }, { $unset: { fcmToken: 1 } })

    const teacher = await TeacherLogin.findByIdAndUpdate(
      teacherId,
      { 
        fcmToken, 
        fcmTokenUpdatedAt: new Date(),
        isActive: true,
        lastSeen: new Date()
      },
      { new: true }
    )

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" })
    }

    console.log(`FCM token updated for teacher ${teacherId}: ${fcmToken.substring(0, 20)}...`)
    res.status(200).json({ message: "FCM token updated successfully" })
  } catch (error) {
    console.error("Error updating FCM token:", error.message, error.stack)
    res.status(500).json({ message: "Failed to update FCM token" })
  }
}

// Keep all other existing functions...
exports.createLiveClassNotification = async (liveClass) => {
  try {
    const { users, title, startTime, _id: liveClassId, teacher } = liveClass

    const notificationBatchId = new mongoose.Types.ObjectId()

    const studentPromises = users.map(async (userId) => {
      const exists = await Notification.findOne({
        userId,
        liveClassId,
        title: `New Live Class Scheduled: ${title}`,
        notificationBatchId,
      })

      if (!exists) {
        const notification = new Notification({
          userId,
          userType: "student",
          title: `New Live Class Scheduled: ${title}`,
          message: `Join the live class "${title}" on ${new Date(startTime).toLocaleString()}.`,
          liveClassId,
          notificationBatchId,
        })
        return notification.save()
      }
      return null
    })

    const teacherExists = await Notification.findOne({
      userId: teacher,
      liveClassId,
      title: `Your Live Class Scheduled: ${title}`,
      notificationBatchId,
    })

    let teacherPromise = Promise.resolve(null)
    if (!teacherExists) {
      const teacherNotification = new Notification({
        userId: teacher,
        userType: "teacher",
        title: `Your Live Class Scheduled: ${title}`,
        message: `You have a live class "${title}" scheduled on ${new Date(startTime).toLocaleString()}.`,
        liveClassId,
        notificationBatchId,
      })
      teacherPromise = teacherNotification.save()
    }

    await Promise.all([...studentPromises, teacherPromise])
    console.log("Database notifications created for live class:", title)

    await sendFirebaseNotifications(liveClass, notificationBatchId)
  } catch (error) {
    console.error("Error creating live class notifications:", error.message, error.stack)
    throw error
  }
}

const sendFirebaseNotifications = async (liveClass, notificationBatchId) => {
  try {
    const { users, title, startTime, teacher, _id: liveClassId } = liveClass

    console.log(`=== SENDING LIVE CLASS NOTIFICATIONS ===`)
    console.log(`Live Class: ${title}`)
    console.log(`Users: ${users.length}`)
    console.log(`Teacher: ${teacher}`)

    // Get ONLY active users with valid FCM tokens
    const userTokens = await User.find(
      { 
        _id: { $in: users }, 
        fcmToken: { $exists: true, $ne: null },
        // Optional: Add isActive check
        // isActive: true
      },
      { fcmToken: 1, _id: 0 }
    ).distinct("fcmToken")

    console.log(`Found ${userTokens.length} user FCM tokens`)

    // Get teacher's FCM token
    const teacherData = await TeacherLogin.findOne(
      { 
        _id: teacher, 
        fcmToken: { $exists: true, $ne: null },
        // Optional: Add isActive check
        // isActive: true
      },
      { fcmToken: 1 }
    )
    const teacherToken = teacherData?.fcmToken || null

    console.log(`Teacher FCM token: ${teacherToken ? 'Present' : 'Missing'}`)

    const allTokens = [...new Set([...userTokens])]
    if (teacherToken) {
      allTokens.push(teacherToken)
    }

    console.log(`Total tokens to send to: ${allTokens.length}`)

    if (allTokens.length === 0) {
      console.log("No valid FCM tokens found for live class notification")
      return
    }

    const formattedDate = new Date(startTime).toLocaleString()

    const messages = allTokens.map((token) => ({
      token: token,
      notification: {
        title: `Live Class: ${title}`,
        body: `A live class "${title}" is scheduled for ${formattedDate}`,
      },
      data: {
        liveClassId: liveClassId.toString(),
        title: title,
        startTime: startTime.toString(),
        type: "live_class",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        notificationBatchId: notificationBatchId.toString(),
      },
      apns: {
        headers: {
          "apns-collapse-id": notificationBatchId.toString(),
        },
      },
      android: {
        collapseKey: notificationBatchId.toString(),
      },
    }))

    const chunkSize = 500
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize)

      try {
        console.log(`Sending notification chunk ${i / chunkSize + 1} with ${chunk.length} messages`)
        const response = await admin.messaging().sendEach(chunk)
        console.log(`Sent ${response.successCount} messages successfully in chunk ${i / chunkSize + 1}`)
        console.log(`Failed ${response.failureCount} messages in chunk ${i / chunkSize + 1}`)

        if (response.failureCount > 0) {
          const removalPromises = response.responses.map((resp, idx) => {
            if (!resp.success) {
              console.log(`Failed to send message to token ${chunk[idx].token.substring(0, 20)}...:`, resp.error)
              if (
                resp.error.code === "messaging/invalid-registration-token" ||
                resp.error.code === "messaging/registration-token-not-registered"
              ) {
                return removeInvalidToken(chunk[idx].token)
              }
            }
            return Promise.resolve()
          })
          await Promise.all(removalPromises)
        }
      } catch (error) {
        console.error(`Error sending notification chunk ${i / chunkSize + 1}:`, error.message)
        console.error(`Full error:`, error)
      }
    }
  } catch (error) {
    console.error("Error in sendFirebaseNotifications:", error.message, error.stack)
    throw error
  }
}

// Keep all other existing exports...
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID" })
    }

    const notifications = await Notification.find({ userId })
      .populate("liveClassId", "title startTime endTime meetLink")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec()

    const count = await Notification.countDocuments({ userId })

    res.status(200).json({
      notifications,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalNotifications: count,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error.message, error.stack)
    res.status(500).json({ message: "Failed to fetch notifications" })
  }
}

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Invalid Notification ID" })
    }

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true },
    )

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" })
    }

    res.status(200).json(notification)
  } catch (error) {
    console.error("Error marking notification as read:", error.message, error.stack)
    res.status(500).json({ message: "Failed to update notification" })
  }
}

exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID" })
    }

    await Notification.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() })

    res.status(200).json({ message: "All notifications marked as read" })
  } catch (error) {
    console.error("Error marking all notifications as read:", error.message, error.stack)
    res.status(500).json({ message: "Failed to update notifications" })
  }
}

exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Invalid Notification ID" })
    }

    const notification = await Notification.findByIdAndDelete(notificationId)

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" })
    }

    res.status(200).json({ message: "Notification deleted successfully" })
  } catch (error) {
    console.error("Error deleting notification:", error.message, error.stack)
    res.status(500).json({ message: "Failed to delete notification" })
  }
}

exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID" })
    }

    const count = await Notification.countDocuments({ userId, isRead: false })

    res.status(200).json({ count })
  } catch (error) {
    console.error("Error counting unread notifications:", error.message, error.stack)
    res.status(500).json({ message: "Failed to count notifications" })
  }
}

exports.getTeacherNotifications = async (req, res) => {
  try {
    const { teacherId } = req.params
    const { page = 1, limit = 20 } = req.query

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: "Invalid Teacher ID" })
    }

    const notifications = await Notification.find({
      userId: teacherId,
      userType: "teacher",
    })
      .populate("liveClassId", "title startTime endTime meetLink")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec()

    const count = await Notification.countDocuments({
      userId: teacherId,
      userType: "teacher",
    })

    res.status(200).json({
      notifications,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalNotifications: count,
    })
  } catch (error) {
    console.error("Error fetching teacher notifications:", error.message, error.stack)
    res.status(500).json({ message: "Failed to fetch notifications" })
  }
}

exports.cleanupOldNotifications = async (req, res) => {
  try {
    const { days = 30 } = req.query
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - Number.parseInt(days))

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
    })

    res.status(200).json({
      message: `Deleted ${result.deletedCount} old notifications`,
      cutoffDate: cutoffDate.toISOString(),
    })
  } catch (error) {
    console.error("Error cleaning up old notifications:", error.message, error.stack)
    res.status(500).json({ message: "Failed to clean up notifications" })
  }
}

exports.createLiveClassUpdateNotification = async (liveClass) => {
  try {
    const { users, title, startTime, _id: liveClassId, teacher } = liveClass

    const notificationBatchId = new mongoose.Types.ObjectId()

    const studentPromises = users.map(async (userId) => {
      const exists = await Notification.findOne({
        userId,
        liveClassId,
        title: `Live Class Updated: ${title}`,
        notificationBatchId,
      })

      if (!exists) {
        const notification = new Notification({
          userId,
          userType: "student",
          title: `Live Class Updated: ${title}`,
          message: `The live class "${title}" has been updated. It is now scheduled for ${new Date(startTime).toLocaleString()}.`,
          liveClassId,
          notificationBatchId,
        })
        return notification.save()
      }
      return null
    })

    const teacherExists = await Notification.findOne({
      userId: teacher,
      liveClassId,
      title: `Your Live Class Updated: ${title}`,
      notificationBatchId,
    })

    let teacherPromise = Promise.resolve(null)
    if (!teacherExists) {
      const teacherNotification = new Notification({
        userId: teacher,
        userType: "teacher",
        title: `Your Live Class Updated: ${title}`,
        message: `Your live class "${title}" has been updated. It is now scheduled for ${new Date(startTime).toLocaleString()}.`,
        liveClassId,
        notificationBatchId,
      })
      teacherPromise = teacherNotification.save()
    }

    await Promise.all([...studentPromises, teacherPromise])
    console.log("Database notifications created for updated live class:", title)

    await sendFirebaseUpdateNotifications(liveClass, notificationBatchId)
  } catch (error) {
    console.error("Error creating live class update notifications:", error.message, error.stack)
    throw error
  }
}

const sendFirebaseUpdateNotifications = async (liveClass, notificationBatchId) => {
  try {
    const { users, title, startTime, teacher, _id: liveClassId } = liveClass

    const userTokens = await User.find(
      { _id: { $in: users }, fcmToken: { $exists: true, $ne: null } },
      { fcmToken: 1, _id: 0 },
    ).distinct("fcmToken")

    const teacherData = await TeacherLogin.findOne(
      { _id: teacher, fcmToken: { $exists: true, $ne: null } },
      { fcmToken: 1 },
    )
    const teacherToken = teacherData?.fcmToken || null

    const allTokens = [...new Set([...userTokens])]
    if (teacherToken) {
      allTokens.push(teacherToken)
    }

    if (allTokens.length === 0) {
      console.log("No valid FCM tokens found for notification")
      return
    }

    const formattedDate = new Date(startTime).toLocaleString()

    const messages = allTokens.map((token) => ({
      token: token,
      notification: {
        title: `Live Class Updated: ${title}`,
        body: `The live class "${title}" has been updated. It is now scheduled for ${formattedDate}`,
      },
      data: {
        liveClassId: liveClassId.toString(),
        title: title,
        startTime: startTime.toString(),
        type: "live_class_update",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        notificationBatchId: notificationBatchId.toString(),
      },
      apns: {
        headers: {
          "apns-collapse-id": notificationBatchId.toString(),
        },
      },
      android: {
        collapseKey: notificationBatchId.toString(),
      },
    }))

    const chunkSize = 500
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize)

      try {
        const response = await admin.messaging().sendEach(chunk)
        console.log(`Sent ${response.successCount} update messages successfully in chunk ${i / chunkSize + 1}`)

        if (response.failureCount > 0) {
          const removalPromises = response.responses.map((resp, idx) => {
            if (!resp.success) {
              console.log(`Failed to send update message to token ${chunk[idx].token}:`, resp.error)
              if (
                resp.error.code === "messaging/invalid-registration-token" ||
                resp.error.code === "messaging/registration-token-not-registered"
              ) {
                return removeInvalidToken(chunk[idx].token)
              }
            }
            return Promise.resolve()
          })
          await Promise.all(removalPromises)
        }
      } catch (error) {
        console.error(`Error sending update notification chunk ${i / chunkSize + 1}:`, error.message)
      }
    }
  } catch (error) {
    console.error("Error in sendFirebaseUpdateNotifications:", error.message, error.stack)
    throw error
  }
}

exports.removeInvalidToken = removeInvalidToken
