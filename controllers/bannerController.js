const { uploadFile2 } = require('../middleware/aws');
const Banner = require("../models/Banner");
const upload = require("../middleware/multer"); // Use your existing multer middleware
const path = require("path");
const fs = require("fs");

// Helper function for API responses
const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

// @desc    Get all banners with filtering and pagination
// @route   GET /api/banners
// @access  Public
const getAllBanners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const banners = await Banner.find(query)
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    const total = await Banner.countDocuments(query);

    sendResponse(res, 200, true, "Banners retrieved successfully", {
      banners,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit,
      },
    });
  } catch (error) {
    sendResponse(res, 500, false, "Server error", { error: error.message });
  }
};

// @desc    Get active banners for public display
// @route   GET /api/banners/active
// @access  Public
const getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.getActiveBanners();
    sendResponse(
      res,
      200,
      true,
      "Active banners retrieved successfully",
      banners
    );
  } catch (error) {
    sendResponse(res, 500, false, "Server error", { error: error.message });
  }
};

// @desc    Get single banner by ID
// @route   GET /api/banners/:id
// @access  Public
const getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!banner) {
      return sendResponse(res, 404, false, "Banner not found");
    }

    sendResponse(res, 200, true, "Banner retrieved successfully", banner);
  } catch (error) {
    if (error.name === "CastError") {
      return sendResponse(res, 400, false, "Invalid banner ID");
    }
    sendResponse(res, 500, false, "Server error", { error: error.message });
  }
};

// @desc    Create new banner
// @route   POST /api/banners
// @access  Private (Admin)
const createBanner = async (req, res) => {
  try {
    const bannerData = {
      ...req.body,
      createdBy: req.user?.id,
    };

    // If image was uploaded, use the file path
    if (req.file) {
      bannerData.image = `${req.file ? await uploadFile2(req.file, "category") : null}`;
    }

    const banner = await Banner.create(bannerData);

    sendResponse(res, 201, true, "Banner created successfully", banner);
  } catch (error) {
    // Delete uploaded file if banner creation fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return sendResponse(res, 400, false, "Validation error", {
        errors: messages,
      });
    }

    sendResponse(res, 500, false, "Server error", { error: error.message });
  }
};

// @desc    Update banner
// @route   PUT /api/banners/:id
// @access  Private (Admin)
const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return sendResponse(res, 404, false, "Banner not found");
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user?.id,
    };

    // If new image was uploaded
    if (req.file) {
      // Delete old image file
      if (banner.image && banner.image.startsWith("/uploads/banners/")) {
        const oldImagePath = path.join(__dirname, "..", banner.image);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("Error deleting old image:", err);
        });
      }
      updateData.image = `${req.file ? await uploadFile2(req.file, "category") : null}`;
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    sendResponse(res, 200, true, "Banner updated successfully", updatedBanner);
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return sendResponse(res, 400, false, "Validation error", {
        errors: messages,
      });
    }

    sendResponse(res, 500, false, "Server error", { error: error.message });
  }
};

// @desc    Delete banner
// @route   DELETE /api/banners/:id
// @access  Private (Admin)
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return sendResponse(res, 404, false, "Banner not found");
    }

    // Delete image file
    if (banner.image && banner.image.startsWith("/uploads/banners/")) {
      const imagePath = path.join(__dirname, "..", banner.image);
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Error deleting image:", err);
      });
    }

    await Banner.findByIdAndDelete(req.params.id);

    sendResponse(res, 200, true, "Banner deleted successfully");
  } catch (error) {
    sendResponse(res, 500, false, "Server error", { error: error.message });
  }
};

// @desc    Toggle banner status
// @route   PATCH /api/banners/:id/toggle-status
// @access  Private (Admin)
const toggleBannerStatus = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return sendResponse(res, 404, false, "Banner not found");
    }

    banner.status = banner.status === "active" ? "inactive" : "active";
    banner.updatedBy = req.user?.id;
    await banner.save();

    sendResponse(res, 200, true, "Banner status updated successfully", banner);
  } catch (error) {
    sendResponse(res, 500, false, "Server error", { error: error.message });
  }
};

// @desc    Get banner statistics
// @route   GET /api/banners/stats
// @access  Private (Admin)
const getBannerStats = async (req, res) => {
  try {
    const stats = await Banner.aggregate([
      {
        $group: {
          _id: null,
          totalBanners: { $sum: 1 },
          activeBanners: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          inactiveBanners: {
            $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
          },
          totalClicks: { $sum: "$clickCount" },
          averageClicks: { $avg: "$clickCount" },
        },
      },
    ]);

    const recentBanners = await Banner.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title status createdAt clickCount");

    const topClickedBanners = await Banner.find()
      .sort({ clickCount: -1 })
      .limit(5)
      .select("title clickCount");

    sendResponse(res, 200, true, "Banner statistics retrieved successfully", {
      summary: stats[0] || {
        totalBanners: 0,
        activeBanners: 0,
        inactiveBanners: 0,
        totalClicks: 0,
        averageClicks: 0,
      },
      recentBanners,
      topClickedBanners,
    });
  } catch (error) {
    sendResponse(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  upload,
  getAllBanners,
  getActiveBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  getBannerStats,
};
