const mongoose = require("mongoose");
const MusicQuote = require("./models/MusicQuoteModel");
require("dotenv").config();

// Sample music quotes data
const sampleQuotes = [
  {
    text: "Music is the universal language of mankind.",
    artist: "Henry Wadsworth Longfellow",
    genre: "Classical",
    source: "Poetry"
  },
  {
    text: "Without music, life would be a mistake.",
    artist: "Friedrich Nietzsche",
    genre: "Philosophy",
    source: "Twilight of the Idols"
  },
  {
    text: "Music expresses that which cannot be put into words and that which cannot remain silent.",
    artist: "Victor Hugo",
    genre: "Literature",
    source: "Les Misérables"
  },
  {
    text: "The music is not in the notes, but in the silence between.",
    artist: "Wolfgang Amadeus Mozart",
    genre: "Classical",
    source: "Composer"
  },
  {
    text: "Music is the art which is most nigh to tears and memory.",
    artist: "Oscar Wilde",
    genre: "Literature",
    source: "De Profundis"
  },
  {
    text: "One good thing about music, when it hits you, you feel no pain.",
    artist: "Bob Marley",
    genre: "Reggae",
    source: "Singer"
  },
  {
    text: "Music is the soundtrack of your life.",
    artist: "Dick Clark",
    genre: "Pop Culture",
    source: "TV Host"
  },
  {
    text: "Music is the wine that fills the cup of silence.",
    artist: "Robert Fripp",
    genre: "Progressive Rock",
    source: "Musician"
  },
  {
    text: "Music washes away from the soul the dust of everyday life.",
    artist: "Berthold Auerbach",
    genre: "Literature",
    source: "German Novelist"
  },
  {
    text: "The only truth is music.",
    artist: "Jack Kerouac",
    genre: "Beat Generation",
    source: "On the Road"
  }
];

async function seedMusicQuotes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing quotes
    await MusicQuote.deleteMany({});
    console.log("Cleared existing music quotes");

    // Insert sample quotes
    await MusicQuote.insertMany(sampleQuotes);
    console.log(`Inserted ${sampleQuotes.length} music quotes`);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the seed function
seedMusicQuotes();
