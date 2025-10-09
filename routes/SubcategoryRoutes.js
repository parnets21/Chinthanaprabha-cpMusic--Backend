const express = require("express");
const router = express.Router();
//const { subcategoryUpload } = require("../middleware/multer");
const {
  createSubcategory,
  getAllSubcategories,
  getSubcategoriesByCategory,
  getSubcategoryById,
  updateSubcategory,
  deleteSubcategory,
} = require("../controllers/SubcategoryController");

const multer = require("multer");

const subcategoryUpload = multer({})

// Public routes
router.get("/", getAllSubcategories);
router.get("/category/:categoryId", getSubcategoriesByCategory);
router.get("/:id", getSubcategoryById);

// Admin routes (protected)
router.post("/", subcategoryUpload.single("image"), createSubcategory);
router.put("/:id", subcategoryUpload.single("image"), updateSubcategory);
router.delete("/:id", deleteSubcategory);

module.exports = router;
