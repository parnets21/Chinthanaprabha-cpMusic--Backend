const express = require("express")
const router = express.Router()
const ChatController = require("../controllers/ChatController")

// NOTE: sendMessage is now handled by Socket.IO directly in server.js
// router.post("/chat/send", ChatController.sendMessage)

// Route to get chat history between a user and a teacher for a specific course
router.get("/chat/history/:userId/:teacherId/:courseId", ChatController.getChatHistory)

// Route to get a single teacher's details (for chat screen header)
router.get("/chat/teacher/:teacherId", ChatController.getTeacherDetails)

// Route to get a single user's details (for teacher chat screen header)
router.get("/chat/user/:userId", ChatController.getUserDetails)

// Route to get list of chats for a user
router.get("/chat/user-list/:userId", ChatController.getUserChatList)

// Route to get list of chats for a teacher
router.get("/chat/teacher-list/:teacherId", ChatController.getTeacherChatList)

// Route to mark messages as read
router.post("/chat/mark-read", ChatController.markMessagesAsRead)

module.exports = router
