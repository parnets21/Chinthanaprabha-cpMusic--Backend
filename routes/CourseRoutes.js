const express = require("express");
const multer = require("multer");
const CourseController = require("../controllers/CourseController");
const { uploadFile, multifileUpload } = require("../middleware/aws");

const router = express.Router();

// Initialize multer with memory storage and file size limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit for videos
    files: 10, // Max 10 files for lesson videos
  },
});

// Health check
router.get("/health", (req, res) => res.json({ message: "Course service running" }));

// File upload routes (for direct video and thumbnail uploads)
router.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file provided" });
    }
    const result = await uploadFile(req.file, "course-videos");
    res.status(200).json({ location: result.location });
  } catch (error) {
    res.status(500).json({ message: "Error uploading video", error: error.message });
  }
});

router.post("/upload-thumbnail", upload.single("thumbnail"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No thumbnail file provided" });
    }
    const result = await uploadFile(req.file, "thumbnails");
    res.status(200).json({ location: result.location });
  } catch (error) {
    res.status(500).json({ message: "Error uploading thumbnail", error: error.message });
  }
});

// Course routes
router.get("/courses", CourseController.getAllCourses);
router.get("/courses/:id", CourseController.getCourseById);
router.post(
  "/courses",
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  CourseController.createCourse
);
router.put(
  "/courses/:id",
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  CourseController.updateCourse
);
router.delete("/courses/:id", CourseController.deleteCourse);

// Lesson routes
router.post(
  "/courses/:courseId/lessons",
  upload.fields([
    { name: "video", maxCount: 10 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  CourseController.addLesson
);
router.put(
  "/lessons/:lessonId",
  upload.fields([
    { name: "video", maxCount: 10 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  CourseController.updateLesson
);
router.delete("/lessons/:lessonId", CourseController.deleteLesson);

module.exports = router;