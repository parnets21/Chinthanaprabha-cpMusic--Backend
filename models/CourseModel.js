/* const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
 instructor: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true }, // URL to the course image
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }], // Array of lesson references
  price: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" }, // Reference to the category
});

module.exports = mongoose.model("Course", courseSchema); */























































const mongoose = require("mongoose")

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Changed instructor to reference TeacherLogin model
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: "TeacherLogin", required: true },
  description: { type: String, required: true }, // about guru
  image: { type: String, required: true }, // URL to the course image
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }], // Array of lesson references
  price: { type: Number, required: true },
  duration: { type: String, required: false }, // Course duration
  overview: { type: String, required: false }, // Course overview
})

module.exports = mongoose.model("Course", courseSchema)
