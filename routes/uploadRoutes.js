const express = require("express");
const multer = require("multer");
const { uploadFile, deleteFile } = require("../middleware/aws");

const router = express.Router();

// Memory storage for uploads (no disk storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit
    fieldSize: 10 * 1024 * 1024 * 1024,
    fieldNameSize: 100,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    console.log("Multer file filter:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    if (!file.mimetype.match(/^(video|image)\//)) {
      return cb(new Error("File must be a video or image"), false);
    }
    cb(null, true);
  },
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ message: "Upload service is running", timestamp: new Date().toISOString() });
});

// Video upload endpoint (up to 10GB)
router.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file provided" });
    }
    if (!req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({ message: "File must be a video" });
    }

    console.log(`📹 Uploading video: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    // Set response timeout for large files
    res.setTimeout(600 * 1000); // 10 minutes

    // Progress tracking callback
    const progressCallback = (progress) => {
      console.log(
        `📊 Progress: ${progress.percentage}% (${progress.uploadedMB}/${progress.totalMB}MB, ${progress.currentSpeed}MB/s, ETA: ${progress.eta}s)`
      );
    };

    const result = await uploadFile(
      {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      "course-videos",
      {
        progressCallback,
        metadata: { type: "video", uploadTime: new Date().toISOString() },
      }
    );

    res.status(200).json({
      message: "Video uploaded successfully",
      location: result.location,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      metadata: result.metadata,
    });
  } catch (error) {
    const errorResponse = mapErrorToResponse(error);
    res.status(errorResponse.status).json({
      message: errorResponse.message,
      error: errorResponse.error,
    });
  }
});

// Thumbnail upload endpoint
router.post("/upload-thumbnail", upload.single("thumbnail"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No thumbnail file provided" });
    }
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "File must be an image" });
    }

    console.log(`🖼️ Uploading thumbnail: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    const result = await uploadFile(
      {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      "thumbnails",
      { metadata: { type: "thumbnail", uploadTime: new Date().toISOString() } }
    );

    res.status(200).json({
      message: "Thumbnail uploaded successfully",
      location: result.location,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      metadata: result.metadata,
    });
  } catch (error) {
    const errorResponse = mapErrorToResponse(error);
    res.status(errorResponse.status).json({
      message: errorResponse.message,
      error: errorResponse.error,
    });
  }
});

// Error mapping for AWS S3 errors
const mapErrorToResponse = (error) => {
  const errorMap = {
    ECONNRESET: { status: 500, message: "Connection lost during upload", error: "Please try again" },
    ETIMEDOUT: { status: 500, message: "Upload timeout", error: "File too large or connection too slow" },
    NoSuchBucket: { status: 500, message: "Storage error", error: "AWS S3 bucket not found" },
    InvalidAccessKeyId: { status: 500, message: "AWS configuration error", error: "Invalid AWS credentials" },
    SignatureDoesNotMatch: { status: 500, message: "AWS authentication error", error: "AWS credentials mismatch" },
  };

  if (error.message?.includes("timeout")) {
    return { status: 500, message: "Upload timeout", error: "Please check your connection and try again" };
  }
  if (error.message?.includes("File not found")) {
    return { status: 500, message: "File processing error", error: "Temporary file could not be created" };
  }
  if (error.message?.includes("File exceeds")) {
    return { status: 400, message: "File too large", error: "File exceeds 10GB limit" };
  }

  return (
    errorMap[error.code] ||
    errorMap[error.name] || {
      status: 500,
      message: "Upload failed",
      error: error.message,
    }
  );
};

module.exports = router;