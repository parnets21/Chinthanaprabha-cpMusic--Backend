const express = require("express")
const {
  registerAdmin,
  loginAdmin,
  getSubadmins,
  updateSubadmin,
  deleteSubadmin,
} = require("../controllers/adminController")
// Removed: const { protect, authorizeRoles } = require("../middleware/authMiddleware"); // Removed import

const router = express.Router()

// Register Route (can be accessed by anyone initially, or protected later)
router.post("/register", registerAdmin)

// Login Route
router.post("/login", loginAdmin)

// Protected routes for managing subadmins (middleware removed as per request)
// These routes will now only require a valid token if 'protect' was the only middleware.
// If no other authentication middleware is applied, they will be publicly accessible.
router.get("/subadmins", getSubadmins) // Removed protect, authorizeRoles
router.put("/subadmins/:id", updateSubadmin) // Removed protect, authorizeRoles
router.delete("/subadmins/:id", deleteSubadmin) // Removed protect, authorizeRoles

module.exports = router
