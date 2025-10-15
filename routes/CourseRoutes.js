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
    fieldNameSize: 100, // Allow longer field names
  },
});

// Health check
router.get("/health", (req, res) => res.json({ message: "Course service running" }));

// Test upload endpoint
router.get("/upload-test", (req, res) => {
  console.log("📹 Upload test endpoint hit");
  res.json({ message: "Upload endpoint is working", timestamp: new Date().toISOString() });
});

// File upload routes (for direct video and thumbnail uploads) with enhanced error handling
router.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    console.log(`📹 Upload request received: ${req.file ? req.file.originalname : 'No file'}`);
    console.log(`📹 Request body:`, req.body);
    console.log(`📹 Upload ID from body:`, req.body.uploadId);
    
    if (!req.file) {
      console.log(`❌ No file provided in request`);
      return res.status(400).json({ message: "No video file provided" });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('video/')) {
      console.log(`❌ Invalid file type: ${req.file.mimetype}`);
      return res.status(400).json({ message: "File must be a video" });
    }

    // Validate file size
    if (req.file.size > 10 * 1024 * 1024 * 1024) {
      console.log(`❌ File too large: ${req.file.size} bytes`);
      return res.status(400).json({ message: "File size exceeds 10GB limit" });
    }

    console.log(`📹 Starting upload: ${req.file.originalname} (${Math.round(req.file.size / 1024 / 1024)}MB)`);

    // Use frontend's upload ID from body or generate new one
    const uploadId = req.body.uploadId || `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📊 Using upload ID: ${uploadId}`);

    const result = await uploadFile(req.file, "course-videos", {
      uploadId,
      timeout: 7200000, // 120 minutes (same as server)
      metadata: {
        fileName: req.file.originalname,
        uploadTime: new Date().toISOString()
      }
    });

    console.log(`✅ Upload completed: ${req.file.originalname}`);
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