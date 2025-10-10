const express = require('express');
const multer = require('multer');
const {
  uploadPractiseVideo,
  approveRejectPractiseVideo,
  getVideoStatus,
  getAllPractiseVideos,
} = require('../controllers/practiseVideoController');

const router = express.Router();

// Multer configuration for video upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/practiseVideos');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB cap to avoid memory/CPU pressure on this route
  },
});

// Upload practice video
router.post('/upload', upload.single('video'), uploadPractiseVideo);

// Approve or reject practice video
router.put('/approve-reject/:id', approveRejectPractiseVideo);

// Fetch video status by lessonId and userId
router.get('/status/:lessonId/:userId', getVideoStatus);

// Fetch all practice videos for admin
router.get('/all', getAllPractiseVideos);

module.exports = router;