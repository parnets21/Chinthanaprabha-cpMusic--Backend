const mongoose = require("mongoose")

const practiseVideoSchema = new mongoose.Schema({
  videoUrl: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  rating: { type: Number, default: 0 },
  feedback: { type: String, default: "" }, // Added feedback field
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // NEW FIELDS FOR LIKES AND COMMENTS FUNCTIONALITY
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  comments: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      comment: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model("PractiseVideo", practiseVideoSchema)
