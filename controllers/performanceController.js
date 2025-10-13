const Performance = require('../models/PerformanceModel');

// Get all performances
exports.getAllPerformances = async (req, res) => {
  try {
    const performances = await Performance.find().sort({ createdAt: -1 });
    res.status(200).json(performances);
  } catch (error) {
    console.error('Error fetching performances:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get performance by ID
exports.getPerformanceById = async (req, res) => {
  try {
    const performance = await Performance.findById(req.params.id);
    if (!performance) {
      return res.status(404).json({ message: 'Performance not found' });
    }
    res.status(200).json(performance);
  } catch (error) {
    console.error('Error fetching performance:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new performance
exports.createPerformance = async (req, res) => {
  try {
    const { title, name, skillLevel, video, photo, thumbnail } = req.body;
    
    const performance = new Performance({
      title,
      name,
      skillLevel,
      video,
      photo,
      thumbnail
    });

    const savedPerformance = await performance.save();
    res.status(201).json(savedPerformance);
  } catch (error) {
    console.error('Error creating performance:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update performance
exports.updatePerformance = async (req, res) => {
  try {
    const { title, name, skillLevel, video, photo, thumbnail } = req.body;
    
    const performance = await Performance.findByIdAndUpdate(
      req.params.id,
      { title, name, skillLevel, video, photo, thumbnail },
      { new: true, runValidators: true }
    );

    if (!performance) {
      return res.status(404).json({ message: 'Performance not found' });
    }

    res.status(200).json(performance);
  } catch (error) {
    console.error('Error updating performance:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete performance
exports.deletePerformance = async (req, res) => {
  try {
    const performance = await Performance.findByIdAndDelete(req.params.id);
    
    if (!performance) {
      return res.status(404).json({ message: 'Performance not found' });
    }

    res.status(200).json({ message: 'Performance deleted successfully' });
  } catch (error) {
    console.error('Error deleting performance:', error);
    res.status(500).json({ error: error.message });
  }
};
