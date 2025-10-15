const { uploadFile, multifileUpload } = require("../middleware/aws");
const Course = require("../models/CourseModel");
const Lesson = require("../models/LessonModel");
const mongoose = require("mongoose");

// Enhanced validation function
const validateFields = (fields, res) => {
  const missing = Object.keys(fields).filter((key) => !fields[key]);
  if (missing.length) {
    res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
    return false;
  }
  return true;
};

// Validate lesson number uniqueness within a course
const validateLessonNumberUniqueness = async (courseId, lessonNumber, excludeLessonId = null) => {
  const query = { course: courseId, lessonNumber };
  if (excludeLessonId) {
    query._id = { $ne: excludeLessonId };
  }
  const existingLesson = await Lesson.findOne(query);
  return !existingLesson;
};

// Sanitize and validate input
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim();
  }
  return input;
};

// Process video URLs safely
const processVideoUrls = (videoUrls) => {
  if (!videoUrls) return [];
  
  if (Array.isArray(videoUrls)) {
    return videoUrls.filter(url => url && typeof url === 'string' && url.trim());
  }
  
  if (typeof videoUrls === 'string') {
    try {
      const parsed = JSON.parse(videoUrls);
      return Array.isArray(parsed) ? parsed.filter(url => url && typeof url === 'string' && url.trim()) : [videoUrls];
    } catch {
      return [videoUrls];
    }
  }
  
  return [];
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

// Create a new course with transaction support
exports.createCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { name, description, price, instructor, duration, overview } = req.body;

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedPrice = parseFloat(price);
    const sanitizedInstructor = sanitizeInput(instructor);

    // Validate required fields
    if (!validateFields({ 
      name: sanitizedName, 
      description: sanitizedDescription, 
      price: sanitizedPrice, 
      instructor: sanitizedInstructor 
    }, res)) {
      await session.abortTransaction();
      return;
    }

    // Validate price is a positive number
    if (isNaN(sanitizedPrice) || sanitizedPrice <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Price must be a positive number" });
    }

    // Validate instructor ID format
    if (!mongoose.Types.ObjectId.isValid(sanitizedInstructor)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid instructor ID format" });
    }

    // Handle course image upload
    const imageFile = req.files?.thumbnail?.[0];
    if (!imageFile) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Course image is required" });
    }

    let imagePath;
    try {
      imagePath = await uploadFile(imageFile, "thumbnails");
    } catch (uploadError) {
      await session.abortTransaction();
      return res.status(500).json({ message: "Failed to upload course image", error: uploadError.message });
    }

    const course = new Course({
      name: sanitizedName,
      description: sanitizedDescription,
      price: sanitizedPrice,
      instructor: sanitizedInstructor,
      image: imagePath.location,
      duration: duration ? sanitizeInput(duration) : null,
      overview: overview ? sanitizeInput(overview) : null,
    });

    await course.save({ session });
    await session.commitTransaction();
    
    res.status(201).json(course);
  } catch (error) {
    await session.abortTransaction();
    console.error("Course creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    session.endSession();
  }
};

// Update a course with enhanced validation
exports.updateCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { name, description, price, instructor, duration, overview } = req.body;

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedPrice = parseFloat(price);
    const sanitizedInstructor = sanitizeInput(instructor);

    // Validate required fields
    if (!validateFields({ 
      name: sanitizedName, 
      description: sanitizedDescription, 
      price: sanitizedPrice, 
      instructor: sanitizedInstructor 
    }, res)) {
      await session.abortTransaction();
      return;
    }

    // Validate price is a positive number
    if (isNaN(sanitizedPrice) || sanitizedPrice <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Price must be a positive number" });
    }

    // Validate instructor ID format
    if (!mongoose.Types.ObjectId.isValid(sanitizedInstructor)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid instructor ID format" });
    }

    // Handle course image upload
    const imageFile = req.files?.thumbnail?.[0];
    let imagePath = null;
    
    if (imageFile) {
      try {
        imagePath = await uploadFile(imageFile, "thumbnails");
      } catch (uploadError) {
        await session.abortTransaction();
        return res.status(500).json({ message: "Failed to upload course image", error: uploadError.message });
      }
    }

    const updateData = {
      name: sanitizedName,
      description: sanitizedDescription,
      price: sanitizedPrice,
      instructor: sanitizedInstructor,
      ...(imagePath && { image: imagePath.location }),
      ...(duration && { duration: sanitizeInput(duration) }),
      ...(overview && { overview: sanitizeInput(overview) }),
    };

    const course = await Course.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      session
    });
    
    if (!course) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Course not found" });
    }

    await session.commitTransaction();
    res.status(200).json(course);
  } catch (error) {
    await session.abortTransaction();
    console.error("Course update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    session.endSession();
  }
};

// Delete a course and its associated lessons with transaction support
exports.deleteCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const courseId = req.params.id;

    // Validate course ID format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid course ID format" });
    }

    const course = await Course.findById(courseId).session(session);
    if (!course) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Course not found" });
    }

    // Delete all associated lessons
    await Lesson.deleteMany({ course: courseId }, { session });
    
    // Delete the course
    await Course.findByIdAndDelete(courseId, { session });

    await session.commitTransaction();
    res.status(200).json({ message: "Course and associated lessons deleted" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Course deletion error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    session.endSession();
  }
};

// Add a lesson to a course with enhanced validation and transaction support
exports.addLesson = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { courseId } = req.params;
    const { lessonNumber, lessonIntro, videoUrls, name, duration } = req.body;

    // Validate course ID format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid course ID format" });
    }

    // Sanitize inputs
    const sanitizedLessonNumber = sanitizeInput(lessonNumber);
    const sanitizedLessonIntro = sanitizeInput(lessonIntro);
    const sanitizedName = name ? sanitizeInput(name) : null;
    const sanitizedDuration = duration ? parseInt(duration) : null;

    // Validate required fields
    if (!validateFields({ lessonNumber: sanitizedLessonNumber, lessonIntro: sanitizedLessonIntro }, res)) {
      await session.abortTransaction();
      return;
    }

    // Check if course exists
    const course = await Course.findById(courseId).session(session);
    if (!course) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Course not found" });
    }

    // Validate lesson number uniqueness
    const isLessonNumberUnique = await validateLessonNumberUniqueness(courseId, sanitizedLessonNumber);
    if (!isLessonNumberUnique) {
      await session.abortTransaction();
      return res.status(400).json({ message: `Lesson number "${sanitizedLessonNumber}" already exists in this course` });
    }

    // Process video URLs safely
    let finalVideoUrls = processVideoUrls(videoUrls);

    // Handle video file uploads
    const videoFiles = req.files?.video || [];
    if (videoFiles.length > 0) {
      try {
        const uploadedVideos = await multifileUpload(videoFiles, "course-videos");
        finalVideoUrls.push(...uploadedVideos.map((v) => v.location));
      } catch (uploadError) {
        await session.abortTransaction();
        return res.status(500).json({ message: "Failed to upload videos", error: uploadError.message });
      }
    }

    // Validate at least one video
    if (finalVideoUrls.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "At least one video is required" });
    }

    // Handle thumbnail upload
    let thumbnailUrl = null;
    const thumbnailFile = req.files?.thumbnail?.[0];
    if (thumbnailFile) {
      try {
        const thumbnailResult = await uploadFile(thumbnailFile, "thumbnails");
        thumbnailUrl = thumbnailResult.location;
      } catch (uploadError) {
        await session.abortTransaction();
        return res.status(500).json({ message: "Failed to upload thumbnail", error: uploadError.message });
      }
    }

    // Create lesson
    const lesson = new Lesson({
      lessonNumber: sanitizedLessonNumber,
      lessonIntro: sanitizedLessonIntro,
      videoUrls: finalVideoUrls,
      thumbnail: thumbnailUrl,
      course: courseId,
      name: sanitizedName,
      duration: sanitizedDuration,
    });

    await lesson.save({ session });
    
    // Update course with new lesson reference
    course.lessons.push(lesson._id);
    await course.save({ session });
    
    await session.commitTransaction();
    res.status(201).json(lesson);
  } catch (error) {
    await session.abortTransaction();
    console.error("Lesson creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    session.endSession();
  }
};

// Update a lesson with enhanced validation and transaction support
exports.updateLesson = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { lessonId } = req.params;
    const { lessonNumber, lessonIntro, videoUrls, name, duration } = req.body;

    // Validate lesson ID format
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid lesson ID format" });
    }

    // Sanitize inputs
    const sanitizedLessonNumber = sanitizeInput(lessonNumber);
    const sanitizedLessonIntro = sanitizeInput(lessonIntro);
    const sanitizedName = name ? sanitizeInput(name) : null;
    const sanitizedDuration = duration ? parseInt(duration) : null;

    // Validate required fields
    if (!validateFields({ lessonNumber: sanitizedLessonNumber, lessonIntro: sanitizedLessonIntro }, res)) {
      await session.abortTransaction();
      return;
    }

    // Check if lesson exists and get course info
    const existingLesson = await Lesson.findById(lessonId).session(session);
    if (!existingLesson) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Validate lesson number uniqueness (excluding current lesson)
    const isLessonNumberUnique = await validateLessonNumberUniqueness(
      existingLesson.course, 
      sanitizedLessonNumber, 
      lessonId
    );
    if (!isLessonNumberUnique) {
      await session.abortTransaction();
      return res.status(400).json({ message: `Lesson number "${sanitizedLessonNumber}" already exists in this course` });
    }

    // Process video URLs safely
    let finalVideoUrls = processVideoUrls(videoUrls);

    // Handle video file uploads
    const videoFiles = req.files?.video || [];
    if (videoFiles.length > 0) {
      try {
        const uploadedVideos = await multifileUpload(videoFiles, "course-videos");
        finalVideoUrls.push(...uploadedVideos.map((v) => v.location));
      } catch (uploadError) {
        await session.abortTransaction();
        return res.status(500).json({ message: "Failed to upload videos", error: uploadError.message });
      }
    }

    // Handle thumbnail upload
    let thumbnailUrl = existingLesson.thumbnail; // Keep existing thumbnail if no new one
    const thumbnailFile = req.files?.thumbnail?.[0];
    if (thumbnailFile) {
      try {
        const thumbnailResult = await uploadFile(thumbnailFile, "thumbnails");
        thumbnailUrl = thumbnailResult.location;
      } catch (uploadError) {
        await session.abortTransaction();
        return res.status(500).json({ message: "Failed to upload thumbnail", error: uploadError.message });
      }
    }

    const updateData = {
      lessonNumber: sanitizedLessonNumber,
      lessonIntro: sanitizedLessonIntro,
      ...(finalVideoUrls.length > 0 && { videoUrls: finalVideoUrls }),
      ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
      ...(sanitizedName && { name: sanitizedName }),
      ...(sanitizedDuration && { duration: sanitizedDuration }),
    };

    const lesson = await Lesson.findByIdAndUpdate(lessonId, updateData, {
      new: true,
      session
    });

    await session.commitTransaction();
    res.status(200).json(lesson);
  } catch (error) {
    await session.abortTransaction();
    console.error("Lesson update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    session.endSession();
  }
};

// Delete a lesson with transaction support
exports.deleteLesson = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { lessonId } = req.params;

    // Validate lesson ID format
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid lesson ID format" });
    }

    const lesson = await Lesson.findById(lessonId).session(session);
    if (!lesson) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Remove lesson reference from course
    await Course.updateOne(
      { _id: lesson.course },
      { $pull: { lessons: lessonId } },
      { session }
    );
    
    // Delete the lesson
    await Lesson.findByIdAndDelete(lessonId, { session });

    await session.commitTransaction();
    res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Lesson deletion error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    session.endSession();
  }
};