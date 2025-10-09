// routes/bannerRoutes.js

const express = require("express");
const {
  upload,
  getAllBanners,
  getActiveBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  getBannerStats,
} = require("../controllers/bannerController");

// const { bannerUpload } = require("../middleware/multer");

const multer = require("multer");

const bannerUpload = multer({})
const router = express.Router();

// routes

router.get("/get", getAllBanners);
router.post("/add", bannerUpload.single("image"), createBanner);
router.put("/:id", bannerUpload.single("image"), updateBanner);
router.delete("/:id", deleteBanner);
router.patch("/:id/toggle-status", toggleBannerStatus);
router.get("/active", getActiveBanners);
router.get("/stats", getBannerStats);
router.get("/:id", getBannerById);

module.exports = router;
