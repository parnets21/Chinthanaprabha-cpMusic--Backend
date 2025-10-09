const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "senderModel", // Dynamic reference based on senderModel field
    },
    senderModel: {
      type: String,
      required: true,
      enum: ["User", "TeacherLogin"], // Possible models for sender
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "receiverModel", // Dynamic reference based on receiverModel field
    },
    receiverModel: {
      type: String,
      required: true,
      enum: ["User", "TeacherLogin"], // Possible models for receiver
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }, // Adds createdAt and updatedAt fields
)

module.exports = mongoose.model("Message", messageSchema)
