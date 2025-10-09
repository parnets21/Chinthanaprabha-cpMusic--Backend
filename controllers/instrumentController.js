const { uploadFile2 } = require('../middleware/aws');

const Instrument = require("../models/InstrumentModel");
const Category = require("../models/CategoryModel");
const Subcategory = require("../models/SubcategoryModel");
const fs = require("fs");
const path = require("path");

// CREATE
exports.createInstrument = async (req, res) => {
  try {
    const {
      name,
      description,
      details,
      price,
      gst,
      tax,
      deliveryFee,
      discount,
      stock,
      category, // category id
      subcategory, // subcategory id
      expert,
      offer,
      group,
    } = req.body;

    console.log("req.body", req.body);

    // Check for image
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Instrument image is required",
      });
    }

    // Must have either category or subcategory
    if (!category && !subcategory) {
      return res.status(400).json({
        success: false,
        message: "Either category or subcategory is required",
      });
    }

    // Validate category if provided
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    // Validate subcategory if provided
    if (subcategory) {
      const subcategoryExists = await Subcategory.findById(subcategory);
      if (!subcategoryExists) {
        return res.status(404).json({
          success: false,
          message: "Subcategory not found",
        });
      }
    }

    const image = `${req.file ? await uploadFile2(req.file, "instrument") : null}`;

    const newInstrument = new Instrument({
      name,
      description,
      details,
      price,
      gst,
      tax,
      deliveryFee,
      discount,
      stock,
      category: category || undefined,
      subcategory: subcategory || undefined,
      expert,
      offer,
      group,
      image,
    });

    await newInstrument.save();

    res.status(201).json({
      success: true,
      message: "Instrument created successfully",
      data: newInstrument,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to add instrument",
      error: err.message,
    });
  }
};

// READ ALL
exports.getInstruments = async (req, res) => {
  try {
    const instruments = await Instrument.find()
      .populate("category", "name")
      .populate("subcategory", "name");
    res.status(200).json({
      success: true,
      data: instruments,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch instruments",
      error: err.message,
    });
  }
};

// READ BY ID
exports.getInstrumentById = async (req, res) => {
  try {
    const instrument = await Instrument.findById(req.params.id)
      .populate("category", "name")
      .populate("subcategory", "name");
    if (!instrument) {
      return res.status(404).json({
        success: false,
        message: "Instrument not found",
      });
    }
    res.status(200).json({
      success: true,
      data: instrument,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch instrument",
      error: err.message,
    });
  }
};

// UPDATE
exports.updateInstrument = async (req, res) => {
  try {
    const {
      name,
      description,
      details,
      price,
      gst,
      tax,
      deliveryFee,
      discount,
      stock,
      category,
      subcategory,
      expert,
      offer,
      group,
    } = req.body;

    const instrument = await Instrument.findById(req.params.id);
    if (!instrument) {
      return res.status(404).json({
        success: false,
        message: "Instrument not found",
      });
    }

    // Must have either category or subcategory
    if (!category && !subcategory) {
      return res.status(400).json({
        success: false,
        message: "Either category or subcategory is required",
      });
    }

    // Validate category if provided
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
      instrument.category = category;
      instrument.subcategory = undefined;
    }

    // Validate subcategory if provided
    if (subcategory) {
      const subcategoryExists = await Subcategory.findById(subcategory);
      if (!subcategoryExists) {
        return res.status(404).json({
          success: false,
          message: "Subcategory not found",
        });
      }
      instrument.subcategory = subcategory;
      instrument.category = undefined;
    }

    if (req.file) {
      // Delete old image if it exists
      if (instrument.image) {
        fs.unlink(path.join(__dirname, "..", instrument.image), (err) => {
          if (err) console.error("Failed to delete old image:", err);
        });
      }
      instrument.image = `${req.file ? await uploadFile2(req.file, "instrument") : null}`;
    }

    instrument.name = name;
    instrument.description = description;
    instrument.details = details;
    instrument.price = price;
    instrument.gst = gst;
    instrument.tax = tax;
    instrument.deliveryFee = deliveryFee;
    instrument.discount = discount;
    instrument.stock = stock;
    instrument.expert = expert;
    instrument.offer = offer;
    instrument.group = group;

    await instrument.save();
    res.status(200).json({
      success: true,
      message: "Instrument updated successfully",
      data: instrument,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update instrument",
      error: err.message,
    });
  }
};

// DELETE
exports.deleteInstrument = async (req, res) => {
  try {
    const instrument = await Instrument.findById(req.params.id);
    if (!instrument) {
      return res.status(404).json({
        success: false,
        message: "Instrument not found",
      });
    }
    // Delete image file
    if (instrument.image) {
      fs.unlink(path.join(__dirname, "..", instrument.image), (err) => {
        if (err) console.error("Failed to delete image:", err);
      });
    }
    await Instrument.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Instrument deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to delete instrument",
      error: err.message,
    });
  }
};
