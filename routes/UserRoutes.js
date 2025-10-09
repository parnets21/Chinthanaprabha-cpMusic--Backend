const express = require("express")
const router = express.Router()
const UserController = require("../controllers/UserController")
const multer = require("multer")

// Configure multer for memory storage (better for cloud uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
})

// Registration route
router.post("/register", UserController.register)

// Login route (Sends OTP)
router.post("/login", UserController.login)

// Get user details
router.get("/user/:userId", UserController.getUserDetails)

// OTP Verification route
router.post("/verify-otp", UserController.verifyOTP)

// Update user - FIXED: Use single file upload
router.put("/user/update/:userId", upload.single("profilePicture"), UserController.updateUser)

// Get all users route
router.get("/users", UserController.getAllUsers)

// Delete user
router.delete("/user/:userId", UserController.deleteUser)

// Update FCM token
router.put("/user/:userId/fcm-token", UserController.updateFcmToken)

// New: Get user's wallet balance
router.get("/user/:userId/wallet", UserController.getWalletBalance)

// New: Credit user's wallet (internal API, secure appropriately)
router.post("/user/:userId/credit-wallet", UserController.creditWallet)
router.get("/user/:userId/wallet-history", UserController.getWalletHistory)

// New: Get referral earnings for admin panel
router.get("/admin/referral-earnings", UserController.getReferralEarnings)

module.exports = router
