const mongoose = require('mongoose');
const LiveClass = require('../models/LiveClassModel');
const Course = require('../models/CourseModel');
const User = require('../models/UserModel');
const notificationController = require('./notificationController');
const TeacherLogin = require('../models/TeacherLogin'); // Adjust the path as needed
// Create a new live class
/* exports.createLiveClass = async (req, res) => {
    try {
        const { title, course, teacherName, startTime, endTime, meetLink } = req.body;

        // Validate required fields
        if (!title || !course || !teacherName || !startTime || !endTime || !meetLink) {
            console.log('Missing Fields:', { title, course, teacherName, startTime, endTime, meetLink });
            return res.status(400).json({ message: "All fields are required" });
        }

        // Validate if course is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(course)) {
            return res.status(400).json({ message: "Invalid course ID" });
        }

        // Check if the course exists
        const courseExists = await Course.findById(course);
        if (!courseExists) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Create the live class
        const liveClass = new LiveClass({
            title,
            course, // Use "course" instead of "courseId"
            teacherName,
            startTime,
            endTime,
            meetLink,
        });

        await liveClass.save();
        res.status(201).json(liveClass);
    } catch (error) {
        console.error('Error in createLiveClass:', error); // Log the error
        res.status(500).json({ message: "Server error", error: error.message });
    }
}; */

exports.createLiveClass = async (req, res) => {
    try {
        const { title, course, teacher, startTime, endTime, meetLink, users } = req.body;

        // Validate required fields
        if (!title || !course || !teacher || !startTime || !endTime || !meetLink) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Validate if course and teacher are valid ObjectIds
        if (!mongoose.Types.ObjectId.isValid(course) || !mongoose.Types.ObjectId.isValid(teacher)) {
            return res.status(400).json({ message: "Invalid course or teacher ID" });
        }

        // Check if the course exists
        const courseExists = await Course.findById(course);
        if (!courseExists) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Check if the teacher exists
        const teacherExists = await TeacherLogin.findById(teacher);
        if (!teacherExists) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Validate users (if provided)
        if (users && users.length > 0) {
            for (const userId of users) {
                if (!mongoose.Types.ObjectId.isValid(userId)) {
                    return res.status(400).json({ message: "Invalid user ID" });
                }
                const userExists = await User.findById(userId);
                if (!userExists) {
                    return res.status(404).json({ message: `User with ID ${userId} not found` });
                }
            }
        }

        // Ensure the meetLink starts with https://
        const formattedMeetLink = meetLink.startsWith('http://') || meetLink.startsWith('https://')
            ? meetLink
            : `https://${meetLink}`;

        // Create the live class
        const liveClass = new LiveClass({
            title,
            course,
            teacher,
            startTime,
            endTime,
            meetLink: formattedMeetLink, // Use the formatted meetLink
            users: users || [],
        });

        await liveClass.save();
        // Create notifications for assigned users
        if (users && users.length > 0) {
            await notificationController.createLiveClassNotification(liveClass);
        }

        res.status(201).json(liveClass);
    } catch (error) {
        console.error('Error in createLiveClass:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};






// Get all live classes
exports.getAllLiveClasses = async (req, res) => {
    try {
        const liveClasses = await LiveClass.find().populate('course');
        res.status(200).json(liveClasses);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get a live class by ID
exports.getLiveClassById = async (req, res) => {
    try {
        const liveClass = await LiveClass.findById(req.params.id)
            .populate('course')
            .populate('teacher', 'name mobileNumber'); // Populate teacher details

        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }
        res.status(200).json(liveClass);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
// Update a live class
exports.updateLiveClass = async (req, res) => {
    try {
        const { title, course, teacher, startTime, endTime, meetLink, users } = req.body;

        // Validate required fields
        if (!title || !course || !teacher || !startTime || !endTime || !meetLink) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Validate if course and teacher are valid ObjectIds
        if (!mongoose.Types.ObjectId.isValid(course) || !mongoose.Types.ObjectId.isValid(teacher)) {
            return res.status(400).json({ message: "Invalid course or teacher ID" });
        }

        // Check if the course exists
        const courseExists = await Course.findById(course);
        if (!courseExists) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Check if the teacher exists
        const teacherExists = await TeacherLogin.findById(teacher);
        if (!teacherExists) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Ensure the meetLink starts with https://
        const formattedMeetLink = meetLink.startsWith('http://') || meetLink.startsWith('https://')
            ? meetLink
            : `https://${meetLink}`;

        // Update the live class
        const liveClass = await LiveClass.findByIdAndUpdate(
            req.params.id,
            {
                title,
                course,
                teacher,
                startTime,
                endTime,
                meetLink: formattedMeetLink, // Use the formatted meetLink
                users: users || [],
            },
            { new: true }
        );

        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }

        res.status(200).json(liveClass);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// Fetch live classes for a specific user
exports.getLiveClassesByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        // Find live classes where the user is assigned
        const liveClasses = await LiveClass.find({ users: userId }).populate('course');

        res.status(200).json(liveClasses);
    } catch (error) {
        console.error('Error fetching live classes:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
// Delete a live class
exports.deleteLiveClass = async (req, res) => {
    try {
        const liveClass = await LiveClass.findByIdAndDelete(req.params.id);
        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }
        res.status(200).json({ message: "Live class deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



// In your LiveClassController.js
exports.getLiveClassesByTeacher = async (req, res) => {
    try {
        const { teacherId } = req.params;

        // Validate teacherId
        if (!mongoose.Types.ObjectId.isValid(teacherId)) {
            return res.status(400).json({ message: "Invalid teacher ID" });
        }

        // Find live classes where the teacher is assigned
        const liveClasses = await LiveClass.find({ teacher: teacherId }).populate('course');

        res.status(200).json(liveClasses);
    } catch (error) {
        console.error('Error fetching live classes:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// Update a live class
exports.updateLiveClass = async (req, res) => {
    try {
        const { title, course, teacher, startTime, endTime, meetLink, users } = req.body;

        // Validate required fields
        if (!title || !course || !teacher || !startTime || !endTime || !meetLink) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Validate if course and teacher are valid ObjectIds
        if (!mongoose.Types.ObjectId.isValid(course) || !mongoose.Types.ObjectId.isValid(teacher)) {
            return res.status(400).json({ message: "Invalid course or teacher ID" });
        }

        // Check if the course exists
        const courseExists = await Course.findById(course);
        if (!courseExists) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Check if the teacher exists
        const teacherExists = await TeacherLogin.findById(teacher);
        if (!teacherExists) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Ensure the meetLink starts with https://
        const formattedMeetLink = meetLink.startsWith('http://') || meetLink.startsWith('https://')
            ? meetLink
            : `https://${meetLink}`;

        // Update the live class
        const liveClass = await LiveClass.findByIdAndUpdate(
            req.params.id,
            {
                title,
                course,
                teacher,
                startTime,
                endTime,
                meetLink: formattedMeetLink, // Use the formatted meetLink
                users: users || [],
            },
            { new: true }
        );

        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }

        // Create notifications for assigned users when class is updated
        if (users && users.length > 0) {
            await notificationController.createLiveClassNotification(liveClass);
        }

        res.status(200).json(liveClass);
    } catch (error) {
        console.error('Error in updateLiveClass:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};