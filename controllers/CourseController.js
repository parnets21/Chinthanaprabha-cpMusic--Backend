/* const { uploadFile2 } = require("../middleware/aws")

const Course = require("../models/CourseModel")
const Lesson = require("../models/LessonModel")
const path = require("path")

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate("lessons")
    res.status(200).json(courses)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get a course by ID
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate("lessons")
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }
    res.status(200).json(course)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Create a new course
exports.createCourse = async (req, res) => {
  try {
    const { name, description, price, instructor } = req.body

    // Validate required fields
    if (!name || !description || !price || !instructor) {
      return res.status(400).json({ message: "All fields (name, description, price, instructor) are required" })
    }

    const imagePath = req.file ? await uploadFile2(req.file, "category") : null
    if (!imagePath) {
      return res.status(400).json({ message: "Course image is required" })
    }

    const course = new Course({
      name,
      description,
      price,
      instructor,
      image: imagePath,
    })

    await course.save()
    res.status(201).json(course)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Update a course
exports.updateCourse = async (req, res) => {
  try {
    const { name, description, price, instructor } = req.body

    // Validate required fields
    if (!name || !description || !price || !instructor) {
      return res.status(400).json({ message: "All fields (name, description, price, instructor) are required" })
    }

    const imagePath = req.file ? await uploadFile2(req.file, "category") : null
    const updateData = {
      name,
      description,
      price,
      instructor,
      ...(imagePath && { image: imagePath }), // Update image only if a new one is provided
    }

    const course = await Course.findByIdAndUpdate(req.params.id, updateData, { new: true })
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    res.status(200).json(course)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Delete a course and its associated lessons
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Delete all lessons associated with the course
    await Lesson.deleteMany({ course: course._id })

    // Delete the course
    await Course.findByIdAndDelete(req.params.id)

    res.status(200).json({ message: "Course and associated lessons deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Add a lesson to a course
exports.addLesson = async (req, res) => {
  try {
    const { courseId } = req.params
    const { lessonNumber, lessonIntro } = req.body

    // Validate required fields
    if (!lessonNumber || !lessonIntro) {
      return res.status(400).json({ message: "All fields (lessonNumber, lessonIntro) are required" })
    }

    // Check if the course exists
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Ensure that at least one video file is uploaded
    const videoFiles = req.files // This should be an array from multer
    if (!videoFiles || videoFiles.length === 0) {
      return res.status(400).json({ message: "At least one video file is required" })
    }

    // Upload all video files to AWS and get their URLs
    const videoUrls = []
    for (const file of videoFiles) {
      try {
        const videoUrl = await uploadFile2(file, "lessons")
        videoUrls.push(videoUrl)
      } catch (uploadError) {
        console.error("Error uploading video:", uploadError)
        return res.status(500).json({ message: "Error uploading video files" })
      }
    }

    // Create the lesson
    const lesson = new Lesson({
      lessonNumber,
      lessonIntro,
      videoUrls,
      course: courseId,
    })

    await lesson.save()

    // Add the lesson to the course's lessons array
    course.lessons.push(lesson._id)
    await course.save()

    res.status(201).json(lesson)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Update a lesson
exports.updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params
    const { lessonNumber, lessonIntro, videoUrls } = req.body

    // Validate required fields
    if (!lessonNumber || !lessonIntro) {
      return res.status(400).json({ message: "All fields (lessonNumber, lessonIntro) are required" })
    }

    // Parse videoUrls if it's a string (from FormData)
    let parsedVideoUrls = videoUrls
    if (typeof videoUrls === "string") {
      try {
        parsedVideoUrls = JSON.parse(videoUrls)
      } catch (e) {
        parsedVideoUrls = [videoUrls]
      }
    }

    // Handle new video uploads if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const videoUrl = await uploadFile2(file, "lessons")
          parsedVideoUrls.push(videoUrl)
        } catch (uploadError) {
          console.error("Error uploading new video:", uploadError)
        }
      }
    }

    const lesson = await Lesson.findByIdAndUpdate(
      lessonId,
      { lessonNumber, lessonIntro, videoUrls: parsedVideoUrls },
      { new: true },
    )

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" })
    }

    res.status(200).json(lesson)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Delete a lesson
exports.deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params

    // Find the lesson
    const lesson = await Lesson.findById(lessonId)
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" })
    }

    // Remove the lesson from the course's lessons array
    await Course.updateOne({ _id: lesson.course }, { $pull: { lessons: lessonId } })

    // Delete the lesson
    await Lesson.findByIdAndDelete(lessonId)

    res.status(200).json({ message: "Lesson deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}
 */


const { uploadFile2 } = require("../middleware/aws")

const Course = require("../models/CourseModel")
const Lesson = require("../models/LessonModel")
const path = require("path")

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    // Populate the instructor field to get teacher details
    const courses = await Course.find().populate("lessons").populate("instructor", "name")
    res.status(200).json(courses)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get a course by ID
exports.getCourseById = async (req, res) => {
  try {
    // Populate the instructor field to get teacher details
    const course = await Course.findById(req.params.id).populate("lessons").populate("instructor", "name")
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }
    res.status(200).json(course)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Create a new course with video file upload support
exports.createCourse = async (req, res) => {
  try {
    const { name, description, price, instructor, duration, overview } = req.body

    // Validate required fields
    if (!name || !description || !price || !instructor) {
      return res.status(400).json({ message: "All fields (name, description, price, instructor) are required" })
    }

    // Handle course image upload
    const imagePath = req.files && req.files.image ? await uploadFile2(req.files.image[0], "category") : null
    if (!imagePath) {
      return res.status(400).json({ message: "Course image is required" })
    }

    // Handle course video upload if provided
    let videoUrl = null
    if (req.files && req.files.video) {
      const videoFile = req.files.video[0]
      if (videoFile) {
        try {
          videoUrl = await uploadFile2(videoFile, "course-videos")
        } catch (uploadError) {
          console.error("Error uploading course video:", uploadError)
          return res.status(500).json({ message: "Error uploading course video" })
        }
      }
    }

    const course = new Course({
      name,
      description,
      price,
      instructor, // instructor is now an ID
      image: imagePath,
      videoUrl: videoUrl, // Course video file URL
      duration: duration || null,
      overview: overview || null,
    })

    await course.save()
    res.status(201).json(course)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Update a course with video file upload support
exports.updateCourse = async (req, res) => {
  try {
    const { name, description, price, instructor, duration, overview } = req.body

    // Validate required fields
    if (!name || !description || !price || !instructor) {
      return res.status(400).json({ message: "All fields (name, description, price, instructor) are required" })
    }

    // Handle course image upload
    const imagePath = req.files && req.files.image ? await uploadFile2(req.files.image[0], "category") : null

    // Handle course video upload if provided
    let videoUrl = null
    if (req.files && req.files.video) {
      const videoFile = req.files.video[0]
      if (videoFile) {
        try {
          videoUrl = await uploadFile2(videoFile, "course-videos")
        } catch (uploadError) {
          console.error("Error uploading course video:", uploadError)
          return res.status(500).json({ message: "Error uploading course video" })
        }
      }
    }

    const updateData = {
      name,
      description,
      price,
      instructor, // instructor is now an ID
      ...(imagePath && { image: imagePath }), // Update image only if a new one is provided
      ...(videoUrl && { videoUrl }), // Update video URL if provided
      ...(duration && { duration }),
      ...(overview && { overview }),
    }

    const course = await Course.findByIdAndUpdate(req.params.id, updateData, { new: true })
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    res.status(200).json(course)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Delete a course and its associated lessons
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Delete all lessons associated with the course
    await Lesson.deleteMany({ course: course._id })

    // Delete the course
    await Course.findByIdAndDelete(req.params.id)

    res.status(200).json({ message: "Course and associated lessons deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Add a lesson to a course - Video file upload support
exports.addLesson = async (req, res) => {
  try {
    const { courseId } = req.params
    const { lessonNumber, lessonIntro } = req.body

    // Validate required fields
    if (!lessonNumber || !lessonIntro) {
      return res.status(400).json({ message: "All fields (lessonNumber, lessonIntro) are required" })
    }

    // Check if the course exists
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Ensure that at least one video file is uploaded
    const videoFiles = req.files && req.files.video ? req.files.video : []
    if (!videoFiles || videoFiles.length === 0) {
      return res.status(400).json({ message: "At least one video file is required for lessons" })
    }

    // Upload all video files to AWS and get their URLs
    const videoUrls = []
    for (const file of videoFiles) {
      try {
        const videoUrl = await uploadFile2(file, "lessons")
        videoUrls.push(videoUrl)
      } catch (uploadError) {
        console.error("Error uploading video:", uploadError)
        return res.status(500).json({ message: "Error uploading video files" })
      }
    }

    // Handle thumbnail upload
    let thumbnailUrl = null
    if (req.files && req.files.thumbnail) {
      const thumbnailFile = req.files.thumbnail[0]
      if (thumbnailFile) {
        try {
          thumbnailUrl = await uploadFile2(thumbnailFile, "thumbnails")
        } catch (uploadError) {
          console.error("Error uploading thumbnail:", uploadError)
          return res.status(500).json({ message: "Error uploading thumbnail" })
        }
      }
    }

    // Create the lesson
    const lesson = new Lesson({
      lessonNumber,
      lessonIntro,
      videoUrls, // Uploaded video file URLs
      thumbnail: thumbnailUrl,
      course: courseId,
    })

    await lesson.save()

    // Add the lesson to the course's lessons array
    course.lessons.push(lesson._id)
    await course.save()

    res.status(201).json(lesson)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Update a lesson - Video file upload support
exports.updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params
    const { lessonNumber, lessonIntro } = req.body

    // Validate required fields
    if (!lessonNumber || !lessonIntro) {
      return res.status(400).json({ message: "All fields (lessonNumber, lessonIntro) are required" })
    }

    // Handle new video uploads if any
    let videoUrls = []
    if (req.files && req.files.video) {
      for (const file of req.files.video) {
        try {
          const videoUrl = await uploadFile2(file, "lessons")
          videoUrls.push(videoUrl)
        } catch (uploadError) {
          console.error("Error uploading new video:", uploadError)
        }
      }
    }

    // Handle thumbnail upload
    let thumbnailUrl = null
    if (req.files && req.files.thumbnail) {
      const thumbnailFile = req.files.thumbnail[0]
      if (thumbnailFile) {
        try {
          thumbnailUrl = await uploadFile2(thumbnailFile, "thumbnails")
        } catch (uploadError) {
          console.error("Error uploading thumbnail:", uploadError)
        }
      }
    }

    const updateData = {
      lessonNumber,
      lessonIntro,
    }

    // Only update videoUrls if new files were uploaded
    if (videoUrls.length > 0) {
      updateData.videoUrls = videoUrls
    }

    // Only update thumbnail if a new one was uploaded
    if (thumbnailUrl) {
      updateData.thumbnail = thumbnailUrl
    }

    const lesson = await Lesson.findByIdAndUpdate(lessonId, updateData, { new: true })

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" })
    }

    res.status(200).json(lesson)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Delete a lesson
exports.deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params

    // Find the lesson
    const lesson = await Lesson.findById(lessonId)
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" })
    }

    // Remove the lesson from the course's lessons array
    await Course.updateOne({ _id: lesson.course }, { $pull: { lessons: lessonId } })

    // Delete the lesson
    await Lesson.findByIdAndDelete(lessonId)

    res.status(200).json({ message: "Lesson deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}