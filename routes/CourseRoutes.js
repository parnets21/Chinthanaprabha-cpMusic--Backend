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
    fieldSize: 1024, // Allow uploadId field
  },
});

// Health check
router.get("/health", (req, res) => res.json({ message: "Course service running" }));

// File upload routes (for direct video and thumbnail uploads) with enhanced error handling
router.post("/upload-video", upload.fields([{ name: 'video', maxCount: 1 }, { name: 'uploadId', maxCount: 1 }]), async (req, res) => {
  try {
    const videoFile = req.files?.video?.[0];
    const uploadIdField = req.files?.uploadId?.[0];
    
    if (!videoFile) {
      return res.status(400).json({ message: "No video file provided" });
    }

    // Validate file type
    if (!videoFile.mimetype.startsWith('video/')) {
      return res.status(400).json({ message: "File must be a video" });
    }

    // Validate file size
    if (videoFile.size > 10 * 1024 * 1024 * 1024) {
      return res.status(400).json({ message: "File size exceeds 10GB limit" });
    }

    console.log(`📹 Starting upload: ${videoFile.originalname} (${Math.round(videoFile.size / 1024 / 1024)}MB)`);

    // Use frontend's upload ID or generate new one
    const uploadId = uploadIdField?.buffer?.toString() || `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📊 Using upload ID: ${uploadId}`);

    const result = await uploadFile(videoFile, "course-videos", {
      uploadId,
      timeout: 7200000, // 120 minutes (same as server)
      metadata: {
        fileName: videoFile.originalname,
        uploadTime: new Date().toISOString()
      }
    });

    console.log(`✅ Upload completed: ${videoFile.originalname}`);
    res.status(200).json({ location: result.location });
  } catch (error) {
    console.error("Video upload error:", error);
    res.status(500).json({ message: "Error uploading video", error: error.message });
  }
});

router.post("/upload-thumbnail", upload.single("thumbnail"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No thumbnail file provided" });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: "File must be an image" });
    }

    // Validate file size (images should be smaller)
    if (req.file.size > 50 * 1024 * 1024) { // 50MB limit for images
      return res.status(400).json({ message: "Image size exceeds 50MB limit" });
    }

    const result = await uploadFile(req.file, "thumbnails");
    res.status(200).json({ location: result.location });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
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