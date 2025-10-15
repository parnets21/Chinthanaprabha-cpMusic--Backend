const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadFile, deleteFile } = require("../middleware/aws");

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "..", "uploads", "temp");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Disk storage for large files to prevent memory overflow
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer with disk storage for large files
const upload = multer({
  storage: storage,
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

// Video upload endpoint (up to 10GB) - Now using disk storage for large files
router.post("/upload-video", upload.single("video"), async (req, res) => {
  let tempFilePath = null;
  
  try {
    console.log(`📹 Upload request received: ${req.file ? req.file.originalname : 'No file'}`);
    console.log(`📹 Request body:`, req.body);
    console.log(`📹 Upload ID from body:`, req.body.uploadId);
    
    if (!req.file) {
      console.log(`❌ No file provided in request`);
      return res.status(400).json({ message: "No video file provided" });
    }
    if (!req.file.mimetype.startsWith("video/")) {
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

    // Set response timeout for large files
    res.setTimeout(7200000); // 120 minutes (same as server)

    // Progress tracking callback
    const progressCallback = (progress) => {
      console.log(
        `📊 Progress: ${progress.percentage}% (${progress.uploadedMB}/${progress.totalMB}MB, ${progress.currentSpeed}MB/s, ETA: ${progress.eta}s)`
      );
    };

    // Store temp file path for cleanup
    tempFilePath = req.file.path;

    const result = await uploadFile(
      {
        path: req.file.path, // Use file path instead of buffer for streaming
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      "course-videos",
      {
        uploadId,
        timeout: 7200000, // 120 minutes (same as server)
        progressCallback,
        metadata: { 
          type: "video", 
          uploadTime: new Date().toISOString(),
          fileName: req.file.originalname,
          uploadId: uploadId
        },
      }
    );

    console.log(`✅ Upload completed: ${req.file.originalname}`);
    res.status(200).json({ location: result.location });
  } catch (error) {
    const errorResponse = mapErrorToResponse(error);
    res.status(errorResponse.status).json({
      message: errorResponse.message,
      error: errorResponse.error,
    });
  } finally {
    // Clean up temporary file after upload (success or failure)
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🧹 Cleaned up temp file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error(`❌ Error cleaning up temp file: ${cleanupError.message}`);
      }
    }
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