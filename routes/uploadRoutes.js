const express = require("express");
const multer = require("multer");
const { uploadFile, deleteFile, generatePresignedUrl, generateMultipartPresignedUrl, completeMultipartUpload, abortMultipartUpload } = require("../middleware/aws");

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

    const result = await uploadFile(
      {
        buffer: req.file.buffer,
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

// Generate presigned URL for direct S3 upload
router.post("/presigned-url", async (req, res) => {
  try {
    const { fileName, fileType, fileSize, bucketName = "course-videos" } = req.body;
    
    if (!fileName || !fileType || !fileSize) {
      return res.status(400).json({ 
        message: "Missing required fields: fileName, fileType, fileSize" 
      });
    }
    
    if (fileSize > 10 * 1024 * 1024 * 1024) {
      return res.status(400).json({ 
        message: "File size exceeds 10GB limit" 
      });
    }
    
    console.log(`🔗 Generating presigned URL for: ${fileName} (${Math.round(fileSize / 1024 / 1024)}MB)`);
    
    const result = await generatePresignedUrl(fileName, fileType, fileSize, bucketName);
    
    res.status(200).json(result);
  } catch (error) {
    console.error(`❌ Error generating presigned URL: ${error.message}`);
    res.status(500).json({
      message: "Failed to generate presigned URL",
      error: error.message
    });
  }
});

// Generate presigned URL for multipart upload part
router.post("/presigned-url-multipart", async (req, res) => {
  try {
    const { bucket, key, uploadId, partNumber } = req.body;
    
    if (!bucket || !key || !uploadId || !partNumber) {
      return res.status(400).json({ 
        message: "Missing required fields: bucket, key, uploadId, partNumber" 
      });
    }
    
    const presignedUrl = await generateMultipartPresignedUrl(bucket, key, uploadId, partNumber);
    
    res.status(200).json({ presignedUrl });
  } catch (error) {
    console.error(`❌ Error generating multipart presigned URL: ${error.message}`);
    res.status(500).json({
      message: "Failed to generate multipart presigned URL",
      error: error.message
    });
  }
});

// Complete multipart upload
router.post("/complete-multipart", async (req, res) => {
  try {
    const { bucket, key, uploadId, parts } = req.body;
    
    if (!bucket || !key || !uploadId || !parts) {
      return res.status(400).json({ 
        message: "Missing required fields: bucket, key, uploadId, parts" 
      });
    }
    
    const result = await completeMultipartUpload(bucket, key, uploadId, parts);
    
    res.status(200).json({
      message: "Multipart upload completed successfully",
      location: result.Location,
      etag: result.ETag
    });
  } catch (error) {
    console.error(`❌ Error completing multipart upload: ${error.message}`);
    res.status(500).json({
      message: "Failed to complete multipart upload",
      error: error.message
    });
  }
});

// Abort multipart upload
router.post("/abort-multipart", async (req, res) => {
  try {
    const { bucket, key, uploadId } = req.body;
    
    if (!bucket || !key || !uploadId) {
      return res.status(400).json({ 
        message: "Missing required fields: bucket, key, uploadId" 
      });
    }
    
    await abortMultipartUpload(bucket, key, uploadId);
    
    res.status(200).json({
      message: "Multipart upload aborted successfully"
    });
  } catch (error) {
    console.error(`❌ Error aborting multipart upload: ${error.message}`);
    res.status(500).json({
      message: "Failed to abort multipart upload",
      error: error.message
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