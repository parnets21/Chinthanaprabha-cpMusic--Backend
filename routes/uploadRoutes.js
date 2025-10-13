const express = require("express")
const fs = require("fs")
const path = require("path")
const multer = require("multer")
const { uploadFile2 } = require("../middleware/aws")

const router = express.Router()

// Memory storage is fine for small chunks (e.g., 5-10MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

// Regular upload for video files (up to 10GB) - using disk storage for large files
const regularUpload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, "..", "uploads", "temp")
      ensureDir(uploadDir)
      cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
  }), 
  limits: { fileSize: 10 * 1024 * 1024 * 1024 } 
})

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// POST /upload - accepts a single chunk
// Expects multipart/form-data with fields: fileId, chunkIndex, totalChunks, fileName, and file field name: "chunk"
router.post("/upload", upload.single("chunk"), async (req, res) => {
  try {
    const { fileId, chunkIndex, totalChunks, fileName } = req.body
    if (!fileId || typeof chunkIndex === "undefined" || !totalChunks || !fileName) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    const chunksRoot = path.join(__dirname, "..", "uploads", "chunks", fileId)
    ensureDir(chunksRoot)

    // Save chunk to disk
    const chunkPath = path.join(chunksRoot, `chunk_${chunkIndex}`)
    await fs.promises.writeFile(chunkPath, req.file.buffer)

    const idx = Number(chunkIndex)
    const total = Number(totalChunks)

    // If this is not the last chunk, acknowledge
    if (idx < total - 1) {
      return res.status(200).json({ received: true, isLastChunk: false })
    }

    // Last chunk received: attempt to merge
    const videosRoot = path.join(__dirname, "..", "uploads", "videos")
    ensureDir(videosRoot)

    // Sanitize filename
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const outName = `${Date.now()}_${safeName}`
    const outPath = path.join(videosRoot, outName)

    const writeStream = fs.createWriteStream(outPath)

    // Append chunks in order
    for (let i = 0; i < total; i++) {
      const partPath = path.join(chunksRoot, `chunk_${i}`)
      // Defensive check
      const exists = fs.existsSync(partPath)
      if (!exists) {
        writeStream.destroy()
        return res.status(500).json({ message: `Missing chunk ${i}` })
      }
      const data = await fs.promises.readFile(partPath)
      writeStream.write(data)
    }

    await new Promise((resolve, reject) => {
      writeStream.end(() => resolve())
      writeStream.on("error", reject)
    })

    // Upload merged file to AWS S3
    console.log(`Uploading merged file to S3: ${outName}`);
    const fileForUpload = {
      path: outPath,
      originalname: fileName,
      mimetype: 'video/mp4', // Default to mp4, could be detected from file
      size: fs.statSync(outPath).size
    };
    
    try {
      const s3Url = await uploadFile2(fileForUpload, "course-videos");
      console.log(`Successfully uploaded to S3: ${s3Url}`);
      
      // Cleanup local files
      await fs.promises.unlink(outPath);
      const files = await fs.promises.readdir(chunksRoot);
      await Promise.all(files.map((f) => fs.promises.unlink(path.join(chunksRoot, f))));
      await fs.promises.rmdir(chunksRoot);
      
      return res.status(200).json({ 
        received: true, 
        isLastChunk: true, 
        location: s3Url,
        message: "File uploaded successfully to S3"
      });
    } catch (s3Error) {
      console.error("S3 upload failed:", s3Error);
      
      // Cleanup on S3 error
      try {
        await fs.promises.unlink(outPath);
        const files = await fs.promises.readdir(chunksRoot);
        await Promise.all(files.map((f) => fs.promises.unlink(path.join(chunksRoot, f))));
        await fs.promises.rmdir(chunksRoot);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
      
      return res.status(500).json({ 
        message: "S3 upload failed", 
        error: s3Error.message 
      });
    }
  } catch (err) {
    console.error("Chunk upload error:", err)
    return res.status(500).json({ message: "Upload failed", error: err.message })
  }
})

// POST /upload-video - Direct video upload for course main videos
router.post("/upload-video", regularUpload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file provided" })
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ message: "File must be a video" })
    }

    console.log(`Uploading video: ${req.file.originalname}, Size: ${req.file.size} bytes`)

    // Upload to AWS S3
    const videoUrl = await uploadFile2(req.file, "course-videos")
    
    // Clean up temporary file
    try {
      await fs.promises.unlink(req.file.path)
      console.log(`Cleaned up temporary file: ${req.file.path}`)
    } catch (cleanupError) {
      console.error("Error cleaning up temporary file:", cleanupError)
    }
    
    res.status(200).json({ 
      message: "Video uploaded successfully", 
      location: videoUrl 
    })
  } catch (error) {
    console.error("Video upload error:", error)
    
    // Clean up temporary file on error
    if (req.file && req.file.path) {
      try {
        await fs.promises.unlink(req.file.path)
        console.log(`Cleaned up temporary file after error: ${req.file.path}`)
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file after error:", cleanupError)
      }
    }
    
    res.status(500).json({ message: "Video upload failed", error: error.message })
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

    // Upload to AWS S3
    const thumbnailUrl = await uploadFile2(req.file, "thumbnails")
    
    res.status(200).json({ 
      message: "Thumbnail uploaded successfully", 
      location: thumbnailUrl 
    })
  } catch (error) {
    console.error("Thumbnail upload error:", error)
    res.status(500).json({ message: "Thumbnail upload failed", error: error.message })
  }
})

module.exports = router


