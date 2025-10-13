const AudienceReview = require('../models/AudienceReviewModel');

// Get all audience reviews
exports.getAllAudienceReviews = async (req, res) => {
  try {
    const reviews = await AudienceReview.find().sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching audience reviews:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get audience review by ID
exports.getAudienceReviewById = async (req, res) => {
  try {
    const review = await AudienceReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Audience review not found' });
    }
    res.status(200).json(review);
  } catch (error) {
    console.error('Error fetching audience review:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new audience review
exports.createAudienceReview = async (req, res) => {
  try {
    const { name, rating, comment, course, image } = req.body;
    
    const review = new AudienceReview({
      name,
      rating,
      comment,
      course,
      image
    });

    const savedReview = await review.save();
    res.status(201).json(savedReview);
  } catch (error) {
    console.error('Error creating audience review:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update audience review
exports.updateAudienceReview = async (req, res) => {
  try {
    const { name, rating, comment, course, image } = req.body;
    
    const review = await AudienceReview.findByIdAndUpdate(
      req.params.id,
      { name, rating, comment, course, image },
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Audience review not found' });
    }

    res.status(200).json(review);
  } catch (error) {
    console.error('Error updating audience review:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete audience review
exports.deleteAudienceReview = async (req, res) => {
  try {
    const review = await AudienceReview.findByIdAndDelete(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Audience review not found' });
    }

    res.status(200).json({ message: 'Audience review deleted successfully' });
  } catch (error) {
    console.error('Error deleting audience review:', error);
    res.status(500).json({ error: error.message });
  }
};
