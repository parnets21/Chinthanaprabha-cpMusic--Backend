const express = require("express")
const fs = require("fs")
const path = require("path")
const multer = require("multer")
const { uploadFile2, uploadDirectToS3, uploadChunkToS3, completeMultipartUpload, abortMultipartUpload } = require("../middleware/aws")

const router = express.Router()

// Store multipart upload sessions in memory (in production, use Redis or database)
const multipartSessions = new Map()

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ message: "Upload service is running", timestamp: new Date().toISOString() });
});

// Memory storage for chunks - no local disk storage needed
const upload = multer({ 
  storage: multer.memoryStorage(), // Use memory storage for direct S3 upload
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB per chunk
    fieldSize: 100 * 1024 * 1024,
    fieldNameSize: 100,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    console.log("Multer file filter:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    cb(null, true);
  }
})

// Test endpoint to verify multer is working
router.post("/test-upload", (req, res, next) => {
  console.log("Test endpoint hit - before multer");
  upload.single("chunk")(req, res, (err) => {
    if (err) {
      console.error("Test multer error:", err);
      return res.status(400).json({ message: "Test multer error", error: err.message });
    }
    console.log("Test upload received:", {
      body: req.body,
      file: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });
    res.json({ message: "Test upload successful", received: !!req.file });
  });
});

// All uploads now use memory storage - NO LOCAL FILES

// Memory storage for direct S3 upload (no local files)
const memoryUpload = multer({ 
  storage: multer.memoryStorage(), // Use memory storage for direct S3 upload
  limits: { 
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB
    fieldSize: 10 * 1024 * 1024 * 1024,
    fieldNameSize: 100,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    console.log("Multer file filter:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Validate file type
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('File must be a video'), false);
    }
    
    cb(null, true);
  }
})

// Disk storage for large files (fallback)


const regularUpload = multer({ 
  storage: multer.memoryStorage(), // Use memory storage - NO LOCAL FILES
  limits: { 
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB
    fieldSize: 10 * 1024 * 1024 * 1024,
    fieldNameSize: 100,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    console.log("Multer file filter:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Validate file type
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('File must be a video'), false);
    }
    
    cb(null, true);
  }
})

// No longer needed - using memory storage only

// POST /upload - accepts a single chunk and uploads directly to S3
// Expects multipart/form-data with fields: fileId, chunkIndex, totalChunks, fileName, and file field name: "chunk"
router.post("/upload", (req, res, next) => {
  console.log("Upload endpoint hit - before multer middleware");
  console.log("Request headers:", req.headers);
  console.log("Request body keys:", Object.keys(req.body || {}));
  console.log("Content-Type:", req.headers['content-type']);
  console.log("Content-Length:", req.headers['content-length']);
  
  upload.single("chunk")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      console.error("Multer error details:", {
        code: err.code,
        field: err.field,
        message: err.message,
        stack: err.stack
      });
      return res.status(400).json({ message: "File upload error", error: err.message });
    }
    console.log("Multer middleware passed successfully");
    next();
  });
}, async (req, res) => {
  try {
    console.log("Chunk upload request received:", {
      fileId: req.body.fileId,
      chunkIndex: req.body.chunkIndex,
      totalChunks: req.body.totalChunks,
      fileName: req.body.fileName,
      hasFile: !!req.file,
      fileSize: req.file?.size,
      bodyKeys: Object.keys(req.body),
      fileKeys: req.file ? Object.keys(req.file) : null
    });

    const { fileId, chunkIndex, totalChunks, fileName, fileSize } = req.body
    if (!fileId || typeof chunkIndex === "undefined" || !totalChunks || !fileName) {
      console.error("Missing required fields:", { fileId, chunkIndex, totalChunks, fileName });
      return res.status(400).json({ message: "Missing required fields" })
    }

    if (!req.file) {
      console.error("No file received in chunk upload");
      return res.status(400).json({ message: "No file received" })
    }

    const idx = Number(chunkIndex)
    const total = Number(totalChunks)
    const partNumber = idx + 1 // S3 part numbers start from 1

    // Initialize multipart upload session if this is the first chunk
    if (idx === 0) {
      console.log(`Initializing multipart upload for ${fileName}`);
      
      // Sanitize filename
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
      const s3Key = `${Date.now()}_${safeName}`
      
      try {
        const uploadSession = await initializeMultipartUpload(s3Key, req.file.mimetype || 'video/mp4', "course-videos");
        
        // Store session in memory
        multipartSessions.set(fileId, {
          ...uploadSession,
          fileName: fileName,
          totalChunks: total,
          uploadedParts: [],
          createdAt: Date.now()
        });
        
        console.log(`Multipart upload initialized: ${uploadSession.uploadId}`);
      } catch (initError) {
        console.error("Failed to initialize multipart upload:", initError);
        return res.status(500).json({ message: "Failed to initialize upload", error: initError.message });
      }
    }

    // Get the upload session
    const uploadSession = multipartSessions.get(fileId);
    if (!uploadSession) {
      console.error(`Upload session not found for fileId: ${fileId}`);
      return res.status(400).json({ message: "Upload session not found" });
    }

    // Upload chunk directly to S3
    console.log(`Uploading chunk ${partNumber}/${total} to S3`);
    
    try {
      const part = await uploadChunkToS3(uploadSession, partNumber, req.file.buffer);
      
      // Store the uploaded part info
      uploadSession.uploadedParts.push(part);
      
      console.log(`Successfully uploaded chunk ${partNumber}/${total}`);
      
      // If this is not the last chunk, acknowledge
      if (idx < total - 1) {
        return res.status(200).json({ 
          received: true, 
          isLastChunk: false,
          uploadedParts: uploadSession.uploadedParts.length,
          totalParts: total
        });
      }

      // Last chunk received: complete multipart upload
      console.log(`Completing multipart upload for ${fileName}`);
      
      try {
        const s3Url = await completeMultipartUpload(uploadSession, uploadSession.uploadedParts);
        
        // Clean up session
        multipartSessions.delete(fileId);
        
        console.log(`Successfully completed multipart upload: ${s3Url}`);
        
        return res.status(200).json({ 
          received: true, 
          isLastChunk: true, 
          location: s3Url,
          message: "File uploaded successfully to S3"
        });
        
      } catch (completeError) {
        console.error("Failed to complete multipart upload:", completeError);
        
        // Try to abort the multipart upload
        try {
          await abortMultipartUpload(uploadSession);
          console.log("Aborted multipart upload due to completion failure");
        } catch (abortError) {
          console.error("Failed to abort multipart upload:", abortError);
        }
        
        // Clean up session
        multipartSessions.delete(fileId);
        
        return res.status(500).json({ 
          message: "Failed to complete upload", 
          error: completeError.message 
        });
      }
      
    } catch (uploadError) {
      console.error(`Failed to upload chunk ${partNumber}:`, uploadError);
      
      // If this is a critical error and we have uploaded parts, try to abort
      if (uploadSession.uploadedParts.length > 0) {
        try {
          await abortMultipartUpload(uploadSession);
          console.log("Aborted multipart upload due to chunk upload failure");
        } catch (abortError) {
          console.error("Failed to abort multipart upload:", abortError);
        }
      }
      
      // Clean up session
      multipartSessions.delete(fileId);
      
      return res.status(500).json({ 
        message: "Chunk upload failed", 
        error: uploadError.message 
      });
    }
    
  } catch (err) {
    console.error("Chunk upload error:", err)
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      path: err.path
    });
    
    // Clean up session on error
    if (req.body.fileId) {
      const uploadSession = multipartSessions.get(req.body.fileId);
      if (uploadSession) {
        try {
          await abortMultipartUpload(uploadSession);
          console.log("Aborted multipart upload due to error");
        } catch (abortError) {
          console.error("Failed to abort multipart upload:", abortError);
        }
        multipartSessions.delete(req.body.fileId);
      }
    }
    
    return res.status(500).json({ message: "Upload failed", error: err.message })
  }
})

// POST /upload-video - Enhanced video upload with progress tracking and better error handling
router.post("/upload-video", regularUpload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file provided" })
    }

    console.log(`📹 Starting video upload: ${req.file.originalname}, Size: ${req.file.size} bytes`)
    console.log(`📁 File path: ${req.file.path}`)

    // File is now in memory buffer - no disk space check needed
    console.log(`✅ File loaded in memory, size: ${req.file.size} bytes`);

    // Set response timeout for large files
    res.setTimeout(120 * 60 * 1000); // 120 minutes

    // Progress tracking callback
    const progressCallback = (progress) => {
      console.log(`📊 Upload progress: ${progress.percentage}% (${progress.partNumber}/${progress.totalParts})`);
    };

    // Upload directly to S3 using buffer (NO LOCAL FILES)
    console.log(`🚀 Starting direct S3 multipart upload for ${req.file.originalname}...`);
    const videoUrl = await uploadDirectToS3(
      req.file.buffer, 
      req.file.originalname, 
      req.file.mimetype, 
      "course-videos", 
      progressCallback
    );
    console.log(`✅ Direct S3 upload completed for ${req.file.originalname}: ${videoUrl}`);
    
    // Broadcast completion via SSE
    if (global.broadcastCompletion) {
      global.broadcastCompletion(uploadId, videoUrl, req.file.originalname);
    }
    
    res.status(200).json({ 
      message: "Video uploaded successfully", 
      location: videoUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadType: "direct",
      uploadId: uploadId
    })
  } catch (error) {
    console.error("❌ Video upload error:", error)
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    
    // No cleanup needed - no local files created
    
    // Provide more specific error messages
    if (error.code === 'ECONNRESET') {
      return res.status(500).json({ message: "Connection lost during upload", error: "Please try again" })
    } else if (error.code === 'ETIMEDOUT') {
      return res.status(500).json({ message: "Upload timeout", error: "File too large or connection too slow" })
    } else if (error.message?.includes('timeout')) {
      return res.status(500).json({ message: "Upload timeout", error: "Please check your connection and try again" })
    } else if (error.message?.includes('File not found')) {
      return res.status(500).json({ message: "File processing error", error: "Temporary file could not be created" })
    } else if (error.name === 'NoSuchBucket') {
      return res.status(500).json({ message: "Storage error", error: "AWS S3 bucket not found" })
    } else if (error.name === 'InvalidAccessKeyId') {
      return res.status(500).json({ message: "AWS configuration error", error: "Invalid AWS credentials" })
    } else if (error.name === 'SignatureDoesNotMatch') {
      return res.status(500).json({ message: "AWS authentication error", error: "AWS credentials mismatch" })
    } else if (error.message?.includes('Failed to upload part')) {
      return res.status(500).json({ message: "Upload part failed", error: "Network issue during upload. Please try again." })
    } else if (error.message?.includes('Failed to complete multipart upload')) {
      return res.status(500).json({ message: "Upload completion failed", error: "Upload was interrupted. Please try again." })
    } else if (error.code === 'ENOSPC') {
      return res.status(507).json({ 
        message: "Insufficient storage space", 
        error: "Server is out of disk space. Please contact administrator or try again later." 
      })
    }
    
    res.status(500).json({ message: "Video upload failed", error: error.message })
  }
})

// POST /upload-video-direct - Direct S3 upload without local storage
router.post("/upload-video-direct", memoryUpload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file provided" })
    }

    // Get upload ID from form data or generate one
    const uploadId = req.body.uploadId || `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 Starting direct S3 upload: ${req.file.originalname}, Size: ${req.file.size} bytes, UploadID: ${uploadId}`)

    // Set response timeout for large files
    res.setTimeout(120 * 60 * 1000); // 120 minutes

    // Progress tracking callback with SSE broadcasting
    const progressCallback = (progress) => {
      console.log(`📊 Direct upload progress: ${progress.percentage}% (${progress.partNumber}/${progress.totalParts})`);
      
      // Broadcast progress via SSE
      if (global.broadcastProgress) {
        global.broadcastProgress(uploadId, {
          percentage: progress.percentage,
          partNumber: progress.partNumber,
          totalParts: progress.totalParts,
          uploadedBytes: progress.uploadedBytes,
          totalBytes: progress.totalBytes
        });
      }
    };

    // Upload directly to S3 using buffer (no local storage)
    console.log(`🎯 Starting direct S3 multipart upload for ${req.file.originalname}...`);
    const videoUrl = await uploadDirectToS3(
      req.file.buffer, 
      req.file.originalname, 
      req.file.mimetype, 
      "course-videos", 
      progressCallback
    );
    console.log(`✅ Direct S3 upload completed for ${req.file.originalname}: ${videoUrl}`);
    
    // Broadcast completion via SSE
    if (global.broadcastCompletion) {
      global.broadcastCompletion(uploadId, videoUrl, req.file.originalname);
    }
    
    res.status(200).json({ 
      message: "Video uploaded successfully", 
      location: videoUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadType: "direct",
      uploadId: uploadId
    })
  } catch (error) {
    console.error("❌ Direct video upload error:", error)
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    
    // Provide more specific error messages
    if (error.code === 'ECONNRESET') {
      return res.status(500).json({ message: "Connection lost during upload", error: "Please try again" })
    } else if (error.code === 'ETIMEDOUT') {
      return res.status(500).json({ message: "Upload timeout", error: "File too large or connection too slow" })
    } else if (error.message?.includes('timeout')) {
      return res.status(500).json({ message: "Upload timeout", error: "Please check your connection and try again" })
    } else if (error.name === 'NoSuchBucket') {
      return res.status(500).json({ message: "Storage error", error: "AWS S3 bucket not found" })
    } else if (error.name === 'InvalidAccessKeyId') {
      return res.status(500).json({ message: "AWS configuration error", error: "Invalid AWS credentials" })
    } else if (error.name === 'SignatureDoesNotMatch') {
      return res.status(500).json({ message: "AWS authentication error", error: "AWS credentials mismatch" })
    } else if (error.message?.includes('Failed to upload part')) {
      return res.status(500).json({ message: "Upload part failed", error: "Network issue during upload. Please try again." })
    } else if (error.message?.includes('Failed to complete multipart upload')) {
      return res.status(500).json({ message: "Upload completion failed", error: "Upload was interrupted. Please try again." })
    } else if (error.code === 'ENOSPC') {
      return res.status(507).json({ 
        message: "Insufficient storage space", 
        error: "Server is out of disk space. Please contact administrator or try again later." 
      })
    }
    
    res.status(500).json({ message: "Direct video upload failed", error: error.message })
  }
})

// POST /upload-thumbnail - Upload course/lesson thumbnails
router.post("/upload-thumbnail", regularUpload.single("thumbnail"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No thumbnail file provided" })
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: "File must be an image" })
    }

    // Upload directly to AWS S3 using buffer
    const fileForUpload = {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    };
    
    const thumbnailUrl = await uploadFile2(fileForUpload, "thumbnails")
    
    res.status(200).json({ 
      message: "Thumbnail uploaded successfully", 
      location: thumbnailUrl 
    })
  } catch (error) {
    console.error("Thumbnail upload error:", error)
    res.status(500).json({ message: "Thumbnail upload failed", error: error.message })
  }
})

// Cleanup function to remove old multipart sessions (run every hour)
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [fileId, session] of multipartSessions.entries()) {
    if (now - session.createdAt > maxAge) {
      console.log(`Cleaning up old multipart session: ${fileId}`);
      multipartSessions.delete(fileId);
    }
  }
}, 60 * 60 * 1000); // Run every hour

// Endpoint to get upload status
router.get("/upload-status/:fileId", (req, res) => {
  const { fileId } = req.params;
  const session = multipartSessions.get(fileId);
  
  if (!session) {
    return res.status(404).json({ message: "Upload session not found" });
  }
  
  res.json({
    fileId,
    fileName: session.fileName,
    totalChunks: session.totalChunks,
    uploadedParts: session.uploadedParts.length,
    uploadId: session.uploadId,
    createdAt: session.createdAt
  });
});

// Endpoint to abort an upload
router.post("/abort-upload/:fileId", async (req, res) => {
  const { fileId } = req.params;
  const session = multipartSessions.get(fileId);
  
  if (!session) {
    return res.status(404).json({ message: "Upload session not found" });
  }
  
  try {
    await abortMultipartUpload(session);
    multipartSessions.delete(fileId);
    res.json({ message: "Upload aborted successfully" });
  } catch (error) {
    console.error("Error aborting upload:", error);
    res.status(500).json({ message: "Failed to abort upload", error: error.message });
  }
});

module.exports = router


