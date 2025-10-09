// models/AllPerformer.js
const mongoose = require("mongoose");

const allPerformerSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Name of the performer
    videoUrl: { type: String, required: true }, // URL to the performer's video
    category: { type: String, required: true }, // Category of the performer
    likes: { type: Number, default: 0 }, // Number of likes
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users who liked this performer
    comments: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
        },
    ],
   

    createdAt: { type: Date, default: Date.now }, // Timestamp
    
    
});

module.exports = mongoose.model('AllPerformer', allPerformerSchema);