const mongoose = require("mongoose")

const OfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    couponCode: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String, // Path to the offer image file
      required: true,
    },
    thumbnail: {
      type: String, // Path to the thumbnail image file for video
      required: false,
    },
    video: {
      type: String, // Path to the video file
      required: false,
    },
    discountPercentage: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      required: false,
      min: 0,
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("Offer", OfferSchema)
