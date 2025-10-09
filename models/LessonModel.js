/* const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
    name: { type: String, required: true },
    videoUrls: [{ type: String, required: true }], // Array of video URLs
    duration: { type: Number, required: true }, // Duration in minutes
   locked: { type: Boolean, default: true }, // Added locked field
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, // Reference to the course
});

module.exports = mongoose.model("Lesson", lessonSchema);
 */












































/* const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  name: { type: String, required: false },
  lessonNumber: { type: String, required: true },
  lessonIntro: { type: String, required: true },
  videoUrls: [{ type: String, required: true }], // Array of video URLs
  duration: { type: Number, required: false }, // Duration in minutes
  locked: { type: Boolean, default: true }, // Added locked field
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, // Reference to the course
});

module.exports = mongoose.model("Lesson", lessonSchema); */



const mongoose = require("mongoose")

const lessonSchema = new mongoose.Schema({
  name: { type: String, required: false },
  lessonNumber: { type: String, required: true },
  lessonIntro: { type: String, required: true },
  videoUrls: [{ type: String, required: true }], // Array of video URLs
  thumbnail: { type: String, required: false }, // Thumbnail image URL
  duration: { type: Number, required: false }, // Duration in minutes
  locked: { type: Boolean, default: true }, // Added locked field
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, // Reference to the course
})

module.exports = mongoose.model("Lesson", lessonSchema)
