const Message = require("../models/MessageModel")
const Course = require("../models/CourseModel")
const User = require("../models/UserModel")
const TeacherLogin = require("../models/TeacherLogin")
const Payment = require("../models/Payment") // Assuming you have a PaymentModel

// NOTE: The sendMessage function is now handled by Socket.IO in server.js
// This controller will only contain functions for fetching data.

// Get chat history between a user and a teacher for a specific course
exports.getChatHistory = async (req, res) => {
  try {
    const { userId, teacherId, courseId } = req.params

    // Fetch messages where:
    // (sender is user AND receiver is teacher) OR (sender is teacher AND receiver is user)
    // AND the message belongs to the specified course
    const messages = await Message.find({
      course: courseId,
      $or: [
        { sender: userId, senderModel: "User", receiver: teacherId, receiverModel: "TeacherLogin" },
        { sender: teacherId, senderModel: "TeacherLogin", receiver: userId, receiverModel: "User" },
      ],
    })
      .sort("createdAt") // Sort by createdAt for chronological order
      .populate("sender", "name") // Populate sender's name
      .populate("receiver", "name") // Populate receiver's name

    res.status(200).json(messages)
  } catch (error) {
    console.error("Error fetching chat history:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get a single teacher's details (needed for chat screen header)
exports.getTeacherDetails = async (req, res) => {
  try {
    const { teacherId } = req.params
    const teacher = await TeacherLogin.findById(teacherId).select("name image") // Only fetch name and image

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" })
    }
    res.status(200).json(teacher)
  } catch (error) {
    console.error("Error fetching teacher details:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// New: Get a single user's details (needed for teacher chat screen header)
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params
    const user = await User.findById(userId).select("name image") // Only fetch name and image

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.status(200).json(user)
  } catch (error) {
    console.error("Error fetching user details:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// New: Get list of chats for a user (purchased courses with instructors)
exports.getUserChatList = async (req, res) => {
  try {
    const { userId } = req.params

    // Find all completed payments for the user
    const purchasedCourses = await Payment.find({ userId: userId, status: "completed" }).populate({
      path: "courseId",
      select: "name instructor",
      populate: {
        path: "instructor",
        select: "name image", // Populate instructor details
      },
    })

    // Filter out null courses or instructors if populate fails
    const validPurchases = purchasedCourses.filter((p) => p.courseId && p.courseId.instructor)

    // Get the latest message for each chat to show last message and unread count
    const chatList = await Promise.all(
      validPurchases.map(async (purchase) => {
        const course = purchase.courseId
        const instructor = course.instructor

        const latestMessage = await Message.findOne({
          course: course._id,
          $or: [
            { sender: userId, receiver: instructor._id },
            { sender: instructor._id, receiver: userId },
          ],
        }).sort({ createdAt: -1 })

        const unreadCount = await Message.countDocuments({
          course: course._id,
          sender: instructor._id, // Messages sent by instructor
          receiver: userId, // Received by user
          isRead: false,
        })

        return {
          courseId: course._id,
          courseName: course.name,
          instructorId: instructor._id,
          instructorName: instructor.name,
          instructorImage: instructor.image,
          lastMessage: latestMessage ? latestMessage.message : null,
          lastMessageTime: latestMessage ? latestMessage.createdAt : null,
          unreadCount: unreadCount,
        }
      }),
    )

    res.status(200).json(chatList)
  } catch (error) {
    console.error("Error fetching user chat list:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// New: Get list of chats for a teacher (students who purchased their courses and chatted)
exports.getTeacherChatList = async (req, res) => {
  try {
    const { teacherId } = req.params

    // Find all courses taught by this teacher
    const teacherCourses = await Course.find({ instructor: teacherId }).select("_id name")

    const courseIds = teacherCourses.map((c) => c._id)

    // Find all messages where the teacher is either sender or receiver, for their courses
    const messages = await Message.find({
      course: { $in: courseIds },
      $or: [{ sender: teacherId }, { receiver: teacherId }],
    })
      .populate("sender", "name image")
      .populate("receiver", "name image")
      .populate("course", "name")
      .sort({ createdAt: -1 }) // Sort by latest message

    // Aggregate unique conversations
    const conversations = {}

    for (const msg of messages) {
      const otherParticipantId =
        msg.sender._id.toString() === teacherId ? msg.receiver._id.toString() : msg.sender._id.toString()
      const otherParticipantModel = msg.sender._id.toString() === teacherId ? msg.receiverModel : msg.senderModel

      // Only include conversations with 'User' participants for teachers
      if (otherParticipantModel !== "User") continue

      const conversationKey = `${otherParticipantId}_${msg.course._id.toString()}`

      if (!conversations[conversationKey]) {
        conversations[conversationKey] = {
          userId: otherParticipantId,
          userName: msg.sender._id.toString() === teacherId ? msg.receiver.name : msg.sender.name,
          userImage: msg.sender._id.toString() === teacherId ? msg.receiver.image : msg.sender.image,
          courseId: msg.course._id,
          courseName: msg.course.name,
          lastMessage: msg.message,
          lastMessageTime: msg.createdAt,
          unreadCount: 0, // Will calculate below
        }
      }
    }

    // Calculate unread counts for each conversation
    const chatList = await Promise.all(
      Object.values(conversations).map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          course: conv.courseId,
          sender: conv.userId, // Messages sent by user
          receiver: teacherId, // Received by teacher
          isRead: false,
        })
        return { ...conv, unreadCount }
      }),
    )

    // Sort the final list by last message time
    chatList.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))

    res.status(200).json(chatList)
  } catch (error) {
    console.error("Error fetching teacher chat list:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// New: Mark messages as read
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { senderId, receiverId, courseId } = req.body

    await Message.updateMany(
      {
        sender: senderId,
        receiver: receiverId,
        course: courseId,
        isRead: false,
      },
      { $set: { isRead: true } },
    )

    res.status(200).json({ message: "Messages marked as read" })
  } catch (error) {
    console.error("Error marking messages as read:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}
