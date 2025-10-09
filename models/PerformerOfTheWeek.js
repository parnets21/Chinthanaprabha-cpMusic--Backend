/* const mongoose = require('mongoose');

const performerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    performance: {
        type: String,  // e.g., "Guitarist", "Dancer", etc.
        required: true
    },
    image: {
        type: String,  // URL or file path to image
        required: true
    },
    week: {
        type: String,  // e.g., "Week 1", "Week 2"
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});
 */



const mongoose = require("mongoose");

const performerSchema = new mongoose.Schema({
  image: { type: String, required: true }, // URL to the performer image
  category: { type: String, required: true }, // Name of the course
  title: { type: String, required: true },

  createdAt: { type: Date, default: Date.now }, // Timestamp
});
module.exports = mongoose.model('PerformerOfTheWeek', performerSchema);
