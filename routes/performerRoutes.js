const express = require("express")
const {
  getTopPerformer,
  getAllCourses,
  getTopPerformersByCourse,
  getPerformerDetails,
  likeVideo,
  addComment,
  getVideoDetails,
  editComment,
  deleteComment,
} = require("../controllers/performerController")

const router = express.Router()

// Get top performer for home page (performer of the week)
router.get("/top-performer", getTopPerformer)

// Get all courses for selection
router.get("/courses", getAllCourses)

// Get top 10 performers by course
router.get("/course/:courseId/top-performers", getTopPerformersByCourse)

// Get specific performer details for a course
router.get("/performer/:userId/course/:courseId", getPerformerDetails)

// Like/unlike a video
router.post("/video/:videoId/like", likeVideo)

// Add comment to a video
router.post("/video/:videoId/comment", addComment)


// Edit a comment
router.put("/video/:videoId/comment/:commentId", editComment)

// Delete a comment
router.delete("/video/:videoId/comment/:commentId", deleteComment)

// Get video details with likes and comments
router.get("/video/:videoId", getVideoDetails)

module.exports = router
