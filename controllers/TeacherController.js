// controllers/TeacherController.js
const { uploadFile2 } = require('../middleware/aws');
const Teacher = require("../models/TeacherModel");
const upload = require("../middleware/multerConfig"); // Import the upload middleware

// Create a new teacher
const createTeacher = async (req, res) => {
    try {
        const { subject, name } = req.body;
        const subjectImage = req.files['subjectImage'] ? await uploadFile2(req.files['subjectImage'][0], "category") : undefined;
        const thumbnail = req.files['thumbnail'] ? await uploadFile2(req.files['thumbnail'][0], "category") : undefined;
        const videoUrl = req.files['videoUrl'] ? await uploadFile2(req.files['videoUrl'][0], "category") : undefined;

        const newTeacher = new Teacher({
            subject,
            name,
            subjectImage,
            ...(thumbnail ? { thumbnail } : {}),
            videoUrl,
        });

        await newTeacher.save();
        res.status(201).json({ message: "Teacher created successfully", teacher: newTeacher });
    } catch (error) {
        res.status(500).json({ message: "Error creating teacher", error: error.message });
    }
};

// Get all teachers
const getAllTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find().sort({ createdAt: -1 });;
        res.status(200).json(teachers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching teachers", error: error.message });
    }
};

// Get a single teacher by ID
const getTeacherById = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        res.status(200).json(teacher);
    } catch (error) {
        res.status(500).json({ message: "Error fetching teacher", error: error.message });
    }
};

// Update a teacher by ID
const updateTeacher = async (req, res) => {
    try {
        const { subject, name } = req.body;
        const subjectImage = req.files['subjectImage'] ? await uploadFile2(req.files['subjectImage'][0], "category") : undefined;
        const thumbnail = req.files['thumbnail'] ? await uploadFile2(req.files['thumbnail'][0], "category") : undefined;
        const videoUrl = req.files['videoUrl'] ? await uploadFile2(req.files['videoUrl'][0], "category") : undefined;

        // Build update object with only provided fields
        const updateData = { subject, name };
        if (subjectImage) updateData.subjectImage = subjectImage;
        if (thumbnail) updateData.thumbnail = thumbnail;
        if (videoUrl) updateData.videoUrl = videoUrl;

        const updatedTeacher = await Teacher.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedTeacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        res.status(200).json({ message: "Teacher updated successfully", teacher: updatedTeacher });
    } catch (error) {
        res.status(500).json({ message: "Error updating teacher", error: error.message });
    }
};

// Delete a teacher by ID
const deleteTeacher = async (req, res) => {
    try {
        const deletedTeacher = await Teacher.findByIdAndDelete(req.params.id);
        if (!deletedTeacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        res.status(200).json({ message: "Teacher deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting teacher", error: error.message });
    }
};

const likeTeacher = async (req, res) => {
    try {
        const { userId } = req.body;
        const teacherId = req.params.id;
        const teacher = await Teacher.findById(teacherId);

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Validate comments array
        const invalidComments = teacher.comments.filter(comment => !comment.userId);
        if (invalidComments.length > 0) {
            return res.status(400).json({ message: "Some comments are missing userId", invalidComments });
        }

        // Toggle like logic
        const likeIndex = teacher.likes.findIndex(
            (like) => like.userId === userId && like.videoId === teacher.videoUrl
        );

        if (likeIndex !== -1) {
            teacher.likes.splice(likeIndex, 1);
        } else {
            teacher.likes.push({ userId, videoId: teacher.videoUrl });
        }

        await teacher.save();
        res.status(200).json({ message: "Like toggled successfully", teacher });
    } catch (error) {
        console.error("Error in likeTeacher:", error);
        res.status(500).json({ message: "Error toggling like", error: error.message });
    }
};

// Add a comment
const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, text } = req.body;

        if (!userId || !text) {
            return res.status(400).json({ message: "User ID and comment text are required" });
        }

        const teacher = await Teacher.findByIdAndUpdate(
            id,
            { $push: { comments: { userId, text } } },
            { new: true }
        ).populate('comments.userId', 'name image');

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.status(200).json(teacher);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getComments = async (req, res) => {
    try {
        const { id } = req.params; // Teacher ID

        const teacher = await Teacher.findById(id)
            .populate('comments.userId', 'name image'); // Populate user details

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.status(200).json(teacher.comments);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params; // Teacher ID and Comment ID

        const teacher = await Teacher.findByIdAndUpdate(
            id,
            { $pull: { comments: { _id: commentId } } },
            { new: true }
        );

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.status(200).json(teacher);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    createTeacher,
    getAllTeachers,
    getTeacherById,
    updateTeacher,
    deleteTeacher,
    likeTeacher,
    addComment,
    getComments,
    deleteComment,
};