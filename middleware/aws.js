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

// Multipart upload for large files (>100MB)
const uploadLargeFile = async (file, bucketname) => {
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
  const filePath = file.path; // For disk storage files
  const fileSize = file.size;
  const key = `${bucketname}/${Date.now() + "_" + file.originalname}`;
  
  console.log(`Starting multipart upload for ${file.originalname} (${fileSize} bytes)`);
  console.log(`File path: ${filePath}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  try {
    // Create multipart upload
    const createParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: file.mimetype,
    };
    
    const createCommand = new CreateMultipartUploadCommand(createParams);
    const { UploadId } = await s3Client.send(createCommand);
    
    console.log(`Created multipart upload: ${UploadId}`);
    
    // Upload parts
    const parts = [];
    const totalParts = Math.ceil(fileSize / CHUNK_SIZE);
    
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      
      console.log(`Uploading part ${partNumber}/${totalParts} (${start}-${end})`);
      
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
        UploadId: UploadId,
        Body: chunkBuffer,
      };
      
      const uploadPartCommand = new UploadPartCommand(uploadPartParams);
      const { ETag } = await s3Client.send(uploadPartCommand);
      
      parts.push({
        ETag,
        PartNumber: partNumber,
      });
      
      console.log(`Completed part ${partNumber}/${totalParts} (${Math.round((partNumber / totalParts) * 100)}%)`);
    }
    
    // Complete multipart upload
    const completeParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      UploadId: UploadId,
      MultipartUpload: {
        Parts: parts,
      },
    };
    
    const completeCommand = new CompleteMultipartUploadCommand(completeParams);
    await s3Client.send(completeCommand);
    
    const location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    console.log(`Multipart upload completed: ${location}`);
    
    return location;
    
  } catch (error) {
    console.error('Multipart upload failed:', error);
    
    // Abort multipart upload on error
    try {
      const abortParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        UploadId: UploadId,
      };
      const abortCommand = new AbortMultipartUploadCommand(abortParams);
      await s3Client.send(abortCommand);
      console.log('Aborted multipart upload');
    } catch (abortError) {
      console.error('Error aborting multipart upload:', abortError);
    }
    
    throw error;
  }
};

const uploadFile2 = async (file, bucketname) => {
  console.log(`Uploading file: ${file.originalname}, Size: ${file.size}, Path: ${file.path}, Buffer: ${!!file.buffer}`);
  
  // Use multipart upload for files larger than 100MB
  if (file.size > 100 * 1024 * 1024) {
    // Check if file is on disk (from multer disk storage)
    if (file.path && fs.existsSync(file.path)) {
      return await uploadLargeFile(file, bucketname);
    } else {
      // Fallback: write buffer to temp file for multipart upload
      const tempPath = path.join(__dirname, '..', 'uploads', 'temp', `temp_${Date.now()}_${file.originalname}`);
      await fs.promises.writeFile(tempPath, file.buffer);
      
      const tempFile = {
        ...file,
        path: tempPath
      };
      
      try {
        const result = await uploadLargeFile(tempFile, bucketname);
        // Clean up temp file
        await fs.promises.unlink(tempPath);
        return result;
      } catch (error) {
        // Clean up temp file on error
        try {
          await fs.promises.unlink(tempPath);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
        throw error;
      }
    }
  }
  
  // Use regular upload for smaller files
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${bucketname}/${Date.now() + "_" + file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
    const command = new PutObjectCommand(params);
    s3Client.send(command, (err, data) => {
      if (err) {
        reject(`File not uploaded: ${err.message || err}`);
      } else {
        let location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${params.Key}`;
        console.log(location);
        resolve(location);
      }
    });
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

module.exports= { 
  uploadFile, 
  uploadFile2, 
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