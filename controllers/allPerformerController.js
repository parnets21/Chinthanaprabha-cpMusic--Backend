// controllers/allPerformerController.js
const { uploadFile2 } = require('../middleware/aws');
const AllPerformer = require('../models/AllPerformer');
const PerformerOfTheWeek = require('../models/PerformerOfTheWeek');

// Create a new performer for the detailed screen
exports.createAllPerformer = async (req, res) => {
    try {
        const { name, category } = req.body; // Get name and category from req.body
        const videoUrl = req.file ? await uploadFile2(req.file, "category") : null; // Get video path from req.file

        // Validate required fields
        if (!videoUrl || !name || !category) {
            return res.status(400).json({ message: "Video, name, and category are required" });
        }

        // Check if the category exists in PerformerOfTheWeek
        const categoryExists = await PerformerOfTheWeek.findOne({ category });
        if (!categoryExists) {
            return res.status(400).json({ message: "Category does not exist in PerformerOfTheWeek" });
        }

        // Save the performer
        const performer = new AllPerformer({
            name,
            videoUrl,
            category,
        });

        await performer.save();
        res.status(201).json(performer);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all performers by category
exports.getAllPerformersByCategory = async (req, res) => {
    try {
        const { category } = req.params; // Get category from URL params
        const performers = await AllPerformer.find({ category }).sort({ createdAt: -1 }); // Fetch performers by category
        res.status(200).json(performers);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get a performer by ID
exports.getAllPerformerById = async (req, res) => {
    try {
        const performer = await AllPerformer.findById(req.params.id);
        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }
        res.status(200).json(performer);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update a performer
exports.updateAllPerformer = async (req, res) => {
    try {
        const { name, category } = req.body; // Get name and category from req.body
        const videoUrl =  req.file ? await uploadFile2(req.file, "category") : null; // Get video path from req.file

        const updateData = {
            name,
            category,
            ...(videoUrl && { videoUrl }), // Update videoUrl only if a new one is provided
        };

        const performer = await AllPerformer.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }

        res.status(200).json(performer);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a performer
exports.deleteAllPerformer = async (req, res) => {
    try {
        const performer = await AllPerformer.findByIdAndDelete(req.params.id);
        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }
        res.status(200).json({ message: "Performer deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};




exports.likePerformer = async (req, res) => {
    try {
        const { id } = req.params; // Performer ID
        const { userId } = req.body; // User ID from request body

        // Find the performer
        const performer = await AllPerformer.findById(id);

        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }

        // Check if the user has already liked the performer
        const userIndex = performer.likedBy.indexOf(userId);

        if (userIndex !== -1) {
            // User has already liked the performer, so unlike it
            performer.likedBy.splice(userIndex, 1);
            performer.likes -= 1;
        } else {
            // User hasn't liked the performer yet, so like it
            performer.likedBy.push(userId);
            performer.likes += 1;
        }

        await performer.save();
        res.status(200).json(performer);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};





// Add a comment to a performer
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params; // Performer ID
        const { userId, text } = req.body; // User ID and comment text

        // Validate input
        if (!userId || !text) {
            return res.status(400).json({ message: "User ID and comment text are required" });
        }

        // Add the comment to the performer
        const performer = await AllPerformer.findByIdAndUpdate(
            id,
            { $push: { comments: { userId, text } } },
            { new: true }
        ).populate('comments.userId', 'name image'); // Populate user details

        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }

        res.status(200).json(performer);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all comments for a performer
exports.getComments = async (req, res) => {
    try {
        const { id } = req.params; // Performer ID

        const performer = await AllPerformer.findById(id)
            .populate('comments.userId', 'name image'); // Populate user details

        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }

        res.status(200).json(performer.comments);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params; // Performer ID and Comment ID

        const performer = await AllPerformer.findByIdAndUpdate(
            id,
            { $pull: { comments: { _id: commentId } } },
            { new: true }
        );

        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }

        res.status(200).json(performer);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
