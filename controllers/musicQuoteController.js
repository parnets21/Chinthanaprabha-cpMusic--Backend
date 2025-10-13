// Music Quote Controller
const MusicQuote = require("../models/MusicQuoteModel");

// Get all music quotes
exports.getAllMusicQuotes = async (req, res) => {
  try {
    const quotes = await MusicQuote.find();
    res.status(200).json(quotes);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single music quote by ID
exports.getMusicQuoteById = async (req, res) => {
  try {
    const quote = await MusicQuote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: "Music quote not found" });
    }
    res.status(200).json(quote);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new music quote
exports.createMusicQuote = async (req, res) => {
  try {
    const { text, artist, genre, source } = req.body;

    // Validate required fields
    if (!text || !artist) {
      return res.status(400).json({ message: "Text and artist are required" });
    }

    const quote = new MusicQuote({
      text,
      artist,
      genre: genre || null,
      source: source || null,
    });

    await quote.save();
    res.status(201).json(quote);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a music quote
exports.updateMusicQuote = async (req, res) => {
  try {
    const { text, artist, genre, source } = req.body;

    const quote = await MusicQuote.findByIdAndUpdate(
      req.params.id,
      { text, artist, genre, source },
      { new: true }
    );

    if (!quote) {
      return res.status(404).json({ message: "Music quote not found" });
    }

    res.status(200).json(quote);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a music quote
exports.deleteMusicQuote = async (req, res) => {
  try {
    const quote = await MusicQuote.findByIdAndDelete(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: "Music quote not found" });
    }
    res.status(200).json({ message: "Music quote deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
