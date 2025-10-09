const express = require("express")
const router = express.Router()
const teacherLoginController = require("../controllers/teacherLoginController")
const multer = require("multer")

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profile")
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname)
  },
})

const upload = multer();


// Register teacher
router.post("/register", upload.single("image"), teacherLoginController.registerTeacherLogin)

// Login teacher
router.post("/login", teacherLoginController.loginTeacher)

// Get teacher by ID
router.get("/teacher/:id", teacherLoginController.getTeacherById)

// Update teacher profile
router.put("/teacher/:id", upload.single("image"), teacherLoginController.updateTeacherProfile)

// Get all teachers
router.get("/teachers", teacherLoginController.getAllTeachers)

// Delete teacher
router.delete("/teacher/:id", teacherLoginController.deleteTeacher)

// Update FCM token
router.put("/teacher/:teacherId/fcm-token", teacherLoginController.updateFcmToken)

module.exports = router
