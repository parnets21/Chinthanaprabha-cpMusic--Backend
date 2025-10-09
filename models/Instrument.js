const mongoose = require("mongoose");

const instrumentSchema = new mongoose.Schema({
  name: String,
  description: String,
  expert: String,
  offer: String,
  group: String,
  image: String, 
});

module.exports = mongoose.model("Instrument", instrumentSchema);
