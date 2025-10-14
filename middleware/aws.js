const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
dotenv.config();

// Progress tracking for uploads
const uploadProgress = new Map();

// Save upload progress to file with disk space check
const saveProgress = (uploadId, progress) => {
  try {
    const progressFile = path.join(__dirname, '..', 'uploads', 'progress', `${uploadId}.json`);
    const progressDir = path.dirname(progressFile);
    
    if (!fs.existsSync(progressDir)) {
      fs.mkdirSync(progressDir, { recursive: true });
    }
    
    // Check disk space before writing
    const stats = fs.statSync(progressDir);
    if (stats) {
      fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
      console.log(`💾 Saved progress for upload ${uploadId}: ${progress.completedParts}/${progress.totalParts} parts`);
    }
  } catch (error) {
    if (error.code === 'ENOSPC') {
      console.error('❌ No space left on device - cannot save progress');
      console.error('💡 Run emergency cleanup: ./emergency-cleanup.sh');
    } else {
      console.error('Error saving progress:', error);
    }
  }
};

// Load upload progress from file
const loadProgress = (uploadId) => {
  try {
    const progressFile = path.join(__dirname, '..', 'uploads', 'progress', `${uploadId}.json`);
    if (fs.existsSync(progressFile)) {
      const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
      console.log(`📂 Loaded progress for upload ${uploadId}: ${progress.completedParts}/${progress.totalParts} parts`);
      return progress;
    }
  } catch (error) {
    console.error('Error loading progress:', error);
  }
  return null;
};

// Clean up progress file
const cleanupProgress = (uploadId) => {
  try {
    const progressFile = path.join(__dirname, '..', 'uploads', 'progress', `${uploadId}.json`);
    if (fs.existsSync(progressFile)) {
      fs.unlinkSync(progressFile);
      console.log(`🧹 Cleaned up progress file for upload ${uploadId}`);
    }
  } catch (error) {
    console.error('Error cleaning up progress:', error);
  }
};

// Helper to log presence of required AWS envs (no secrets)
const logAwsEnv = () => {
  const present = {
    AWS_REGION: !!process.env.AWS_REGION,
    AWS_S3_BUCKET_NAME: !!process.env.AWS_S3_BUCKET_NAME,
    AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
  }
  console.log("AWS env present:", present)
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


const DOWNLOAD_DIR = path.join(__dirname, "downloads");
const streamPipeline = promisify(pipeline);
// if (!fs.existsSync(DOWNLOAD_DIR)) {  
//   fs.mkdirSync(DOWNLOAD_DIR);
// }

const downloadAllImages = async (bucketName = process.env.AWS_S3_BUCKET_NAME) => {
  try {
    const listParams = {
      Bucket: bucketName,
    };

    const listCommand = new ListObjectsV2Command(listParams);
    const listData = await s3Client.send(listCommand);

    if (!listData.Contents || listData.Contents.length === 0) {
      console.log("No files found in bucket.");
      return;
    }

    const imageFiles = listData.Contents.filter((file) =>
      /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.Key)
    );

    console.log(`Found ${imageFiles.length} image(s). Downloading...`);

    for (const file of imageFiles) {
      const localPath = path.join(DOWNLOAD_DIR, file.Key);
      const localDir = path.dirname(localPath);

      // Create folder structure if not exists
      fs.mkdirSync(localDir, { recursive: true });

      const getObjectParams = {
        Bucket: bucketName,
        Key: file.Key,
      };

      const getObjectCommand = new GetObjectCommand(getObjectParams);
      const data = await s3Client.send(getObjectCommand);

      await streamPipeline(data.Body, fs.createWriteStream(localPath));
      console.log(`Downloaded: ${file.Key}`);
    }

    console.log("✅ All images downloaded successfully.");
  } catch (err) {
    console.error("❌ Error downloading images:", err);
  }
};


const uploadFile = (file, bucketname) => {
  return new Promise((resolve, reject) => {
    // const file = files.image[0];
    // console.log(file,bucketname);
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${bucketname}/${Date.now() + "_" + file.originalFilename}`,
      Body: fs.createReadStream(file.filepath),
      ContentType: file.mimetype,
    };
    const command = new PutObjectCommand(params);
    s3Client.send(command, (err, data) => {
      if (err) {
        reject(`File not uploaded: ${err.message || err}`);
      } else {
        // console.log(data);
        let location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${params.Key}`;
        console.log(location);
        resolve(location);
      }
    });
  });
};

// Enhanced multipart upload optimized for t2.micro instances
const uploadLargeFile = async (file, bucketname, progressCallback = null) => {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks (AWS S3 minimum part size)
  const filePath = file.path; // For disk storage files
  const fileSize = file.size;
  const key = `${bucketname}/${Date.now() + "_" + file.originalname}`;
  
  console.log(`Starting multipart upload for ${file.originalname} (${fileSize} bytes)`);
  console.log(`File path: ${filePath}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  let uploadId = null;
  
  try {
    // Create multipart upload with retry logic
    const createParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: file.mimetype,
    };
    
    const createCommand = new CreateMultipartUploadCommand(createParams);
    const createResult = await s3Client.send(createCommand);
    uploadId = createResult.UploadId;
    
    console.log(`Created multipart upload: ${uploadId}`);
    
    // Upload parts with enhanced error handling and progress persistence
    const parts = [];
    const totalParts = Math.ceil(fileSize / CHUNK_SIZE);
    let uploadedBytes = 0;
    
    // Check for existing progress
    const existingProgress = loadProgress(uploadId);
    let startPart = 1;
    
    if (existingProgress && existingProgress.parts && existingProgress.parts.length > 0) {
      console.log(`🔄 Resuming upload from part ${existingProgress.parts.length + 1}`);
      parts.push(...existingProgress.parts);
      uploadedBytes = existingProgress.uploadedBytes || 0;
      startPart = existingProgress.parts.length + 1;
    }
    
    for (let partNumber = startPart; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const partSize = end - start;
      
      // Skip parts smaller than 5MB (AWS S3 minimum) except for the last part
      if (partSize < 5 * 1024 * 1024 && partNumber < totalParts) {
        console.log(`⚠️ Skipping part ${partNumber} - too small (${partSize} bytes)`);
        continue;
      }
      
      console.log(`Uploading part ${partNumber}/${totalParts} (${start}-${end}) - ${Math.round((partNumber / totalParts) * 100)}%`);
      
      // Call progress callback if provided
      if (progressCallback) {
        progressCallback({
          partNumber,
          totalParts,
          percentage: Math.round((partNumber / totalParts) * 100),
          uploadedBytes,
          totalBytes: fileSize
        });
      }
      
      // Upload part with retry logic
      let partUploaded = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!partUploaded && retryCount < maxRetries) {
        try {
          // Use stream to read chunk from file to avoid memory issues
          const readStream = fs.createReadStream(filePath, { start, end: end - 1 });
          const chunks = [];
          
          await new Promise((resolve, reject) => {
            readStream.on('data', (chunk) => chunks.push(chunk));
            readStream.on('end', resolve);
            readStream.on('error', reject);
          });
          
          const chunkBuffer = Buffer.concat(chunks);
          
          const uploadPartParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key,
            PartNumber: partNumber,
            UploadId: uploadId,
            Body: chunkBuffer,
          };
          
          const uploadPartCommand = new UploadPartCommand(uploadPartParams);
          const { ETag } = await s3Client.send(uploadPartCommand);
          
          parts.push({
            ETag,
            PartNumber: partNumber,
          });
          
          uploadedBytes += partSize;
          partUploaded = true;
          
          console.log(`✅ Completed part ${partNumber}/${totalParts} (${Math.round((partNumber / totalParts) * 100)}%)`);
          
          // Save progress after each successful part
          saveProgress(uploadId, {
            uploadId,
            fileName: file.originalname,
            totalParts,
            completedParts: parts.length,
            uploadedBytes,
            parts: parts,
            lastUpdated: new Date().toISOString()
          });
          
          // Add longer delay between chunks to prevent CPU throttling on t2.micro
          if (partNumber < totalParts) {
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
          }
          
          // Force garbage collection every 10 chunks to free memory
          if (partNumber % 10 === 0 && global.gc) {
            console.log(`🧹 Forcing garbage collection after chunk ${partNumber}`);
            global.gc();
          }
          
        } catch (partError) {
          retryCount++;
          console.error(`❌ Part ${partNumber} upload failed (attempt ${retryCount}/${maxRetries}):`, partError.message);
          
          // Check for specific error types
          if (partError.code === 'ECONNRESET' || partError.code === 'ETIMEDOUT' || 
              partError.message?.includes('timeout') || partError.message?.includes('ECONNRESET')) {
            console.log(`🔄 Network error detected, will retry with longer delay...`);
          }
          
          if (retryCount >= maxRetries) {
            console.error(`💥 Part ${partNumber} failed permanently after ${maxRetries} attempts`);
            throw new Error(`Failed to upload part ${partNumber} after ${maxRetries} attempts: ${partError.message}`);
          }
          
          // Longer wait before retry for t2.micro (exponential backoff with longer delays)
          const waitTime = Math.pow(2, retryCount) * 2000; // 4s, 8s, 16s
          console.log(`⏳ Waiting ${waitTime}ms before retry (attempt ${retryCount + 1}/${maxRetries})...`);
          
          // Force garbage collection before retry
          if (global.gc) {
            global.gc();
          }
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Complete multipart upload with retry logic
    let completed = false;
    let completeRetryCount = 0;
    const maxCompleteRetries = 3;
    
    while (!completed && completeRetryCount < maxCompleteRetries) {
      try {
        const completeParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: parts,
          },
        };
        
        const completeCommand = new CompleteMultipartUploadCommand(completeParams);
        await s3Client.send(completeCommand);
        
        completed = true;
        console.log(`✅ Multipart upload completed successfully`);
        
        // Clean up progress file on successful completion
        cleanupProgress(uploadId);
        
      } catch (completeError) {
        completeRetryCount++;
        console.error(`❌ Complete multipart upload failed (attempt ${completeRetryCount}/${maxCompleteRetries}):`, completeError.message);
        
        if (completeRetryCount >= maxCompleteRetries) {
          throw new Error(`Failed to complete multipart upload after ${maxCompleteRetries} attempts: ${completeError.message}`);
        }
        
        // Wait before retry
        const waitTime = Math.pow(2, completeRetryCount) * 1000;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    const location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    console.log(`🎉 Multipart upload completed: ${location}`);
    
    return location;
    
  } catch (error) {
    console.error('❌ Multipart upload failed:', error);
    
    // Abort multipart upload on error
    if (uploadId) {
      try {
        const abortParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          UploadId: uploadId,
        };
        const abortCommand = new AbortMultipartUploadCommand(abortParams);
        await s3Client.send(abortCommand);
        console.log('🧹 Aborted multipart upload');
      } catch (abortError) {
        console.error('❌ Error aborting multipart upload:', abortError);
      }
    }
    
    throw error;
  }
};

const uploadFile2 = async (file, bucketname, progressCallback = null) => {
  console.log(`Uploading file: ${file.originalname}, Size: ${file.size}, Path: ${file.path}, Buffer: ${!!file.buffer}`);
  
  // Use multipart upload for files larger than 10MB (optimized for t2.micro)
  if (file.size > 10 * 1024 * 1024) {
    console.log(`Large file detected (${file.size} bytes), using multipart upload`);
    
    // Check if file is on disk (from multer disk storage)
    if (file.path && fs.existsSync(file.path)) {
      console.log(`Using existing file path: ${file.path}`);
      return await uploadLargeFile(file, bucketname, progressCallback);
    } else {
      // Fallback: write buffer to temp file for multipart upload
      const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        console.log(`Creating temp directory: ${tempDir}`);
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempPath = path.join(tempDir, `temp_${Date.now()}_${file.originalname}`);
      console.log(`Writing buffer to temp file: ${tempPath}`);
      
      try {
        await fs.promises.writeFile(tempPath, file.buffer);
        console.log(`Temp file created successfully`);
        
        const tempFile = {
          ...file,
          path: tempPath
        };
        
        const result = await uploadLargeFile(tempFile, bucketname, progressCallback);
        console.log(`Multipart upload completed, cleaning up temp file`);
        
        // Clean up temp file
        await fs.promises.unlink(tempPath);
        return result;
      } catch (error) {
        console.error(`Error during multipart upload:`, error);
        
        // Clean up temp file on error
        try {
          if (fs.existsSync(tempPath)) {
            await fs.promises.unlink(tempPath);
            console.log(`Cleaned up temp file after error`);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
        throw error;
      }
    }
  }
  
  // Use regular upload for smaller files with retry logic
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${bucketname}/${Date.now() + "_" + file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
    
    const uploadWithRetry = async (retryCount = 0) => {
      const maxRetries = 3;
      
      try {
        const command = new PutObjectCommand(params);
        const data = await s3Client.send(command);
        
        let location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${params.Key}`;
        console.log(`✅ File uploaded successfully: ${location}`);
        resolve(location);
        
      } catch (err) {
        console.error(`❌ Upload attempt ${retryCount + 1} failed:`, err.message);
        
        if (retryCount < maxRetries) {
          const waitTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`⏳ Retrying in ${waitTime}ms...`);
          setTimeout(() => uploadWithRetry(retryCount + 1), waitTime);
        } else {
          reject(`File not uploaded after ${maxRetries} attempts: ${err.message || err}`);
        }
      }
    };
    
    uploadWithRetry();
  });
};


const getUrlFileKey = (url) => {
  const regex = /^https?:\/\/([^\.]+)\.s3.amazonaws.com\/(.+)$/;
  const match = url.match(regex);
  if (match) {
    return match[2]; // file key is in group 2
  } else {
    throw new Error(`Invalid S3 URL: ${url}`);
  }
};

const deleteFile = async (url) => {
  
 const fileKey= getUrlFileKey(url)
 console.log(fileKey);
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Delete: {
      Objects: [{ Key: fileKey }],
    },
  };

  try {
    const data = await s3Client.destroy(params);
    return data;
  } catch (err) {
    throw new Error(`Error deleting file: ${err.message}`);
  }
};

const updateFile = async (fileKey, newFile) => {
  await deleteFile(fileKey); // Delete the old file first

  const params = {
    ACL: "public-read",
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
    Body: newFile.buffer,
  };

  try {
    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);
    return data.Location;
  } catch (err) {
    throw new Error(`Error updating file: ${err.message}`);
  }
};

const multifileUpload = async (files, bucketname) => {
  return Promise.all(
    files.map((file) => {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${bucketname}/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
      };

      return new Promise((resolve, reject) => {
        s3Client.send(new PutObjectCommand(params), (err, data) => {
          if (err) {
            reject(err);
          } else {
            let location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${params.Key}`;
            console.log(location);
            resolve(location);
          }
        });
      });
    })
  );
};

// Initialize multipart upload for chunked uploads
const initializeMultipartUpload = async (key, contentType, bucketname) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${bucketname}/${key}`,
      ContentType: contentType,
    };
    
    const command = new CreateMultipartUploadCommand(params);
    const result = await s3Client.send(command);
    
    console.log(`Initialized multipart upload: ${result.UploadId}`);
    return {
      uploadId: result.UploadId,
      key: params.Key,
      bucket: params.Bucket
    };
  } catch (error) {
    console.error('Error initializing multipart upload:', error);
    throw error;
  }
};

// Upload a single chunk to S3
const uploadChunkToS3 = async (uploadSession, partNumber, chunkBuffer, retryCount = 0) => {
  const maxRetries = 3;
  
  try {
    const params = {
      Bucket: uploadSession.bucket,
      Key: uploadSession.key,
      PartNumber: partNumber,
      UploadId: uploadSession.uploadId,
      Body: chunkBuffer,
    };
    
    const command = new UploadPartCommand(params);
    const result = await s3Client.send(command);
    
    console.log(`Uploaded part ${partNumber}, ETag: ${result.ETag}`);
    return {
      ETag: result.ETag,
      PartNumber: partNumber,
    };
  } catch (error) {
    console.error(`Error uploading part ${partNumber} (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying part ${partNumber} upload in ${(retryCount + 1) * 2} seconds...`);
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
      return uploadChunkToS3(uploadSession, partNumber, chunkBuffer, retryCount + 1);
    }
    
    throw error;
  }
};

// Complete multipart upload
const completeMultipartUpload = async (uploadSession, parts) => {
  try {
    const params = {
      Bucket: uploadSession.bucket,
      Key: uploadSession.key,
      UploadId: uploadSession.uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    };
    
    const command = new CompleteMultipartUploadCommand(params);
    const result = await s3Client.send(command);
    
    const location = `https://${uploadSession.bucket}.s3.amazonaws.com/${uploadSession.key}`;
    console.log(`Multipart upload completed: ${location}`);
    
    return location;
  } catch (error) {
    console.error('Error completing multipart upload:', error);
    throw error;
  }
};

// Abort multipart upload
const abortMultipartUpload = async (uploadSession) => {
  try {
    const params = {
      Bucket: uploadSession.bucket,
      Key: uploadSession.key,
      UploadId: uploadSession.uploadId,
    };
    
    const command = new AbortMultipartUploadCommand(params);
    await s3Client.send(command);
    
    console.log(`Aborted multipart upload: ${uploadSession.uploadId}`);
  } catch (error) {
    console.error('Error aborting multipart upload:', error);
    throw error;
  }
};

// List parts of a multipart upload
const listMultipartParts = async (uploadSession) => {
  try {
    const params = {
      Bucket: uploadSession.bucket,
      Key: uploadSession.key,
      UploadId: uploadSession.uploadId,
    };
    
    const command = new ListPartsCommand(params);
    const result = await s3Client.send(command);
    
    return result.Parts || [];
  } catch (error) {
    console.error('Error listing multipart parts:', error);
    throw error;
  }
};

// Direct S3 upload without local storage (for frontend uploads)
const uploadDirectToS3 = async (fileBuffer, fileName, contentType, bucketname, progressCallback = null) => {
  const fileSize = fileBuffer.length;
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks (AWS S3 minimum)
  const key = `${bucketname}/${Date.now() + "_" + fileName}`;
  
  console.log(`🚀 Starting direct S3 upload for ${fileName} (${fileSize} bytes)`);
  
  let uploadId = null;
  
  try {
    // Create multipart upload
    const createParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    };
    
    const createCommand = new CreateMultipartUploadCommand(createParams);
    const createResult = await s3Client.send(createCommand);
    uploadId = createResult.UploadId;
    
    console.log(`✅ Created multipart upload: ${uploadId}`);
    
    // Upload parts directly from buffer
    const parts = [];
    const totalParts = Math.ceil(fileSize / CHUNK_SIZE);
    let uploadedBytes = 0;
    
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const partSize = end - start;
      
      // Skip parts smaller than 5MB except for the last part
      if (partSize < 5 * 1024 * 1024 && partNumber < totalParts) {
        console.log(`⚠️ Skipping part ${partNumber} - too small (${partSize} bytes)`);
        continue;
      }
      
      console.log(`📤 Uploading part ${partNumber}/${totalParts} (${start}-${end}) - ${Math.round((partNumber / totalParts) * 100)}%`);
      
      // Call progress callback
      if (progressCallback) {
        progressCallback({
          partNumber,
          totalParts,
          percentage: Math.round((partNumber / totalParts) * 100),
          uploadedBytes,
          totalBytes: fileSize
        });
      }
      
      // Extract chunk from buffer
      const chunkBuffer = fileBuffer.slice(start, end);
      
      // Upload part with retry logic
      let partUploaded = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!partUploaded && retryCount < maxRetries) {
        try {
          const uploadPartParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key,
            PartNumber: partNumber,
            UploadId: uploadId,
            Body: chunkBuffer,
          };
          
          const uploadPartCommand = new UploadPartCommand(uploadPartParams);
          const { ETag } = await s3Client.send(uploadPartCommand);
          
          parts.push({
            ETag,
            PartNumber: partNumber,
          });
          
          uploadedBytes += partSize;
          partUploaded = true;
          
          console.log(`✅ Completed part ${partNumber}/${totalParts} (${Math.round((partNumber / totalParts) * 100)}%)`);
          
          // Add delay between chunks for t2.micro
          if (partNumber < totalParts) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
          }
          
        } catch (partError) {
          retryCount++;
          console.error(`❌ Part ${partNumber} upload failed (attempt ${retryCount}/${maxRetries}):`, partError.message);
          
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to upload part ${partNumber} after ${maxRetries} attempts: ${partError.message}`);
          }
          
          // Wait before retry
          const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Complete multipart upload
    const completeParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    };
    
    const completeCommand = new CompleteMultipartUploadCommand(completeParams);
    await s3Client.send(completeCommand);
    
    const location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    console.log(`🎉 Direct S3 upload completed: ${location}`);
    
    return location;
    
  } catch (error) {
    console.error('❌ Direct S3 upload failed:', error);
    
    // Abort multipart upload on error
    if (uploadId) {
      try {
        const abortParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          UploadId: uploadId,
        };
        const abortCommand = new AbortMultipartUploadCommand(abortParams);
        await s3Client.send(abortCommand);
        console.log('🧹 Aborted multipart upload');
      } catch (abortError) {
        console.error('❌ Error aborting multipart upload:', abortError);
      }
    }
    
    throw error;
  }
};

module.exports= { 
  uploadFile, 
  uploadFile2, 
  uploadDirectToS3,
  deleteFile, 
  updateFile, 
  multifileUpload, 
  downloadAllImages,
  initializeMultipartUpload,
  uploadChunkToS3,
  completeMultipartUpload,
  abortMultipartUpload,
  listMultipartParts
};