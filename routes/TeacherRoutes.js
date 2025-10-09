// routes/TeacherRoutes.js
const express = require("express");
const router = express.Router();
const TeacherController = require("../controllers/TeacherController");
const upload = require("../middleware/multerConfig");

// Create a new teacher
router.post("/teachers", upload.fields([
    { name: 'subjectImage', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'videoUrl', maxCount: 1 }
]), TeacherController.createTeacher);

// Get all teachers
router.get("/teachers", TeacherController.getAllTeachers);

// Get a single teacher by ID
router.get("/teachers/:id", TeacherController.getTeacherById);

// Update a teacher by ID
router.put("/teachers/:id", upload.fields([
    { name: 'subjectImage', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'videoUrl', maxCount: 1 }
]), TeacherController.updateTeacher);

// Delete a teacher by ID
router.delete("/teachers/:id", TeacherController.deleteTeacher);

router.post("/teachers/:id/like", TeacherController.likeTeacher);

router.post("/teachers/:id/comments", TeacherController.addComment);

// Get all comments for a teacher
router.get("/teachers/:id/comments", TeacherController.getComments);

// Delete a comment
router.delete("/teachers/:id/comments/:commentId", TeacherController.deleteComment);

module.exports = router;