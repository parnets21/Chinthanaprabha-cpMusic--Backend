// Assuming this is your main server file
const express = require("express")
const mongoose = require("mongoose")
const dotenv = require("dotenv")
const cors = require("cors")
const helmet = require("helmet") // Import Helmet
const morgon = require("morgan")
const path = require("path")
const http = require("http") // Import http module
const { Server } = require("socket.io") // Import Server from socket.io
const { sendChatMessageNotification } = require("./controllers/notificationController")

// Load environment variables from .env file
dotenv.config()

// Initialize Express app
const app = express()
const server = http.createServer(app) // Create HTTP server from Express app
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for development, restrict in production
    methods: ["GET", "POST"],
  },
})

// Middleware to parse JSON
app.use(express.json({ limit: '10gb' }));
app.use(express.urlencoded({ extended: true, limit: '10gb' }));

// Set timeout for large file uploads (60 minutes)
server.timeout = 60 * 60 * 1000; // 60 minutes


// Enable CORS for all routes
app.use(cors())

app.use(morgon("dev"))
// Log AWS env presence at startup (no secrets)
try {
  const { AWS_REGION, AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env
  console.log("AWS env present:", {
    AWS_REGION: !!AWS_REGION,
    AWS_S3_BUCKET_NAME: !!AWS_S3_BUCKET_NAME,
    AWS_ACCESS_KEY_ID: !!AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: !!AWS_SECRET_ACCESS_KEY,
  })
} catch (_) {}
// Use Helmet for added security headers
/* app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "img-src": [
          "'self'",
          "data:",
          "http://localhost:3000",
          "http://localhost:3001",
        ],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
); */

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("Error: ", err))

// Import your routes
const userRoutes = require("./routes/UserRoutes")
const CourseRoutes = require("./routes/CourseRoutes")
const HappyLearnersRoutes = require("./routes/HappyLearnersRoutes")
const PerformerOfTheWeekRoutes = require("./routes/PerformerOfTheWeekRoutes")
const practiseVideo = require("./routes/practiseVideo")
const paymentRoutes = require("./routes/paymentRoutes")
const CategoryRoutes = require("./routes/CategoryRoutes")
const progress = require("./routes/progress")
const adminRoutes = require("./routes/adminRoutes")
const TeacherRoutes = require("./routes/TeacherRoutes")
const allPerformerRoutes = require("./routes/allPerformerRoutes")
const teacherLoginRoutes = require("./routes/teacherLoginRoutes")
const liveClassRoutes = require("./routes/liveClassRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const shopRoutes = require("./routes/shopRoutes")
const instrumentRoutes = require("./routes/instrumentRoutes")
const contactRoutes = require("./routes/contactRoutes.js")
const SubcategoryRoutes = require("./routes/SubcategoryRoutes")
const OrderRoutes = require("./routes/OrderRoutes")
const performerRoutes = require("./routes/performerRoutes")
const OfferRoutes = require("./routes/OfferRoutes")
const chatRoutes = require("./routes/ChatRoutes") // Your new chat routes
const reportRoutes = require("./routes/reportRoutes")
const uploadRoutes = require("./routes/uploadRoutes")
const presignRoutes = require("./routes/presignRoutes")
const streamRoutes = require("./routes/streamRoutes")
const musicQuoteRoutes = require("./routes/musicQuoteRoutes")

// Use Routes
app.use("/chinthanaprabha/discount", OfferRoutes)
app.use("/chinthanaprabha/user-auth", userRoutes)
app.use("/chinthanaprabha/courses-lessons", CourseRoutes)
app.use("/chinthanaprabha/happy", HappyLearnersRoutes)
app.use("/chinthanaprabha/performer", PerformerOfTheWeekRoutes)
app.use("/chinthanaprabha/performers", performerRoutes) // Add performerRoutes for top-performer endpoint
app.use("/chinthanaprabha/practise", practiseVideo)
app.use("/chinthanaprabha/payment", paymentRoutes)
app.use("/chinthanaprabha/progress-user", progress)
app.use("/chinthanaprabha/admin-auth", adminRoutes)
app.use("/chinthanaprabha/teacher", TeacherRoutes)
app.use("/chinthanaprabha/allperformer", allPerformerRoutes)
app.use("/chinthanaprabha/teacher-auth", teacherLoginRoutes)
app.use("/chinthanaprabha/live", liveClassRoutes)
app.use("/chinthanaprabha", notificationRoutes)
app.use("/api/shop", shopRoutes)
app.use("/api/contacts", contactRoutes)
app.use("/chinthanaprabha", chatRoutes) // Add chat routes here
app.use("/chinthanaprabha", uploadRoutes)
app.use("/chinthanaprabha", presignRoutes)
app.use("/chinthanaprabha", streamRoutes)
app.use("/api/musicQuote", musicQuoteRoutes)

//musci-store routes
app.use("/api/banners", require("./routes/bannerRoutes"))
app.use("/api/category", CategoryRoutes)
app.use("/api/subcategory", SubcategoryRoutes)
app.use("/api/instrument", instrumentRoutes)
app.use("/api/order", OrderRoutes)
app.use("/api/performance", require("./routes/performanceRoutes"))
app.use("/api/audienceReview", require("./routes/audienceReviewRoutes"))

app.use('/chinthanaprabha/reports', reportRoutes)

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)

  // Join a room based on a consistent room name
  socket.on("joinRoom", ({ roomName }) => {
    socket.join(roomName)
    console.log(`User ${socket.id} joined room: ${roomName}`)
  })

  // Handle sending messages
  socket.on("sendMessage", async (messageData) => {
    try {
      // Save message to DB (re-using your existing controller logic)
      const Message = require("./models/MessageModel") // Ensure Message model is accessible
      const newMessage = new Message({
        sender: messageData.senderId,
        senderModel: messageData.senderModel,
        receiver: messageData.receiverId,
        receiverModel: messageData.receiverModel,
        course: messageData.courseId,
        message: messageData.message,
      })
      await newMessage.save()

      // Populate sender/receiver names and images for real-time display
      await newMessage.populate("sender", "name image")
      await newMessage.populate("receiver", "name image")

      // Convert to plain object to add custom properties like tempId
      const messageToEmit = newMessage.toObject()
      if (messageData.tempId) {
        messageToEmit.tempId = messageData.tempId // Include tempId for client-side reconciliation
      }

      // Emit message to the specific room using the provided roomName
      const roomName = messageData.roomName
      io.to(roomName).emit("receiveMessage", messageToEmit)
      console.log(`Message sent to room ${roomName}:`, messageToEmit.message)

      // Call the new notification function after saving and emitting the message
      await sendChatMessageNotification({
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        courseId: messageData.courseId,
        messageContent: messageData.message,
        senderModel: messageData.senderModel,
        receiverModel: messageData.receiverModel,
      })
    } catch (error) {
      console.error("Error saving or emitting message:", error)
      socket.emit("messageError", { message: "Failed to send message" })
    }
  })

     socket.on("disconnect", () => {
     console.log("User disconnected:", socket.id)
  })
})

// Serve static files from the "build" directory (assuming your frontend build)
app.use(express.static(path.join(__dirname, "build")))

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Redirect all other requests to the index.html file for client-side routing
app.get("*", (req, res) => {
  return res.sendFile(path.join(__dirname, "build", "index.html"))
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
