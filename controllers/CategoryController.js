const { uploadFile2 } = require("../middleware/aws")

const Category = require("../models/CategoryModel")
const SubCategory = require("../models/SubcategoryModel")

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body

    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Category image is required",
      })
    }

    // Store the full S3 URL directly (remove the /uploads/categories/ prefix)
    const imageUrl = await uploadFile2(req.file, "category")

    const category = new Category({
      name,
      description,
      image: imageUrl, // Store the full S3 URL directly
    })

    await category.save()

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating category",
      error: error.message,
    })
  }
}

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
    res.status(200).json({
      success: true,
      data: categories,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching categories",
      error: error.message,
    })
  }
}

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }
    res.status(200).json({
      success: true,
      data: category,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching category",
      error: error.message,
    })
  }
}

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body
    const updateData = {
      name,
      description,
    }

    // If new image is uploaded, store the full S3 URL
    if (req.file) {
      updateData.image = await uploadFile2(req.file, "category")
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating category",
      error: error.message,
    })
  }
}

// Delete category (soft delete)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: error.message,
    })
  }
}
