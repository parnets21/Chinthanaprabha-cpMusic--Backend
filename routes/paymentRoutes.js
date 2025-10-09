const express = require("express")
const router = express.Router()
const paymentController = require("../controllers/paymentController")

// Test route
router.get("/test", (req, res) => {
  res.json({
    message: "Payment routes are working!",
    timestamp: new Date().toISOString(),
  })
})

// Calculate payment breakdown (now accepts POST to include coupon code in body)
router.post("/calculate/:courseId", paymentController.calculatePaymentBreakdown)

// Process enhanced payment (now accepts coupon code in body)
router.post("/process", paymentController.processPayment)

// Get enhanced payment history for a user
router.get("/history/:userId", paymentController.getPaymentHistory)

// Get purchased courses with enhanced payment details
router.get("/purchased-courses/:userId", paymentController.getPurchasedCourses)

// Generate enhanced payment report
router.get("/report", paymentController.generatePaymentReport)

// Get all payments
router.get("/payments", paymentController.getAllPayments)

// Update payment status
router.put("/status/:paymentId", paymentController.updatePaymentStatus)

// Update payment details
router.put("/:paymentId", paymentController.updatePaymentDetails)

module.exports = router
