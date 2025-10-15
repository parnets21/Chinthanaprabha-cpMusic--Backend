const { S3Client, PutObjectCommand, DeleteObjectCommand, AbortMultipartUploadCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const dotenv = require("dotenv");
const fs = require("fs").promises;
const path = require("path");
const stream = require("stream");
const uploadProgressTracker = require("../websocket/uploadProgress");

dotenv.config();

// Initialize S3 client with enhanced configuration for large uploads
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 5, // Increased retry attempts for large files
  requestTimeout: 600 * 1000, // 10 minutes timeout
  connectionTimeout: 60 * 1000, // 1 minute connection timeout
});

// Temporary directory for buffer-based uploads
const TEMP_DIR = path.join(__dirname, "..", "Uploads", "temp");

// Enhanced upload function for files up to 10GB with real-time WebSocket progress
const uploadFile = async (file, bucketname, options = {}) => {
  const { progressCallback = null, metadata = {}, timeout = 7200000, uploadId = null } = options;
  const fileSize = file.size || 0;
  const key = `${bucketname}/${Date.now()}_${file.originalname}`;
  const actualUploadId = uploadId || `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`📤 Uploading: ${file.originalname} (${Math.round(fileSize / 1024 / 1024)}MB) - ID: ${actualUploadId}`);
  console.log(`📊 File details: Size=${fileSize} bytes, Type=${file.mimetype}, Buffer=${!!file.buffer}, Path=${file.path}`);

  // Validate inputs
  if (!file || (!file.buffer && !file.path) || !file.originalname || !file.mimetype) {
    throw new Error("Invalid file: must include buffer or path, originalname, and mimetype");
  }
  if (!bucketname) throw new Error("Bucket name required");
  if (fileSize > 10 * 1024 * 1024 * 1024) throw new Error("File exceeds 10GB limit");

  let tempPath = file.path;
  let uploadInstance = null;
  const startTime = Date.now();
  
  try {
    // Start tracking upload progress
    uploadProgressTracker.startTracking(actualUploadId, file.originalname, fileSize);

    // Handle buffer-based uploads by writing to temp file for large files
    if (!tempPath && file.buffer && fileSize > 5 * 1024 * 1024) { // 5MB threshold for temp file
      tempPath = path.join(TEMP_DIR, `temp_${Date.now()}_${file.originalname}`);
      await fs.mkdir(TEMP_DIR, { recursive: true });
      await fs.writeFile(tempPath, file.buffer);
      console.log(`📝 Temp file created: ${tempPath}`);
    }

    // Validate disk-based file existence
    if (tempPath && !(await fs.access(tempPath).then(() => true).catch(() => false))) {
      throw new Error(`File not found: ${tempPath}`);
    }

    const isLargeFile = fileSize > 10 * 1024 * 1024; // 10MB threshold for multipart
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: tempPath ? fs.createReadStream(tempPath) : file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        ...metadata,
        originalName: file.originalname,
        uploadTime: new Date().toISOString(),
        fileSize: fileSize.toString(),
        uploadId: actualUploadId
      },
    };

    if (isLargeFile) {
      const partSize = Math.max(10 * 1024 * 1024, Math.min(100 * 1024 * 1024, fileSize / 1000));
      console.log(`🔄 Starting multipart upload: ${file.originalname} (${Math.round(fileSize / 1024 / 1024)}MB) with part size ${Math.round(partSize / 1024 / 1024)}MB`);
      
      // Enhanced multipart upload for large files
      uploadInstance = new Upload({
        client: s3Client,
        params,
        partSize: partSize, // Dynamic part size
        queueSize: 3, // Optimized concurrency
        leavePartsOnError: false, // Clean up failed parts
        tags: [
          { Key: 'UploadType', Value: 'Multipart' },
          { Key: 'FileSize', Value: fileSize.toString() },
          { Key: 'UploadId', Value: actualUploadId }
        ]
      });

      // Enhanced progress tracking with WebSocket
      uploadInstance.on("httpUploadProgress", (progress) => {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        const uploadedMB = Math.round(progress.loaded / 1024 / 1024);
        const totalMB = Math.round(progress.total / 1024 / 1024);
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = progress.loaded / Math.max(elapsed, 0.1) / 1024 / 1024;
        
        console.log(`📈 AWS S3 Progress [${actualUploadId}]: ${percentage}% (${uploadedMB}/${totalMB}MB, ${speed.toFixed(2)}MB/s)`);
        
        // Send real-time progress via WebSocket
        uploadProgressTracker.updateProgress(actualUploadId, progress.loaded, progress.total);
        
        // Also call local progress callback if provided
        if (progressCallback) {
          const progressData = {
            percentage,
            uploadedMB,
            totalMB,
            uploadedBytes: progress.loaded,
            totalBytes: progress.total,
            currentSpeed: speed.toFixed(2),
            eta: Math.round((progress.total - progress.loaded) / (speed * 1024 * 1024)),
            elapsed: Math.round(elapsed),
            metadata: { ...metadata, fileName: file.originalname, uploadId: actualUploadId }
          };
          progressCallback(progressData);
        }
        
        // Log progress every 5% for large files
        if (percentage % 5 === 0) {
          console.log(`📊 Upload Progress: ${percentage}% complete, ${speed.toFixed(2)}MB/s, ETA: ${Math.round((progress.total - progress.loaded) / (speed * 1024 * 1024))}s`);
        }
      });

      // Set timeout for large uploads
      const uploadPromise = uploadInstance.done();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout')), timeout);
      });

      await Promise.race([uploadPromise, timeoutPromise]);
    } else {
      // Regular upload for small files with timeout
      const uploadPromise = s3Client.send(new PutObjectCommand(params));
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout')), timeout);
      });

      await Promise.race([uploadPromise, timeoutPromise]);
      
      // Update progress for small files
      uploadProgressTracker.updateProgress(actualUploadId, fileSize, fileSize);
    }

    const location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    const uploadTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Uploaded [${actualUploadId}]: ${location} (${uploadTime.toFixed(2)}s)`);
    
    // Complete upload tracking
    uploadProgressTracker.completeUpload(actualUploadId, location);
    
    return { 
      location, 
      uploadId: actualUploadId,
      metadata: {
        ...metadata,
        uploadTime: uploadTime,
        fileName: file.originalname,
        fileSize: fileSize
      }
    };
  } catch (error) {
    console.error(`❌ Upload failed [${actualUploadId}]: ${error.message}`);
    
    // Fail upload tracking
    uploadProgressTracker.failUpload(actualUploadId, error);
    
    // Clean up failed multipart upload
    if (uploadInstance && isLargeFile) {
      try {
        await uploadInstance.abort();
        console.log(`🧹 Aborted multipart upload for ${file.originalname}`);
      } catch (abortError) {
        console.error(`❌ Failed to abort multipart upload: ${abortError.message}`);
      }
    }
    
    throw error;
  } finally {
    // Clean up temp file
    if (tempPath && tempPath !== file.path) {
      try {
        await fs.unlink(tempPath);
        console.log(`🧹 Cleaned up temp file: ${tempPath}`);
      } catch (err) {
        console.error(`❌ Error cleaning temp file: ${err.message}`);
      }
    }
  }
};

// Delete file from S3
const deleteFile = async (url) => {
  try {
    const fileKey = url.match(/^https?:\/\/[^.]+\.s3\.amazonaws\.com\/(.+)$/)[1];
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
    }));
    console.log(`🗑️ Deleted: ${fileKey}`);
    return { deleted: true, key: fileKey };
  } catch (err) {
    console.error(`❌ Error deleting file: ${err.message}`);
    throw err;
  }
};

// Enhanced multi-file upload with concurrency control and progress tracking
const multifileUpload = async (files, bucketname, options = {}) => {
  const { maxConcurrency = 3, progressCallback = null } = options;
  const results = [];
  const errors = [];
  
  // Process files in batches to avoid overwhelming the system
  for (let i = 0; i < files.length; i += maxConcurrency) {
    const batch = files.slice(i, i + maxConcurrency);
    
    const batchPromises = batch.map(async (file, index) => {
      const fileIndex = i + index;
      const fileProgressCallback = progressCallback ? (progress) => {
        progressCallback({
          ...progress,
          fileIndex,
          fileName: file.originalname,
          batchProgress: Math.round(((fileIndex + 1) / files.length) * 100)
        });
      } : null;
      
      try {
        const result = await uploadFile(file, bucketname, {
          ...options,
          progressCallback: fileProgressCallback
        });
        return { success: true, result, fileIndex, fileName: file.originalname };
      } catch (error) {
        console.error(`❌ Failed to upload ${file.originalname}:`, error.message);
        return { success: false, error: error.message, fileIndex, fileName: file.originalname };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Separate successful uploads from errors
    batchResults.forEach(result => {
      if (result.success) {
        results.push(result.result);
      } else {
        errors.push({ fileName: result.fileName, error: result.error });
      }
    });
    
    // If we have errors and fail-fast is enabled, throw
    if (errors.length > 0 && options.failFast) {
      throw new Error(`Upload failed for files: ${errors.map(e => e.fileName).join(', ')}`);
    }
  }
  
  // If we have errors and not fail-fast, log them but continue
  if (errors.length > 0) {
    console.warn(`⚠️ Some uploads failed:`, errors);
  }
  
  return results;
};

module.exports = { uploadFile, deleteFile, multifileUpload };