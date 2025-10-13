const express = require("express");
const router = express.Router();
const {
  getAllMusicQuotes,
  getMusicQuoteById,
  createMusicQuote,
  updateMusicQuote,
  deleteMusicQuote,
} = require("../controllers/musicQuoteController");

// GET /api/musicQuote - Get all music quotes
router.get("/", getAllMusicQuotes);

// GET /api/musicQuote/:id - Get a single music quote
router.get("/:id", getMusicQuoteById);

// POST /api/musicQuote - Create a new music quote
router.post("/", createMusicQuote);

// PUT /api/musicQuote/:id - Update a music quote
router.put("/:id", updateMusicQuote);

// DELETE /api/musicQuote/:id - Delete a music quote
router.delete("/:id", deleteMusicQuote);

module.exports = router;
