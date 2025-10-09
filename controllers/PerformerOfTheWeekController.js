const { uploadFile2 } = require('../middleware/aws');

const PerformerOfTheWeek = require('../models/PerformerOfTheWeek');

/* // Add a new Performer of the Week
exports.addPerformer = async (req, res) => {
    try {
        const { name, performance, week } = req.body;

        // Check if all required fields are provided
        if (!name || !performance || !week) {
            return res.status(400).json({ error: 'Missing required fields: name, performance, and week are required.' });
        }

        // Check if the image file is uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'Image is required.' });
        }

        // Validate that the uploaded file is an image (optional but recommended)
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, or GIF images are allowed.' });
        }

        const image = req.file.path; // Image uploaded by multer

        // Create a new performer entry
        const newPerformer = new PerformerOfTheWeek({
            name,
            performance,
            week,
            image
        });

        // Save the performer to the database
        await newPerformer.save();

        // Send a success response with the created performer data
        res.status(201).json({
            message: 'Performer of the Week added successfully',
            performer: newPerformer
        });

    } catch (err) {
        console.error('Error adding performer:', err);  // Log the error to the server console
        res.status(500).json({ error: `Error adding Performer of the Week: ${err.message}` });
    }
};

// Get all Performers of the Week
exports.getAllPerformers = async (req, res) => {
    try {
        const performers = await PerformerOfTheWeek.find();

        if (performers.length === 0) {
            return res.status(404).json({ message: 'No Performers of the Week found' });
        }

        res.status(200).json(performers);
    } catch (err) {
        console.error('Error fetching performers:', err);  // Log the error to the server console
        res.status(500).json({ error: `Error fetching Performers of the Week: ${err.message}` });
    }
}; */















/* exports.createPerformer = async (req, res) => {
    try {
        const { category, title } = req.body; // Get courseName from req.body
        const image = req.file ? req.file.path : null; // Get image path from req.file

        // Validate required fields
        if (!image || !category || !title) {
            return res.status(400).json({ message: "Image and course name are required" });
        }

        const performer = new PerformerOfTheWeek({
            image,
            category,
            title,
        });

        await performer.save();
        res.status(201).json(performer);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// Get all performers (Top 10)
exports.getAllPerformers = async (req, res) => {
    try {
        const performers = await PerformerOfTheWeek.find().sort({ rank: 1 }).limit(10); // Fetch top 10 performers
        res.status(200).json(performers);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get a performer by ID
exports.getPerformerById = async (req, res) => {
    try {
        const performer = await PerformerOfTheWeek.findById(req.params.id);
        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }
        res.status(200).json(performer);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update a performer
exports.updatePerformer = async (req, res) => {
    try {
        const { category, title } = req.body; // Get courseName from req.body
        const image = req.file ? req.file.path : null; // Get image path from req.file

        const updateData = {
            category,
            title,
            ...(image && { image }), // Update image only if a new one is provided
        };

        const performer = await PerformerOfTheWeek.findByIdAndUpdate(
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
exports.deletePerformer = async (req, res) => {
    try {
        const performer = await PerformerOfTheWeek.findByIdAndDelete(req.params.id);
        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }
        res.status(200).json({ message: "Performer deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}; */






exports.createPerformer = async (req, res) => {
    try {
        const { category, title } = req.body; // Get category and title from req.body
        const image = req.file ? await uploadFile2(req.file, "category") : null; // Get image path from req.file

        // Validate required fields
        if (!image || !category || !title) {
            return res.status(400).json({ message: "Image, category, and title are required" });
        }

        // Check if the category already exists
        const existingCategory = await PerformerOfTheWeek.findOne({ category });
        if (existingCategory) {
            return res.status(400).json({ message: "Category already exists" });
        }

        // Save the performer
        const performer = new PerformerOfTheWeek({
            image,
            category,
            title,
        });

        await performer.save();
        res.status(201).json(performer);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all performers for the home screen
exports.getAllPerformers = async (req, res) => {
    try {
        const performers = await PerformerOfTheWeek.find().sort({ createdAt: -1 }).limit(10); // Fetch top 10 performers
        res.status(200).json(performers);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get a performer by ID
exports.getPerformerById = async (req, res) => {
    try {
        const performer = await PerformerOfTheWeek.findById(req.params.id);
        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }
        res.status(200).json(performer);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update a performer
exports.updatePerformer = async (req, res) => {
    try {
        const { category, title } = req.body; // Get category and title from req.body
        const image = req.file ? await uploadFile2(req.file, "category") : null; // Get image path from req.file

        const updateData = {
            category,
            title,
            ...(image && { image }), // Update image only if a new one is provided
        };

        const performer = await PerformerOfTheWeek.findByIdAndUpdate(
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
exports.deletePerformer = async (req, res) => {
    try {
        const performer = await PerformerOfTheWeek.findByIdAndDelete(req.params.id);
        if (!performer) {
            return res.status(404).json({ message: "Performer not found" });
        }
        res.status(200).json({ message: "Performer deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};