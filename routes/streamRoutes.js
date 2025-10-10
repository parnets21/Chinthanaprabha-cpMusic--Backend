const express = require("express")
const fs = require("fs")
const path = require("path")

const router = express.Router()

// GET /stream/:type/:filename
// Streams files from uploads directory with HTTP Range support
router.get("/stream/:type/:filename", async (req, res) => {
  try {
    const { type, filename } = req.params
    const safeType = String(type).replace(/[^a-zA-Z0-9_-]/g, "")
    const safeFile = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_")

    const filePath = path.join(__dirname, "..", "uploads", safeType, safeFile)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" })
    }

    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const range = req.headers.range

    // Basic content type detection by extension
    const ext = path.extname(filePath).toLowerCase()
    let contentType = "application/octet-stream"
    if (ext === ".mp4") contentType = "video/mp4"
    else if (ext === ".webm") contentType = "video/webm"
    else if (ext === ".mov") contentType = "video/quicktime"
    else if (ext === ".m4v") contentType = "video/x-m4v"
    else if (ext === ".mp3") contentType = "audio/mpeg"
    else if (ext === ".wav") contentType = "audio/wav"

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

      if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
        return res.status(416).set({
          "Content-Range": `bytes */${fileSize}`,
        }).end()
      }

      const chunkSize = end - start + 1
      const file = fs.createReadStream(filePath, { start, end })
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      })
      file.pipe(res)
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      })
      fs.createReadStream(filePath).pipe(res)
    }
  } catch (err) {
    console.error("stream error", err)
    return res.status(500).json({ message: "Failed to stream file" })
  }
})

module.exports = router



