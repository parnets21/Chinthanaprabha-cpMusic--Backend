const express = require("express")
const router = express.Router()
const OfferController = require("../controllers/OfferController")
const upload = require("../middleware/multerConfig")

// Create a new offer
router.post(
  "/offers",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  OfferController.createOffer,
)

// Get all offers (with optional active filter)
router.get("/offers", OfferController.getAllOffers)

// Get a single offer by ID
router.get("/offers/:id", OfferController.getOfferById)

// Get offer by coupon code
router.get("/offers/coupon/:couponCode", OfferController.getOfferByCouponCode)

// Use coupon code (increment usage count)
router.post("/offers/coupon/:couponCode/use", OfferController.useCouponCode)

// Update an offer by ID
router.put(
  "/offers/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  OfferController.updateOffer,
)

// Delete an offer by ID
router.delete("/offers/:id", OfferController.deleteOffer)

module.exports = router
