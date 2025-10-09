const HappyLearner = require('../models/HappyLearnerModel');

exports.addHappyLearner = async (req, res) => {
    try {
        const { name, message } = req.body;
        const image = req.file.path; // Image uploaded by multer

        const newHappyLearner = new HappyLearner({
            name,
            message,
            image
        });

        await newHappyLearner.save();
        res.status(201).json(newHappyLearner);
    } catch (err) {
        console.error("Error:", err); // Log the error for debugging
        res.status(400).json({ error: 'Error adding Happy Learner' });
    }
};

exports.getAllHappyLearners = async (req, res) => {
    try {
        const learners = await HappyLearner.find();
        res.status(200).json(learners);
    } catch (err) {
        console.error("Error:", err); // Log the error for debugging
        res.status(400).json({ error: 'Error fetching Happy Learners' });
    }
};
