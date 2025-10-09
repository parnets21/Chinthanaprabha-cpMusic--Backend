// models/UserProgress.js

const mongoose = require("mongoose")

const ProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  lessons: [
    {
      lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
      completed: { type: Boolean, default: false },
      videoUploaded: { type: Boolean, default: false },
      videoApproved: { type: Boolean, default: false },
      rating: { type: Number, default: 0 },
      feedback: { type: String, default: "" }, // Added feedback field
    },
  ],
  currentLessonIndex: { type: Number, default: 0 },
})

module.exports = mongoose.model("Progres", ProgressSchema)
