const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const dotenv = require("dotenv");
const fs = require("fs").promises;
const path = require("path");

dotenv.config();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 3, // Auto-retry on transient failures
});

// Temporary directory for buffer-based uploads
const TEMP_DIR = path.join(__dirname, "..", "Uploads", "temp");

// Unified upload function for files up to 10GB
const uploadFile = async (file, bucketname, options = {}) => {
  const { progressCallback = null, metadata = {} } = options;
  const fileSize = file.size || 0;
  const key = `${bucketname}/${Date.now()}_${file.originalname}`;
  console.log(`📤 Uploading: ${file.originalname} (${Math.round(fileSize / 1024 / 1024)}MB)`);

  // Validate inputs
  if (!file || (!file.buffer && !file.path) || !file.originalname || !file.mimetype) {
    throw new Error("Invalid file: must include buffer or path, originalname, and mimetype");
  }
  if (!bucketname) throw new Error("Bucket name required");
  if (fileSize > 10 * 1024 * 1024 * 1024) throw new Error("File exceeds 10GB limit");

  let tempPath = file.path;
  const startTime = Date.now();
  try {
    // Handle buffer-based uploads by writing to temp file for large files
    if (!tempPath && file.buffer && fileSize > 10 * 1024 * 1024) {
      tempPath = path.join(TEMP_DIR, `temp_${Date.now()}_${file.originalname}`);
      await fs.mkdir(TEMP_DIR, { recursive: true });
      await fs.writeFile(tempPath, file.buffer);
      console.log(`📝 Temp file created: ${tempPath}`);
    }

    // Validate disk-based file existence
    if (tempPath && !(await fs.access(tempPath).then(() => true).catch(() => false))) {
      throw new Error(`File not found: ${tempPath}`);
    }

    const isLargeFile = fileSize > 10 * 1024 * 1024; // 10MB threshold
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: tempPath ? fs.createReadStream(tempPath) : file.buffer,
      ContentType: file.mimetype,
      Metadata: metadata,
    };

    if (isLargeFile) {
      // Multipart upload for large files
      const upload = new Upload({
        client: s3Client,
        params,
        partSize: 10 * 1024 * 1024, // 10MB parts
        queueSize: 2, // Low concurrency for EC2 t2.micro
        leavePartsOnError: false,
      });

      if (progressCallback) {
        upload.on("httpUploadProgress", (progress) => {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          const uploadedMB = Math.round(progress.loaded / 1024 / 1024);
          const totalMB = Math.round(progress.total / 1024 / 1024);
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = progress.loaded / Math.max(elapsed, 0.1) / 1024 / 1024;
          progressCallback({
            percentage,
            uploadedMB,
            totalMB,
            uploadedBytes: progress.loaded,
            totalBytes: progress.total,
            currentSpeed: speed.toFixed(2),
            eta: Math.round((progress.total - progress.loaded) / (speed * 1024 * 1024)),
            metadata,
          });
          console.log(`📈 Progress: ${percentage}% (${uploadedMB}/${totalMB}MB, ${speed.toFixed(2)}MB/s)`);
        });
      }

      await upload.done();
    } else {
      // Regular upload for small files
      await s3Client.send(new PutObjectCommand(params));
    }

    const location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    console.log(`✅ Uploaded: ${location}`);
    return { location, metadata };
  } catch (error) {
    console.error(`❌ Upload failed: ${error.message}`);
    throw error;
  } finally {
    if (tempPath && tempPath !== file.path) {
      await fs.unlink(tempPath).catch((err) => console.error(`Error cleaning temp file: ${err.message}`));
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

// Multi-file upload
const multifileUpload = async (files, bucketname, options = {}) => {
  return Promise.all(files.map((file) => uploadFile(file, bucketname, options)));
};

module.exports = { uploadFile, deleteFile, multifileUpload };