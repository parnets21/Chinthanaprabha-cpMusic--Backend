const { uploadFile2 } = require("../middleware/aws")
const Offer = require("../models/OfferModel")
const upload = require("../middleware/multerConfig") // Import the upload middleware

// Create a new offer
const createOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      couponCode,
      discountPercentage,
      discountAmount,
      validFrom,
      validUntil,
      isActive,
      usageLimit,
    } = req.body

    const image = req.files["image"] ? await uploadFile2(req.files["image"][0], "offers") : undefined
    const thumbnail = req.files["thumbnail"] ? await uploadFile2(req.files["thumbnail"][0], "offers") : undefined
    const video = req.files["video"] ? await uploadFile2(req.files["video"][0], "offers") : undefined

    // Validate required fields
    if (!image) {
      return res.status(400).json({ message: "Image is required" })
    }

    const newOffer = new Offer({
      title,
      description,
      couponCode,
      image,
      thumbnail,
      video,
      discountPercentage,
      discountAmount,
      validFrom,
      validUntil,
      isActive,
      usageLimit,
    })

    await newOffer.save()
    res.status(201).json({ message: "Offer created successfully", offer: newOffer })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Coupon code already exists" })
    }
    res.status(500).json({ message: "Error creating offer", error: error.message })
  }
}

// Get all offers
const getAllOffers = async (req, res) => {
  try {
    const { active } = req.query
    const filter = {}

    if (active !== undefined) {
      filter.isActive = active === "true"
    }

    const offers = await Offer.find(filter).sort({ createdAt: -1 })
    res.status(200).json(offers)
  } catch (error) {
    res.status(500).json({ message: "Error fetching offers", error: error.message })
  }
}

// Get a single offer by ID
const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" })
    }
    res.status(200).json(offer)
  } catch (error) {
    res.status(500).json({ message: "Error fetching offer", error: error.message })
  }
}

// Get offer by coupon code
const getOfferByCouponCode = async (req, res) => {
  try {
    const { couponCode } = req.params
    const offer = await Offer.findOne({ couponCode, isActive: true })

    if (!offer) {
      return res.status(404).json({ message: "Invalid or inactive coupon code" })
    }

    // Check if offer is still valid
    const now = new Date()
    if (now < offer.validFrom || now > offer.validUntil) {
      return res.status(400).json({ message: "Coupon code has expired" })
    }

    // Check usage limit
    if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
      return res.status(400).json({ message: "Coupon code usage limit exceeded" })
    }

    res.status(200).json(offer)
  } catch (error) {
    res.status(500).json({ message: "Error fetching offer", error: error.message })
  }
}

// Update an offer by ID
const updateOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      couponCode,
      discountPercentage,
      discountAmount,
      validFrom,
      validUntil,
      isActive,
      usageLimit,
    } = req.body

    const image = req.files["image"] ? await uploadFile2(req.files["image"][0], "offers") : undefined
    const thumbnail = req.files["thumbnail"] ? await uploadFile2(req.files["thumbnail"][0], "offers") : undefined
    const video = req.files["video"] ? await uploadFile2(req.files["video"][0], "offers") : undefined

    // Build update object with only provided fields
    const updateData = {
      title,
      description,
      couponCode,
      discountPercentage,
      discountAmount,
      validFrom,
      validUntil,
      isActive,
      usageLimit,
    }

    if (image) updateData.image = image
    if (thumbnail) updateData.thumbnail = thumbnail
    if (video) updateData.video = video

    const updatedOffer = await Offer.findByIdAndUpdate(req.params.id, updateData, { new: true })

    if (!updatedOffer) {
      return res.status(404).json({ message: "Offer not found" })
    }
    res.status(200).json({ message: "Offer updated successfully", offer: updatedOffer })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Coupon code already exists" })
    }
    res.status(500).json({ message: "Error updating offer", error: error.message })
  }
}

// Delete an offer by ID
const deleteOffer = async (req, res) => {
  try {
    const deletedOffer = await Offer.findByIdAndDelete(req.params.id)
    if (!deletedOffer) {
      return res.status(404).json({ message: "Offer not found" })
    }
    res.status(200).json({ message: "Offer deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting offer", error: error.message })
  }
}

// Use coupon code (increment usage count)
const useCouponCode = async (req, res) => {
  try {
    const { couponCode } = req.params
    const offer = await Offer.findOne({ couponCode, isActive: true })

    if (!offer) {
      return res.status(404).json({ message: "Invalid or inactive coupon code" })
    }

    // Check if offer is still valid
    const now = new Date()
    if (now < offer.validFrom || now > offer.validUntil) {
      return res.status(400).json({ message: "Coupon code has expired" })
    }

    // Check usage limit
    if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
      return res.status(400).json({ message: "Coupon code usage limit exceeded" })
    }

    // Increment usage count
    offer.usedCount += 1
    await offer.save()

    res.status(200).json({
      message: "Coupon code used successfully",
      offer,
      discount: {
        percentage: offer.discountPercentage,
        amount: offer.discountAmount,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Error using coupon code", error: error.message })
  }
}

module.exports = {
  createOffer,
  getAllOffers,
  getOfferById,
  getOfferByCouponCode,
  updateOffer,
  deleteOffer,
  useCouponCode,
}
