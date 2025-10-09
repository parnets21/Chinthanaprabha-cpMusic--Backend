const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      type: String,
      required: [true, "Banner image is required"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
bannerSchema.index({ status: 1, priority: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });
bannerSchema.index({ createdAt: -1 });

// Virtual for checking if banner is currently active
bannerSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  return (
    this.status === "active" &&
    (!this.startDate || this.startDate <= now) &&
    (!this.endDate || this.endDate >= now)
  );
});

// Static method to get active banners
bannerSchema.statics.getActiveBanners = function () {
  const now = new Date();
  return this.find({
    status: "active",
    $or: [
      { startDate: { $lte: now }, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: null },
      { startDate: null, endDate: { $gte: now } },
      { startDate: null, endDate: null },
    ],
  }).sort({ priority: 1, createdAt: -1 });
};

module.exports = mongoose.model("Banner", bannerSchema);
