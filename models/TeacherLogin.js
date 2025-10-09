const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const teacherLoginSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String, // Store the image URL or file path
    default: "", // Default value is an empty string
  },
  fcmToken: {
    // Add FCM token field
    type: String,
    default: null,
  },
})

// Hash password before saving
teacherLoginSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next()
  }
  this.password = await bcrypt.hash(this.password, 10)
})

// Compare password
teacherLoginSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

module.exports = mongoose.model("TeacherLogin", teacherLoginSchema)
