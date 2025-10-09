const mongoose = require("mongoose")

const walletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["credit", "debit"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    required: true,
  },
  transactionDate: {
    type: Date,
    default: Date.now,
  },
  // Optional: Link to related entities
  relatedEntity: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "relatedModel",
    required: false,
  },
  relatedModel: {
    type: String,
    enum: ["Payment", "User", null], // Payment for course purchases, User for referral
    required: false,
  },
})

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema)
