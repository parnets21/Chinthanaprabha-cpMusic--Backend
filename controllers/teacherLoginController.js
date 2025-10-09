const { uploadFile2 } = require("../middleware/aws")

const TeacherLogin = require("../models/TeacherLogin")
const bcrypt = require("bcryptjs")

// Register a new teacher
exports.registerTeacherLogin = async (req, res) => {
  try {
    const { name, mobileNumber, password, fcmToken } = req.body
    const image = req.file ? await uploadFile2(req.file, "category") : "" // Get the uploaded image path

    // Debugging: Log the uploaded file path
    console.log("Uploaded Image Path:", image)

    // Check if teacher already exists
    const existingTeacherLogin = await TeacherLogin.findOne({ mobileNumber })
    if (existingTeacherLogin) {
      return res.status(400).json({ message: "Teacher login already exists" })
    }

    // Create new teacher with FCM token if provided
    const teacherLogin = await TeacherLogin.create({
      name,
      mobileNumber,
      password,
      image,
      fcmToken: fcmToken || null,
    })

    // Debugging: Log the created teacher
    console.log("Created Teacher:", teacherLogin)

    // Return teacher ID
    res.status(201).json({ id: teacherLogin._id })
  } catch (error) {
    console.error("Error in registerTeacherLogin:", error)
    res.status(500).json({ message: error.message })
  }
}

// Login teacher
exports.loginTeacher = async (req, res) => {
  try {
    const { mobileNumber, password, fcmToken } = req.body

    // Check if teacher exists
    const teacherLogin = await TeacherLogin.findOne({ mobileNumber })
    if (!teacherLogin) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Compare password
    const isMatch = await teacherLogin.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Update FCM token if provided
    if (fcmToken) {
      teacherLogin.fcmToken = fcmToken
      await teacherLogin.save()
    }

    // Return teacher ID
    res.status(200).json({ id: teacherLogin._id })
  } catch (error) {
    console.error("Error in loginTeacher:", error)
    res.status(500).json({ message: error.message })
  }
}

// Update FCM token
exports.updateFcmToken = async (req, res) => {
  try {
    const { teacherId } = req.params
    const { fcmToken } = req.body

    if (!fcmToken) {
      return res.status(400).json({ message: "FCM token is required" })
    }

    const teacher = await TeacherLogin.findById(teacherId)
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" })
    }

    teacher.fcmToken = fcmToken
    await teacher.save()

    res.status(200).json({ message: "FCM token updated successfully" })
  } catch (error) {
    console.error("Error updating FCM token:", error)
    res.status(500).json({ message: "Error updating FCM token" })
  }
}

// Get teacher by ID
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await TeacherLogin.findById(req.params.id).select("name mobileNumber image fcmToken")

    // Debugging: Log the fetched teacher
    console.log("Fetched Teacher:", teacher)

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" })
    }

    res.status(200).json(teacher)
  } catch (error) {
    console.error("Error in getTeacherById:", error)
    res.status(500).json({ message: error.message })
  }
}

// Update teacher profile
exports.updateTeacherProfile = async (req, res) => {
  try {
    const { id } = req.params
    const { name, mobileNumber, password, fcmToken } = req.body
    const image = req.file ? await uploadFile2(req.file, "category") : "" // Get the uploaded image path

    // Debugging: Log the updated image path
    console.log("Updated Image Path:", image)

    // Find the teacher by ID
    const teacher = await TeacherLogin.findById(id)
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" })
    }

    // Update teacher details
    teacher.name = name || teacher.name
    teacher.mobileNumber = mobileNumber || teacher.mobileNumber
    teacher.image = image || teacher.image
    if (fcmToken) {
      teacher.fcmToken = fcmToken
    }

    // FIXED: Only set password if provided - let the pre-save middleware handle hashing
    if (password) {
      teacher.password = password // Don't hash here, let the pre-save middleware do it
    }

    // Save the updated teacher (pre-save middleware will hash password if modified)
    await teacher.save()

    // Debugging: Log the updated teacher
    console.log("Updated Teacher:", teacher)

    // Return the updated teacher
    res.status(200).json(teacher)
  } catch (error) {
    console.error("Error in updateTeacherProfile:", error)
    res.status(500).json({ message: error.message })
  }
}

// Get all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    // Fetch all teachers from the database
    const teachers = await TeacherLogin.find().select("name mobileNumber image")

    // Debugging: Log the fetched teachers
    console.log("Fetched Teachers:", teachers)

    // Return the list of teachers
    res.status(200).json(teachers)
  } catch (error) {
    console.error("Error in getAllTeachers:", error)
    res.status(500).json({ message: error.message })
  }
}

exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params
    const deletedTeacher = await TeacherLogin.findByIdAndDelete(id)
    if (!deletedTeacher) {
      return res.status(404).json({ message: "Teacher not found" })
    }
    res.status(200).json({ message: "Teacher deleted successfully" })
  } catch (error) {
    console.error("Error in deleteTeacher:", error)
    res.status(500).json({ message: error.message })
  }
}
