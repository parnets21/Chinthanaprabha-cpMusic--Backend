const { uploadFile, multifileUpload } = require("../middleware/aws");
const Course = require("../models/CourseModel");
const Lesson = require("../models/LessonModel");

// Validate required fields
const validateFields = (fields, res) => {
  const missing = Object.keys(fields).filter((key) => !fields[key]);
  if (missing.length) {
    res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
    return false;
  }
  return true;
};

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("lessons")
      .populate("instructor", "name");
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a course by ID
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("lessons")
      .populate("instructor", "name");
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new course
exports.createCourse = async (req, res) => {
  try {
    const { name, description, price, instructor, duration, overview } = req.body;

    // Validate required fields
    if (!validateFields({ name, description, price, instructor }, res)) return;

    // Handle course image upload
    const imageFile = req.files?.thumbnail?.[0];
    if (!imageFile) {
      return res.status(400).json({ message: "Course image is required" });
    }
    const imagePath = await uploadFile(imageFile, "thumbnails");

    const course = new Course({
      name,
      description,
      price,
      instructor,
      image: imagePath.location,
      duration: duration || null,
      overview: overview || null,
    });

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a course
exports.updateCourse = async (req, res) => {
  try {
    const { name, description, price, instructor, duration, overview } = req.body;

    // Validate required fields
    if (!validateFields({ name, description, price, instructor }, res)) return;

    // Handle course image upload
    const imageFile = req.files?.thumbnail?.[0];
    const updateData = {
      name,
      description,
      price,
      instructor,
      ...(imageFile && { image: (await uploadFile(imageFile, "thumbnails")).location }),
      ...(duration && { duration }),
      ...(overview && { overview }),
    };

    const course = await Course.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a course and its associated lessons
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    await Lesson.deleteMany({ course: course._id });
    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Course and associated lessons deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add a lesson to a course
exports.addLesson = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonNumber, lessonIntro, videoUrls, name, duration } = req.body;

    // Validate required fields
    if (!validateFields({ lessonNumber, lessonIntro }, res)) return;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Handle video URLs and uploads
    let finalVideoUrls = [];
    if (videoUrls) {
      finalVideoUrls = Array.isArray(videoUrls)
        ? videoUrls
        : typeof videoUrls === "string"
        ? JSON.parse(videoUrls).catch(() => [videoUrls])
        : [];
    }

    const videoFiles = req.files?.video || [];
    if (videoFiles.length) {
      const uploadedVideos = await multifileUpload(videoFiles, "course-videos");
      finalVideoUrls.push(...uploadedVideos.map((v) => v.location));
    }

    // Validate at least one video
    if (finalVideoUrls.length === 0) {
      return res.status(400).json({ message: "At least one video is required" });
    }

    // Handle thumbnail upload
    const thumbnailFile = req.files?.thumbnail?.[0];
    const thumbnailUrl = thumbnailFile
      ? (await uploadFile(thumbnailFile, "thumbnails")).location
      : null;

    // Create lesson
    const lesson = new Lesson({
      lessonNumber,
      lessonIntro,
      videoUrls: finalVideoUrls,
      thumbnail: thumbnailUrl,
      course: courseId,
      name: name || null,
      duration: duration || null,
    });

    await lesson.save();
    course.lessons.push(lesson._id);
    await course.save();

    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a lesson
exports.updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { lessonNumber, lessonIntro, videoUrls, name, duration } = req.body;

    // Validate required fields
    if (!validateFields({ lessonNumber, lessonIntro }, res)) return;

    // Handle video URLs and uploads
    let finalVideoUrls = [];
    if (videoUrls) {
      finalVideoUrls = Array.isArray(videoUrls)
        ? videoUrls
        : typeof videoUrls === "string"
        ? JSON.parse(videoUrls).catch(() => [videoUrls])
        : [];
    }

    const videoFiles = req.files?.video || [];
    if (videoFiles.length) {
      const uploadedVideos = await multifileUpload(videoFiles, "course-videos");
      finalVideoUrls.push(...uploadedVideos.map((v) => v.location));
    }

    // Handle thumbnail upload
    const thumbnailFile = req.files?.thumbnail?.[0];
    const thumbnailUrl = thumbnailFile
      ? (await uploadFile(thumbnailFile, "thumbnails")).location
      : null;

    const updateData = {
      lessonNumber,
      lessonIntro,
      ...(finalVideoUrls.length && { videoUrls: finalVideoUrls }),
      ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
      ...(name && { name }),
      ...(duration && { duration }),
    };

    const lesson = await Lesson.findByIdAndUpdate(lessonId, updateData, {
      new: true,
    });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.status(200).json(lesson);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a lesson
exports.deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    await Course.updateOne(
      { _id: lesson.course },
      { $pull: { lessons: lessonId } }
    );
    await Lesson.findByIdAndDelete(lessonId);

    res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};