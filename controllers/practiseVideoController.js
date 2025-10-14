const { uploadFile2, uploadDirectToS3 } = require("../middleware/aws")
const PractiseVideo = require("../models/PractiseVideo")
const Lesson = require("../models/LessonModel")

// Upload practice video
exports.uploadPractiseVideo = async (req, res) => {
  try {
    const { lessonId, userId } = req.body
    if (!lessonId || !userId) {
      return res.status(400).json({ message: "Lesson ID and User ID are required" })
    }

    // Check if a video already exists for this lesson and user
    const existingVideo = await PractiseVideo.findOne({ lessonId, userId })

    if (existingVideo) {
      // Update the existing video
      existingVideo.videoUrl = req.file ? await uploadDirectToS3(req.file.buffer, req.file.originalname, req.file.mimetype, "category") : null
      existingVideo.status = "pending" // Reset status to pending
      existingVideo.rating = 0 // Reset rating to 0
      existingVideo.feedback = "" // Reset feedback
      await existingVideo.save()
      return res.status(200).json({ message: "Practice video re-uploaded successfully", practiseVideo: existingVideo })
    } else {
      // Create a new video entry
      const practiseVideo = new PractiseVideo({
        videoUrl: req.file ? await uploadDirectToS3(req.file.buffer, req.file.originalname, req.file.mimetype, "category") : null,
        lessonId,
        userId,
        rating: 0, // Default rating is 0
        feedback: "", // Default feedback is empty
      })

      await practiseVideo.save()
      return res.status(201).json({ message: "Practice video uploaded successfully", practiseVideo })
    }
  } catch (error) {
    res.status(500).json({ message: "Error uploading practice video", error: error.message })
  }
}

// Approve or reject practice video
exports.approveRejectPractiseVideo = async (req, res) => {
  try {
    const { status, rating, feedback } = req.body // Include feedback in the request
    const { id } = req.params

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" })
    }

    // Validate feedback is provided
    if (!feedback || feedback.trim() === "") {
      return res.status(400).json({ message: "Feedback is required" })
    }

    // Update the PractiseVideo document
    const practiseVideo = await PractiseVideo.findByIdAndUpdate(
      id,
      { status, rating, feedback: feedback.trim() }, // Include feedback
      { new: true },
    )

    if (!practiseVideo) {
      return res.status(404).json({ message: "Practice video not found" })
    }

    // If approved and rating is 4 or more, unlock the next lesson
    if (status === "approved" && rating >= 4) {
      const lesson = await Lesson.findById(practiseVideo.lessonId)
      console.log("Current Lesson:", lesson) // Debugging

      if (lesson) {
        // Find the next lesson in the same course
        const nextLesson = await Lesson.findOne({
          course: lesson.course,
          _id: { $gt: lesson._id }, // Get the next lesson based on _id
        }).sort({ _id: 1 }) // Sort to get the next lesson

        console.log("Next Lesson Found:", nextLesson) // Debugging

        if (nextLesson) {
          nextLesson.locked = false // Unlock the next lesson
          await nextLesson.save() // Ensure the lesson is saved
          console.log("Next Lesson Unlocked:", nextLesson) // Debugging
        } else {
          console.log("No next lesson found") // Debugging
        }
      } else {
        console.log("Current lesson not found") // Debugging
      }
    }

    res.status(200).json({ message: `Practice video ${status}`, practiseVideo })
  } catch (error) {
    console.error("Error in approveRejectPractiseVideo:", error) // Debugging
    res.status(500).json({ message: "Error updating practice video status", error: error.message })
  }
}

// Fetch video status by lessonId and userId
exports.getVideoStatus = async (req, res) => {
  try {
    const { lessonId, userId } = req.params
    const practiseVideo = await PractiseVideo.findOne({ lessonId, userId })

    if (!practiseVideo) {
      return res.status(404).json({ message: "Practice video not found" })
    }

    res.status(200).json({
      status: practiseVideo.status,
      rating: practiseVideo.rating,
      feedback: practiseVideo.feedback || "", // Include feedback in response
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching video status", error: error.message })
  }
}

// Fetch all practice videos for admin with pagination
exports.getAllPractiseVideos = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1 // Default to page 1
    const limit = Number.parseInt(req.query.limit) || 10 // Default to 10 videos per page
    const skip = (page - 1) * limit

    // Fetch paginated practice videos
    const practiseVideos = await PractiseVideo.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "lessonId",
        populate: {
          path: "course",
          model: "Course",
        },
      })
      .populate("userId")

    // Get total count for pagination metadata
    const totalVideos = await PractiseVideo.countDocuments()
    const totalPages = Math.ceil(totalVideos / limit)

    res.status(200).json({
      practiseVideos,
      pagination: {
        currentPage: page,
        totalPages,
        totalVideos,
        limit,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching practice videos", error: error.message })
  }
}
