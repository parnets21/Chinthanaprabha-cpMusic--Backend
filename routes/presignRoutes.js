const express = require("express")
const router = express.Router()
const { S3Client, CreateMultipartUploadCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } = require("@aws-sdk/client-s3")
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner")
const { UploadPartCommand } = require("@aws-sdk/client-s3")

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET_NAME

// Initiate multipart upload
router.post("/generate-presigned-url/initiate", async (req, res) => {
  try {
    const { fileName, contentType } = req.body
    if (!fileName || !contentType) {
      return res.status(400).json({ message: "fileName and contentType are required" })
    }
    const key = `videos/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const cmd = new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: contentType })
    const resp = await s3.send(cmd)
    return res.json({ uploadId: resp.UploadId, key })
  } catch (err) {
    console.error("initiate error", err)
    return res.status(500).json({ message: "Failed to initiate upload", error: err.message })
  }
})

// Get presigned URL for a single part
router.post("/generate-presigned-url/part", async (req, res) => {
  try {
    const { key, uploadId, partNumber } = req.body
    if (!key || !uploadId || !partNumber) {
      return res.status(400).json({ message: "key, uploadId, and partNumber are required" })
    }
    const cmd = new UploadPartCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: Number(partNumber) })
    const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 })
    return res.json({ url })
  } catch (err) {
    console.error("part presign error", err)
    return res.status(500).json({ message: "Failed to sign part", error: err.message })
  }
})

// Complete multipart upload
router.post("/generate-presigned-url/complete", async (req, res) => {
  try {
    const { key, uploadId, parts } = req.body
    if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ message: "key, uploadId and parts[] are required" })
    }
    const cmd = new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.map(p => ({ ETag: p.ETag, PartNumber: Number(p.partNumber) })).sort((a,b)=>a.PartNumber-b.PartNumber) },
    })
    const resp = await s3.send(cmd)
    return res.json({ location: resp.Location || `https://${BUCKET}.s3.amazonaws.com/${key}`, key })
  } catch (err) {
    console.error("complete error", err)
    return res.status(500).json({ message: "Failed to complete upload", error: err.message })
  }
})

// Optional: abort upload
router.post("/generate-presigned-url/abort", async (req, res) => {
  try {
    const { key, uploadId } = req.body
    if (!key || !uploadId) return res.status(400).json({ message: "key and uploadId required" })
    const cmd = new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId })
    await s3.send(cmd)
    return res.json({ aborted: true })
  } catch (err) {
    console.error("abort error", err)
    return res.status(500).json({ message: "Failed to abort upload", error: err.message })
  }
})

module.exports = router


