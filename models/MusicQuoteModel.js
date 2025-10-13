const mongoose = require("mongoose");

const musicQuoteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  artist: { type: String, required: true },
  genre: { type: String, required: false },
  source: { type: String, required: false },
}, {
  timestamps: true
});

module.exports = mongoose.model("MusicQuote", musicQuoteSchema);
