const express = require("express")
const fs = require("fs")
const path = require("path")
const multer = require("multer")

const router = express.Router()

// Memory storage is fine for small chunks (e.g., 5-10MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

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

    // Cleanup chunk directory
    const files = await fs.promises.readdir(chunksRoot)
    await Promise.all(files.map((f) => fs.promises.unlink(path.join(chunksRoot, f))))
    await fs.promises.rmdir(chunksRoot)

    // Return public URL (assuming /uploads is statically served)
    // Prefer returning the file key so frontend can build S3 URL or serve via CDN later
    const fileKey = `videos/${outName}`
    return res.status(200).json({ received: true, isLastChunk: true, key: fileKey })
  } catch (err) {
    console.error("Chunk upload error:", err)
    return res.status(500).json({ message: "Upload failed", error: err.message })
  }
})

module.exports = router


