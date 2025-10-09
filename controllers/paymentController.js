const Payment = require("../models/Payment")
const Course = require("../models/CourseModel")
const User = require("../models/UserModel") // Import the User model
const Offer = require("../models/OfferModel") // Import the Offer model
const { creditUserWallet } = require("../controllers/UserController") // Import the new helper function
const WalletTransaction = require("../models/WalletTransactionModel") // Add this import

// Define the referral reward amount
const REFERRAL_REWARD_AMOUNT = 100 // Example: ₹100

// Helper function to validate and apply coupon
const applyCoupon = async (couponCode, baseAmount) => {
  if (!couponCode) {
    return {
      discountAmount: 0,
      couponCodeApplied: null,
      message: "No coupon code provided.",
    }
  }

  const offer = await Offer.findOne({ couponCode, isActive: true })

  if (!offer) {
    throw new Error("Invalid or inactive coupon code.")
  }

  // Check if offer is still valid
  const now = new Date()
  if (now < offer.validFrom || now > offer.validUntil) {
    throw new Error("Coupon code has expired.")
  }

  // Check usage limit
  if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
    throw new Error("Coupon code usage limit exceeded.")
  }

  let discountAmount = 0
  if (offer.discountPercentage) {
    discountAmount = (baseAmount * offer.discountPercentage) / 100
  } else if (offer.discountAmount) {
    discountAmount = offer.discountAmount
  }

  // Ensure discount doesn't exceed base amount
  discountAmount = Math.min(discountAmount, baseAmount)

  return {
    discountAmount: Math.round(discountAmount), // Round discount to nearest whole number
    couponCodeApplied: offer.couponCode,
    offerId: offer._id, // Return offer ID for later usage count update
  }
}

// Calculate payment breakdown
exports.calculatePaymentBreakdown = async (req, res) => {
  try {
    console.log("Calculating payment breakdown for course:", req.params.courseId)
    const { courseId } = req.params
    const { couponCode } = req.body // Get couponCode from request body

    const course = await Course.findById(courseId)
    if (!course) {
      console.log("Course not found:", courseId)
      return res.status(404).json({ message: "Course not found." })
    }

    console.log("Found course:", course.name, "Price:", course.price)

    let baseAmount = course.price
    let discountAmount = 0
    let couponCodeApplied = null

    if (couponCode) {
      try {
        const couponResult = await applyCoupon(couponCode, baseAmount)
        discountAmount = couponResult.discountAmount
        couponCodeApplied = couponResult.couponCodeApplied
        baseAmount -= discountAmount // Apply discount to base amount
      } catch (couponError) {
        return res.status(400).json({ message: couponError.message })
      }
    }

    const taxRate = 10
    const gstRate = 18

    const taxAmount = Math.round((baseAmount * taxRate) / 100)
    const gstAmount = Math.round((baseAmount * gstRate) / 100)
    const totalAmount = baseAmount + taxAmount + gstAmount

    const breakdown = {
      originalBaseAmount: course.price, // Keep original price for display
      baseAmount, // This is the discounted base amount
      discountAmount,
      couponCodeApplied,
      taxAmount,
      gstAmount,
      totalAmount,
      taxRate,
      gstRate,
      courseName: course.name,
    }

    console.log("Payment breakdown calculated:", breakdown)
    res.status(200).json(breakdown)
  } catch (err) {
    console.error("Error calculating payment breakdown:", err)
    res.status(500).json({ error: err.message })
  }
}

// Process enhanced payment
exports.processPayment = async (req, res) => {
  try {
    console.log("Processing payment with data:", req.body)

    const { courseId, userId, paymentMethod, paymentDetails, couponCode } = req.body

    if (!courseId || !userId || !paymentMethod) {
      console.log("Missing required fields:", { courseId, userId, paymentMethod })
      return res.status(400).json({
        message: "Course ID, User ID, and Payment Method are required.",
      })
    }

    const existingPurchase = await Payment.findOne({
      userId,
      courseId,
      status: "completed",
    })

    if (existingPurchase) {
      console.log("Course already purchased by user:", userId)
      return res.status(400).json({
        message: "Course already purchased by this user.",
      })
    }

    console.log("Fetching course with ID:", courseId)
    const course = await Course.findById(courseId)
    if (!course) {
      console.log("Course not found:", courseId)
      return res.status(404).json({ message: "Course not found." })
    }

    console.log("Found course:", course.name, "Price:", course.price)

    const validationResult = validatePaymentDetails(paymentMethod, paymentDetails)
    if (!validationResult.isValid) {
      console.log("Payment validation failed:", validationResult.message)
      return res.status(400).json({ message: validationResult.message })
    }

    let baseAmount = course.price
    let discountAmount = 0
    let couponCodeApplied = null
    let offerId = null

    if (couponCode) {
      try {
        const couponResult = await applyCoupon(couponCode, baseAmount)
        discountAmount = couponResult.discountAmount
        couponCodeApplied = couponResult.couponCodeApplied
        offerId = couponResult.offerId
        baseAmount -= discountAmount // Apply discount to base amount
      } catch (couponError) {
        return res.status(400).json({ message: couponError.message })
      }
    }

    const taxRate = 10
    const gstRate = 18
    const taxAmount = Math.round((baseAmount * taxRate) / 100)
    const gstAmount = Math.round((baseAmount * gstRate) / 100)
    const totalAmount = baseAmount + taxAmount + gstAmount

    console.log("Calculated amounts:", {
      baseAmount,
      taxAmount,
      gstAmount,
      totalAmount,
      discountAmount,
      couponCodeApplied,
    })

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

    console.log("Creating payment record...")
    const payment = new Payment({
      courseId,
      userId,
      baseAmount: course.price, // Store original base amount in payment record
      taxAmount,
      gstAmount,
      totalAmount,
      paymentMethod,
      paymentDetails: sanitizePaymentDetails(paymentDetails),
      status: "completed",
      transactionId,
      taxRate,
      gstRate,
      couponCodeApplied, // Store applied coupon code
      discountApplied: discountAmount, // Store applied discount amount
    })

    // --- New: Handle Wallet Payment ---
    if (paymentMethod === "wallet") {
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found for wallet payment." })
      }

      if (user.walletBalance < totalAmount) {
        return res.status(400).json({ message: "Insufficient wallet balance." })
      }

      // Deduct amount from wallet
      user.walletBalance -= totalAmount
      await user.save()

      // Set payment status to completed for wallet payments
      payment.status = "completed"
      // Ensure paymentDetails for wallet is recorded
      payment.paymentDetails = { walletType: paymentDetails.walletType || "Internal Wallet" }
      console.log(`Wallet payment successful for user ${userId}. New balance: ${user.walletBalance}`)
    }
    // --- End New: Handle Wallet Payment ---

    const savedPayment = await payment.save()
    console.log("Payment saved successfully:", savedPayment.transactionId)

    // Record debit transaction for wallet payment if it was used
    if (paymentMethod === "wallet") {
      const debitTransaction = new WalletTransaction({
        userId,
        type: "debit",
        amount: totalAmount,
        description: `Course purchase: ${course.name}`,
        relatedEntity: savedPayment._id, // Link to the payment record
        relatedModel: "Payment",
      })
      await debitTransaction.save()
    }

    // Increment usage count for the applied offer
    if (offerId) {
      await Offer.findByIdAndUpdate(offerId, { $inc: { usedCount: 1 } })
      console.log(`Offer ${couponCodeApplied} usage count incremented.`)
    }

    // --- Referral Earning Logic ---
    try {
      const purchaser = await User.findById(userId)
      if (purchaser && purchaser.referredBy) {
        // Check if this is the first purchase by the referred user
        const previousPurchases = await Payment.countDocuments({
          userId: purchaser._id,
          status: "completed",
          _id: { $ne: savedPayment._id }, // Exclude the current payment
        })

        if (previousPurchases === 0) {
          // This is the referred user's first completed purchase
          const referrer = await User.findOne({ referralCode: purchaser.referredBy })

          if (referrer) {
            await creditUserWallet(
              referrer._id,
              REFERRAL_REWARD_AMOUNT,
              `Referral bonus for ${purchaser.name}'s first purchase`,
              purchaser._id, // Link to the referred user
              "User",
            )
            console.log(
              `Referral reward of ₹${REFERRAL_REWARD_AMOUNT} credited to ${referrer.name} (ID: ${referrer._id}) for referring ${purchaser.name}.`,
            )
          } else {
            console.log(`Referrer with code ${purchaser.referredBy} not found.`)
          }
        } else {
          console.log(`User ${purchaser.name} has made previous purchases, no referral reward for this transaction.`)
        }
      }
    } catch (referralError) {
      console.error("Error processing referral reward:", referralError)
      // Do not block the main payment process if referral fails
    }
    // --- End Referral Earning Logic ---

    const responsePayment = savedPayment.toObject()

    if (responsePayment.paymentDetails) {
      if (responsePayment.paymentDetails.cardNumber) {
        responsePayment.paymentDetails.cardNumber =
          "**** **** **** " + responsePayment.paymentDetails.cardNumber.slice(-4)
      }
      if (responsePayment.paymentDetails.cvv) {
        delete responsePayment.paymentDetails.cvv
      }
    }

    res.status(201).json({
      message: "Payment processed successfully.",
      payment: responsePayment,
    })
  } catch (err) {
    console.error("Payment processing error:", err)
    console.error("Error stack:", err.stack)
    res.status(500).json({
      error: err.message,
      details: "Check server logs for more information",
    })
  }
}

// Get enhanced payment history for a user
exports.getPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params

    const payments = await Payment.find({ userId })
      .populate("courseId", "name image price instructor")
      .populate("userId", "name email")
      .sort({ paymentDate: -1 })

    if (!payments || payments.length === 0) {
      return res.status(404).json({
        message: "No payment history found for this user.",
      })
    }

    const sanitizedPayments = payments.map((payment) => {
      const paymentObj = payment.toObject()
      if (paymentObj.paymentDetails && paymentObj.paymentDetails.cardNumber) {
        paymentObj.paymentDetails.cardNumber = "**** **** **** " + paymentObj.paymentDetails.cardNumber.slice(-4)
      }
      if (paymentObj.paymentDetails && paymentObj.paymentDetails.cvv) {
        delete paymentObj.paymentDetails.cvv
      }
      return paymentObj
    })

    res.status(200).json(sanitizedPayments)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Get purchased courses with enhanced payment details
exports.getPurchasedCourses = async (req, res) => {
  try {
    const { userId } = req.params

    const payments = await Payment.find({
      userId,
      status: "completed",
    }).populate("courseId", "name image price lessons instructor")

    if (!payments || payments.length === 0) {
      return res.status(404).json({
        message: "No purchased courses found for this user.",
      })
    }

    const purchasedCourses = payments.map((payment) => ({
      ...payment.courseId.toObject(),
      paymentDetails: {
        transactionId: payment.transactionId,
        totalAmount: payment.totalAmount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        couponCodeApplied: payment.couponCodeApplied, // Include coupon info
        discountApplied: payment.discountApplied, // Include discount info
      },
    }))

    res.status(200).json(purchasedCourses)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Generate enhanced payment report
exports.generatePaymentReport = async (req, res) => {
  try {
    const { startDate, endDate, status, paymentMethod } = req.query

    const query = {}
    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }
    if (status) {
      query.status = status
    }
    if (paymentMethod) {
      query.paymentMethod = paymentMethod
    }

    const payments = await Payment.find(query)
      .populate("courseId", "name instructor")
      .populate("userId", "name email")
      .lean()

    if (!payments || payments.length === 0) {
      return res.status(200).json({
        totalPayments: 0,
        totalBaseAmount: 0,
        totalTaxAmount: 0,
        totalGstAmount: 0,
        totalAmount: 0,
        totalDiscountApplied: 0, // New field
        paymentMethodBreakdown: {},
        payments: [],
      })
    }

    const totalBaseAmount = payments.reduce((sum, payment) => sum + (payment.baseAmount || 0), 0)
    const totalTaxAmount = payments.reduce((sum, payment) => sum + (payment.taxAmount || 0), 0)
    const totalGstAmount = payments.reduce((sum, payment) => sum + (payment.gstAmount || 0), 0)
    const totalAmount = payments.reduce((sum, payment) => sum + (payment.totalAmount || 0), 0)
    const totalDiscountApplied = payments.reduce((sum, payment) => sum + (payment.discountApplied || 0), 0) // New field

    const paymentMethodBreakdown = payments.reduce((acc, payment) => {
      if (!payment.paymentMethod) {
        console.warn("Skipping payment with missing paymentMethod:", payment._id)
        return acc
      }
      if (!acc[payment.paymentMethod]) {
        acc[payment.paymentMethod] = {
          count: 0,
          totalAmount: 0,
        }
      }
      acc[payment.paymentMethod].count++ // Fixed: Correctly increment count
      acc[payment.paymentMethod].totalAmount += payment.totalAmount || 0
      return acc
    }, {})

    const sanitizedPayments = payments.map((payment) => {
      if (payment.paymentDetails) {
        if (payment.paymentDetails.cardNumber) {
          payment.paymentDetails.cardNumber = "**** **** **** " + payment.paymentDetails.cardNumber.slice(-4)
        }
        if (payment.paymentDetails.cvv) {
          delete payment.paymentDetails.cvv
        }
      }
      return payment
    })

    const report = {
      totalPayments: payments.length,
      totalBaseAmount,
      totalTaxAmount,
      totalGstAmount,
      totalAmount,
      totalDiscountApplied, // New field
      paymentMethodBreakdown,
      payments: sanitizedPayments,
    }

    res.status(200).json(report)
  } catch (err) {
    console.error("Error generating payment report:", err, { stack: err.stack })
    res.status(500).json({ error: err.message, details: "Check server logs for more information" })
  }
}
// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate("courseId", "name instructor")
      .populate("userId", "name email")
      .sort({ paymentDate: -1 })
      .lean()

    if (!payments || payments.length === 0) {
      return res.status(200).json([])
    }

    const sanitizedPayments = payments.map((payment) => {
      if (payment.paymentDetails) {
        if (payment.paymentDetails.cardNumber) {
          payment.paymentDetails.cardNumber = "**** **** **** **** " + payment.paymentDetails.cardNumber.slice(-4)
        }
        if (payment.paymentDetails?.cvv) {
          delete payment.paymentDetails.cvv
        }
      }
      return payment
    })

    res.status(200).json(sanitizedPayments)
  } catch (err) {
    console.error("Error fetching all payments:", err)
    res.status(500).json({ error: err.message, details: "Check server logs for more information" })
  }
}

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params
    const { status } = req.body

    const validStatuses = ["pending", "completed", "failed"]
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." })
    }

    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." })
    }

    payment.status = status
    await payment.save()

    res.status(200).json({ message: "Payment status updated successfully.", payment })
  } catch (err) {
    console.error("Error updating payment status:", err)
    res.status(500).json({ error: err.message, details: "Check server logs for more information" })
  }
}

// Update payment details
exports.updatePaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params
    const { baseAmount, taxAmount, gstAmount, totalAmount, paymentMethod, status, couponCodeApplied, discountApplied } =
      req.body

    // Validate inputs
    const validPaymentMethods = ["credit_card", "debit_card", "upi", "net_banking", "wallet"]
    const validStatuses = ["pending", "completed", "failed"]

    if (!baseAmount || baseAmount < 0) {
      return res.status(400).json({ message: "Base amount is required and must be non-negative." })
    }
    if (!taxAmount || taxAmount < 0) {
      return res.status(400).json({ message: "Tax amount is required and must be non-negative." })
    }
    if (!gstAmount || gstAmount < 0) {
      return res.status(400).json({ message: "GST amount is required and must be non-negative." })
    }
    if (!totalAmount || totalAmount < 0) {
      return res.status(400).json({ message: "Total amount is required and must be non-negative." })
    }
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method." })
    }
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status." })
    }

    // Verify totalAmount (considering discount)
    const expectedTotal =
      Number.parseFloat(baseAmount) -
      Number.parseFloat(discountApplied || 0) +
      Number.parseFloat(taxAmount) +
      Number.parseFloat(gstAmount)
    if (Math.abs(expectedTotal - Number.parseFloat(totalAmount)) > 0.01) {
      return res
        .status(400)
        .json({ message: "Total amount does not match calculated sum (base - discount + tax + GST)." })
    }

    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." })
    }

    // Update fields
    payment.baseAmount = Number.parseFloat(baseAmount)
    payment.taxAmount = Number.parseFloat(taxAmount)
    payment.gstAmount = Number.parseFloat(gstAmount)
    payment.totalAmount = Number.parseFloat(totalAmount)
    payment.paymentMethod = paymentMethod
    payment.status = status
    payment.couponCodeApplied = couponCodeApplied || null // Update coupon info
    payment.discountApplied = Number.parseFloat(discountApplied || 0) // Update discount info

    const updatedPayment = await payment.save()

    res.status(200).json({ message: "Payment updated successfully.", payment: updatedPayment })
  } catch (err) {
    console.error("Error updating payment details:", err)
    res.status(500).json({ error: err.message, details: "Check server logs for more information" })
  }
}

// Helper function to validate payment details
function validatePaymentDetails(paymentMethod, paymentDetails) {
  if (!paymentDetails) {
    return { isValid: false, message: "Payment details are required." }
  }

  switch (paymentMethod) {
    case "credit_card":
    case "debit_card":
      if (
        !paymentDetails.cardNumber ||
        !paymentDetails.cardHolderName ||
        !paymentDetails.expiryMonth ||
        !paymentDetails.expiryYear ||
        !paymentDetails.cvv
      ) {
        return {
          isValid: false,
          message: "Card number, holder name, expiry date, and CVV are required for card payments.",
        }
      }
      break
    case "upi":
      if (!paymentDetails.upiId) {
        return { isValid: false, message: "UPI ID is required for UPI payments." }
      }
      break
    case "net_banking":
      if (!paymentDetails.bankName) {
        return { isValid: false, message: "Bank name is required for net banking." }
      }
      break
    case "wallet":
      if (!paymentDetails.walletType) {
        return { isValid: false, message: "Wallet type is required for wallet payments." }
      }
      break
    default:
      return { isValid: false, message: "Invalid payment method." }
  }

  return { isValid: true }
}

// Helper function to sanitize payment details before saving
function sanitizePaymentDetails(paymentDetails) {
  const sanitized = { ...paymentDetails }

  if (sanitized.cardNumber) {
    sanitized.cardNumber = sanitized.cardNumber.replace(/\s/g, "")
  }

  return sanitized
}
