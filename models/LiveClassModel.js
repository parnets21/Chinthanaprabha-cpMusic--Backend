const mongoose = require('mongoose');

const LiveClassSchema = new mongoose.Schema({
    title: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherLogin', required: true }, 
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    meetLink: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Add this field
}, { timestamps: true });
module.exports = mongoose.model('LiveClass', LiveClassSchema);