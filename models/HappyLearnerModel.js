const mongoose = require('mongoose');

const happyLearnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    image: {
        type: String,  // URL or file path to image
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('HappyLearner', happyLearnerSchema);
