const PractiseVideo = require("../models/PractiseVideo")
const Course = require("../models/CourseModel")
const User = require("../models/UserModel")

// Helper function to get the performer display week range
const getPerformerWeekRange = () => {
  const currentDate = new Date()
  const currentDay = currentDate.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  let weekStartDate, weekEndDate
  
  // Always show performers from the most recently completed Monday-Saturday week
  if (currentDay === 0) {
    // It's Sunday - show performers from the just completed week (yesterday was Saturday)
    weekStartDate = new Date(currentDate)
    weekStartDate.setDate(currentDate.getDate() - 6) // Last Monday
    weekStartDate.setHours(0, 0, 0, 0)
    
    weekEndDate = new Date(currentDate)
    weekEndDate.setDate(currentDate.getDate() - 1) // Yesterday (Saturday)
    weekEndDate.setHours(23, 59, 59, 999)
  } else {
    // It's Monday to Saturday - show performers from the previous completed Monday-Saturday week
    const daysToLastMonday = currentDay + 6 // Go back to previous week's Monday
    weekStartDate = new Date(currentDate)
    weekStartDate.setDate(currentDate.getDate() - daysToLastMonday)
    weekStartDate.setHours(0, 0, 0, 0)
    
    weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 5) // That week's Saturday
    weekEndDate.setHours(23, 59, 59, 999)
  }
  
  return { weekStartDate, weekEndDate }
}

// Get current week info for display
const getCurrentWeekInfo = () => {
  const currentDate = new Date()
  const currentDay = currentDate.getDay()
  
  if (currentDay === 0) {
    return "🏆 Performers of the Week - Just Announced!"
  } else {
    const daysUntilSunday = 7 - currentDay
    return `🏆 Current Week Performers (${daysUntilSunday} days until new performers)`
  }
}

// Get top performer for home page - Shows for FULL WEEK (Sunday to Saturday)
exports.getTopPerformer = async (req, res) => {
  try {
    const { weekStartDate, weekEndDate } = getPerformerWeekRange()
    
    console.log("Performer week range:", weekStartDate, "to", weekEndDate)

    // Get the top performer per course based on the completed Monday-Saturday week
    const topPerformers = await PractiseVideo.aggregate([
      {
        $match: {
          status: "approved",
          rating: { $gte: 3 }, // Minimum rating threshold
          createdAt: {
            $gte: weekStartDate,
            $lte: weekEndDate,
          },
        },
      },
      {
        $lookup: {
          from: "lessons",
          localField: "lessonId",
          foreignField: "_id",
          as: "lesson",
        },
      },
      {
        $unwind: "$lesson",
      },
      {
        $lookup: {
          from: "courses",
          localField: "lesson.course",
          foreignField: "_id",
          as: "course",
        },
      },
      {
        $unwind: "$course",
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $group: {
          _id: {
            userId: "$userId",
            courseId: "$course._id",
          },
          averageRating: { $avg: "$rating" },
          totalVideos: { $sum: 1 },
          userName: { $first: "$user.name" },
          userImage: { $first: "$user.image" },
          courseName: { $first: "$course.name" },
          courseImage: { $first: "$course.image" },
          latestVideo: { $last: "$videoUrl" },
          earliestRatingDate: { $min: "$createdAt" },
        },
      },
      {
        // Sort by course, then by average rating (desc), then by earliest date (asc)
        $sort: {
          "_id.courseId": 1,
          averageRating: -1,
          earliestRatingDate: 1,
        },
      },
      {
        // Group by course to get only the top performer per course
        $group: {
          _id: "$_id.courseId",
          topPerformer: { $first: "$$ROOT" },
        },
      },
      {
        // Reshape the data
        $replaceRoot: { newRoot: "$topPerformer" },
      },
      {
        $limit: 6, // Limit to 6 courses max for home display
      },
    ])

    // If no performers found in the completed week
    if (topPerformers.length === 0) {
      return res.status(200).json({
        performers: [],
        message: "No qualified performers found for the completed week",
        weekInfo: `No performers met the criteria for week (${weekStartDate.toDateString()} - ${weekEndDate.toDateString()})`
      })
    }
    
    const formattedPerformers = topPerformers.map((performer) => ({
      _id: performer._id.userId,
      title: performer.userName,
      category: performer.courseName,
      image: performer.userImage,
      courseId: performer._id.courseId,
      averageRating: performer.averageRating,
      totalVideos: performer.totalVideos,
      testNote: `Performer of the Week (${weekStartDate.toDateString()} - ${weekEndDate.toDateString()})`,
    }))

    res.status(200).json(formattedPerformers)
  } catch (error) {
    console.error("Error fetching top performer:", error)
    res.status(500).json({ message: "Error fetching top performer", error: error.message })
  }
}

// Get top 10 performers by course - Shows for FULL WEEK (Sunday to Saturday)
exports.getTopPerformersByCourse = async (req, res) => {
  try {
    const { courseId } = req.params
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    console.log("Fetching performers for courseId:", courseId)

    const { weekStartDate, weekEndDate } = getPerformerWeekRange()
    
    console.log("Performer week range:", weekStartDate, "to", weekEndDate)

    // Validate course exists
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    console.log("Course found:", course.name)

    // Get performers from the completed Monday-Saturday week
    const performers = await PractiseVideo.aggregate([
      {
        $match: {
          status: "approved",
          createdAt: {
            $gte: weekStartDate,
            $lte: weekEndDate,
          },
        },
      },
      {
        $lookup: {
          from: "lessons",
          localField: "lessonId",
          foreignField: "_id",
          as: "lesson",
        },
      },
      {
        $unwind: "$lesson",
      },
      {
        $lookup: {
          from: "courses",
          localField: "lesson.course",
          foreignField: "_id",
          as: "course",
        },
      },
      {
        $unwind: "$course",
      },
      {
        $match: {
          "course._id": course._id,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        // Sort by rating (desc) and creation date (desc) to get best video first
        $sort: {
          userId: 1,
          rating: -1,
          createdAt: -1,
        },
      },
      {
        // Group by user to get only their BEST video (highest rating, most recent if tied)
        $group: {
          _id: "$userId",
          userName: { $first: "$user.name" },
          userImage: { $first: "$user.image" },
          bestVideo: {
            $first: {
              videoId: "$_id",
              videoUrl: "$videoUrl",
              rating: "$rating",
              feedback: "$feedback",
              createdAt: "$createdAt",
              lessonId: "$lessonId",
              lessonTitle: "$lesson.title",
              likes: { $size: { $ifNull: ["$likes", []] } },
              comments: { $ifNull: ["$comments", []] },
            },
          },
          // Calculate user's overall stats for this course in the completed week
          averageRating: { $avg: "$rating" },
          totalVideos: { $sum: 1 },
          maxRating: { $max: "$rating" },
        },
      },
      {
        // Sort by average rating (desc), then by max rating (desc), then by total videos (desc)
        $sort: {
          averageRating: -1,
          maxRating: -1,
          totalVideos: -1,
        },
      },
      {
        // Add rank field
        $group: {
          _id: null,
          performers: { $push: "$$ROOT" },
        },
      },
      {
        $unwind: {
          path: "$performers",
          includeArrayIndex: "rank",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$performers",
              {
                rank: { $add: ["$rank", 1] },
              },
            ],
          },
        },
      },
      {
        // Apply pagination
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ])

    console.log("Found performers for the week:", performers.length)
    
    if (performers.length === 0) {
      return res.status(200).json({
        performers: [],
        course: {
          id: course._id,
          name: course.name,
          image: course.image,
        },
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalPerformers: 0,
          limit,
        },
        weekInfo: `No performers found for the week (${weekStartDate.toDateString()} - ${weekEndDate.toDateString()})`,
      })
    }

    // Format the response to match the expected structure
    const formattedPerformers = performers.map((performer) => ({
      rank: performer.rank,
      userId: performer._id,
      userName: performer.userName,
      userImage: performer.userImage || "https://via.placeholder.com/50x50",
      averageRating: performer.averageRating,
      totalVideos: performer.totalVideos,
      videos: [performer.bestVideo], // Only one video per user
    }))

    // Get total count for pagination (without skip/limit)
    const totalCountResult = await PractiseVideo.aggregate([
      {
        $match: {
          status: "approved",
          createdAt: {
            $gte: weekStartDate,
            $lte: weekEndDate,
          },
        },
      },
      {
        $lookup: {
          from: "lessons",
          localField: "lessonId",
          foreignField: "_id",
          as: "lesson",
        },
      },
      {
        $unwind: "$lesson",
      },
      {
        $lookup: {
          from: "courses",
          localField: "lesson.course",
          foreignField: "_id",
          as: "course",
        },
      },
      {
        $unwind: "$course",
      },
      {
        $match: {
          "course._id": course._id,
        },
      },
      {
        $group: {
          _id: "$userId",
        },
      },
      {
        $count: "totalUsers",
      },
    ])

    const totalPerformers = totalCountResult.length > 0 ? totalCountResult[0].totalUsers : 0
    const totalPages = Math.ceil(totalPerformers / limit)

    console.log("Returning performers:", formattedPerformers.length)

    res.status(200).json({
      performers: formattedPerformers,
      course: {
        id: course._id,
        name: course.name,
        image: course.image,
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalPerformers,
        limit,
      },
      weekInfo: `${getCurrentWeekInfo()} (${weekStartDate.toDateString()} - ${weekEndDate.toDateString()})`,
    })
  } catch (error) {
    console.error("Error fetching top performers by course:", error)
    res.status(500).json({ message: "Error fetching top performers by course", error: error.message })
  }
}

// Rest of the functions remain the same...
exports.likeVideo = async (req, res) => {
  try {
    const { videoId } = req.params
    const { userId } = req.body

    const video = await PractiseVideo.findById(videoId)
    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }

    if (!video.likes) {
      video.likes = []
    }

    const userLikeIndex = video.likes.findIndex((like) => like.toString() === userId)

    if (userLikeIndex > -1) {
      video.likes.splice(userLikeIndex, 1)
    } else {
      video.likes.push(userId)
    }

    await video.save()

    res.status(200).json({
      message: userLikeIndex > -1 ? "Video unliked" : "Video liked",
      likes: video.likes.length,
      isLiked: userLikeIndex === -1,
    })
  } catch (error) {
    console.error("Error liking video:", error)
    res.status(500).json({ message: "Error liking video", error: error.message })
  }
}

exports.addComment = async (req, res) => {
  try {
    const { videoId } = req.params
    const { userId, comment } = req.body

    const video = await PractiseVideo.findById(videoId)
    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }

    if (!video.comments) {
      video.comments = []
    }

    const newComment = {
      userId,
      comment,
      createdAt: new Date(),
    }

    video.comments.push(newComment)
    await video.save()

    const user = await User.findById(userId, "name image")

    const responseComment = {
      ...newComment,
      user: user,
    }

    res.status(200).json({
      message: "Comment added successfully",
      comment: responseComment,
      totalComments: video.comments.length,
    })
  } catch (error) {
    console.error("Error adding comment:", error)
    res.status(500).json({ message: "Error adding comment", error: error.message })
  }
}

exports.getVideoDetails = async (req, res) => {
  try {
    const { videoId } = req.params

    const video = await PractiseVideo.findById(videoId)
      .populate("userId", "name image")
      .populate({
        path: "lessonId",
        populate: {
          path: "course",
          model: "Course",
        },
      })

    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }

    const commentsWithUsers = []
    if (video.comments && video.comments.length > 0) {
      for (const comment of video.comments) {
        const user = await User.findById(comment.userId, "name image")
        commentsWithUsers.push({
          ...comment.toObject(),
          user: user,
        })
      }
    }

    res.status(200).json({
      video: {
        id: video._id,
        videoUrl: video.videoUrl,
        rating: video.rating,
        feedback: video.feedback,
        createdAt: video.createdAt,
        likes: video.likes ? video.likes.length : 0,
        comments: commentsWithUsers,
        user: video.userId,
        lesson: video.lessonId,
      },
    })
  } catch (error) {
    console.error("Error fetching video details:", error)
    res.status(500).json({ message: "Error fetching video details", error: error.message })
  }
}

exports.getPerformerDetails = async (req, res) => {
  try {
    const { userId, courseId } = req.params

    const performerVideos = await PractiseVideo.find({
      userId,
      status: "approved",
    })
      .populate({
        path: "lessonId",
        match: { course: courseId },
        populate: {
          path: "course",
          model: "Course",
        },
      })
      .populate("userId")
      .sort({ createdAt: -1 })

    const filteredVideos = performerVideos.filter((video) => video.lessonId !== null)

    if (filteredVideos.length === 0) {
      return res.status(404).json({ message: "No videos found for this performer in the specified course" })
    }

    const performer = filteredVideos[0].userId
    const course = filteredVideos[0].lessonId.course

    const totalVideos = filteredVideos.length
    const averageRating = filteredVideos.reduce((sum, video) => sum + video.rating, 0) / totalVideos

    res.status(200).json({
      performer: {
        id: performer._id,
        name: performer.name,
        image: performer.image,
        email: performer.email,
      },
      course: {
        id: course._id,
        name: course.name,
        image: course.image,
      },
      statistics: {
        totalVideos,
        averageRating: Math.round(averageRating * 10) / 10,
      },
      videos: filteredVideos.map((video) => ({
        id: video._id,
        videoUrl: video.videoUrl,
        rating: video.rating,
        feedback: video.feedback,
        createdAt: video.createdAt,
        likes: video.likes ? video.likes.length : 0,
        comments: video.comments ? video.comments.length : 0,
        lesson: {
          id: video.lessonId._id,
          title: video.lessonId.title,
        },
      })),
    })
  } catch (error) {
    console.error("Error fetching performer details:", error)
    res.status(500).json({ message: "Error fetching performer details", error: error.message })
  }
}

exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({}, { name: 1, image: 1 }).sort({ name: 1 })
    res.status(200).json(courses)
  } catch (error) {
    console.error("Error fetching courses:", error)
    res.status(500).json({ message: "Error fetching courses", error: error.message })
  }
}




// Edit comment
exports.editComment = async (req, res) => {
  try {
    const { videoId, commentId } = req.params
    const { userId, comment } = req.body

    const video = await PractiseVideo.findById(videoId)
    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }

    const commentIndex = video.comments.findIndex(
      (c) => c._id.toString() === commentId
    )

    if (commentIndex === -1) {
      return res.status(404).json({ message: "Comment not found" })
    }

    // Check if the user owns the comment
    if (video.comments[commentIndex].userId.toString() !== userId) {
      return res.status(403).json({ message: "You can only edit your own comments" })
    }

    // Update the comment
    video.comments[commentIndex].comment = comment
    video.comments[commentIndex].updatedAt = new Date()

    await video.save()

    const user = await User.findById(userId, "name image")

    const responseComment = {
      ...video.comments[commentIndex].toObject(),
      user: user,
    }

    res.status(200).json({
      message: "Comment updated successfully",
      comment: responseComment,
    })
  } catch (error) {
    console.error("Error editing comment:", error)
    res.status(500).json({ message: "Error editing comment", error: error.message })
  }
}

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const { videoId, commentId } = req.params
    const { userId } = req.body

    const video = await PractiseVideo.findById(videoId)
    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }

    const commentIndex = video.comments.findIndex(
      (c) => c._id.toString() === commentId
    )

    if (commentIndex === -1) {
      return res.status(404).json({ message: "Comment not found" })
    }

    // Check if the user owns the comment
    if (video.comments[commentIndex].userId.toString() !== userId) {
      return res.status(403).json({ message: "You can only delete your own comments" })
    }

    // Remove the comment
    video.comments.splice(commentIndex, 1)
    await video.save()

    res.status(200).json({
      message: "Comment deleted successfully",
      totalComments: video.comments.length,
    })
  } catch (error) {
    console.error("Error deleting comment:", error)
    res.status(500).json({ message: "Error deleting comment", error: error.message })
  }
}