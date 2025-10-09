// controllers/userProgressController.js

const Progres = require("../models/ProgressModel")

// Save user progress
exports.saveProgress = async (req, res) => {
  const { userId, courseId, lessons, currentLessonIndex } = req.body

  try {
    let progress = await Progres.findOne({ userId, courseId })

    if (progress) {
      // Update the existing progress
      progress.lessons = lessons // Ensure this includes the `rating` and `feedback` fields
      progress.currentLessonIndex = currentLessonIndex
      await progress.save()
    } else {
      // Create new progress
      progress = new Progres({
        userId,
        courseId,
        lessons, // Ensure this includes the `rating` and `feedback` fields
        currentLessonIndex,
      })
      await progress.save()
    }

    res.status(200).json(progress)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Failed to save progress" })
  }
}

// Get user progress
exports.getProgress = async (req, res) => {
  const { userId, courseId } = req.params

  try {
    const progress = await Progres.findOne({ userId, courseId }).populate("lessons.lessonId")

    if (!progress) {
      return res.status(404).json({ error: "Progress not found" })
    }

    res.status(200).json(progress)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Failed to fetch progress" })
  }
}
