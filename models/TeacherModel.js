const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    subjectImage: {
        type: String, // Path to the image file
        required: true,
    },
    thumbnail: {
        type: String, // Path to the thumbnail image file for video
        required: false,
    },
    videoUrl: {
        type: String, // Path to the video file
        required: true,
    },
    likes: [
        {
            userId: String, // User who liked the video
            videoId: String, // ID of the video being liked
        },
    ],
    comments: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
            text: { type: String, required: true }, // Comment text
            createdAt: { type: Date, default: Date.now }, // Timestamp
        },
    ],
},{ timestamps: true });

module.exports = mongoose.model("Teacher", TeacherSchema);