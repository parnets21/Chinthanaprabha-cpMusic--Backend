const { uploadFile2 } = require("../middleware/aws")
const User = require("../models/UserModel")
const WalletTransaction = require("../models/WalletTransactionModel") // Add this import
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")

// Helper to generate a professional-looking referral code
const generateReferralCode = async (name) => {
  const sanitizedName = name ? name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : ""
  let base = sanitizedName.substring(0, Math.min(sanitizedName.length, 5)) // Take first 5 chars of sanitized name
  if (base.length === 0) {
    base = "USER" // Fallback if name is empty or only special chars
  }

  let newReferralCode
  let isUnique = false
  let counter = 0
  while (!isUnique && counter < 100) {
    // Limit attempts to prevent infinite loops
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase() // 5 random alphanumeric chars
    newReferralCode = `${base}${randomSuffix}`.substring(0, 10) // Ensure max length, e.g., 10 characters

    // Check if the generated code already exists in the database
    const existingCode = await User.findOne({ referralCode: newReferralCode })
    if (!existingCode) {
      isUnique = true
    }
    counter++
  }

  if (!isUnique) {
    // Fallback to a purely random code if name-based generation fails after many attempts
    console.warn("Could not generate unique name-based referral code, falling back to random.")
    return Math.random().toString(36).substring(2, 12).toUpperCase() // 10 random chars
  }

  return newReferralCode
}

// Generate a fixed dummy OTP for testing (instead of a random one)
function generateOTP() {
  return "123456" // Fixed OTP for testing (you can use a random generator for real cases)
}

// Registration controller
exports.register = async (req, res) => {
  const { name, email, mobile, fcmToken, referredBy } = req.body

  try {
    // Check if the user already exists by mobile
    const existingUserByMobile = await User.findByMobile(mobile)
    if (existingUserByMobile) {
      return res.status(400).json({ message: "Mobile number is already registered" })
    }

    // Check if the user already exists by email
    const existingUserByEmail = await User.findOne({ email })
    if (existingUserByEmail) {
      return res.status(400).json({ message: "Email address is already registered" })
    }

    // Generate OTP
    const otp = generateOTP()

    // Set OTP expiration time (e.g., 10 minutes)
    const otpExpiration = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    // Generate a unique referral code for the new user
    let newReferralCode
    // Change this line:
    newReferralCode = await generateReferralCode(name) // Pass the user's name

    // Create and save a new user (with FCM token and referral info if provided)
    const user = new User({
      name,
      email,
      mobile,
      fcmToken: fcmToken || null,
      referralCode: newReferralCode, // Assign the generated referral code
      referredBy: referredBy || null, // Store the referrer's code if provided
    })
    await user.save()

    // Save OTP and expiration time to the user record
    await User.updateOtp(mobile, otp, otpExpiration)

    // Log OTP for testing purposes (remove in production)
    console.log("Dummy OTP for registration:", otp)

    // Return the OTP and user ID
    res.status(201).json({
      message: "User registered successfully, please verify OTP",
      otp: otp,
      userId: user._id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode, // Include the new user's referral code
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error registering user" })
  }
}

// Login controller
exports.login = async (req, res) => {
  const { mobile, fcmToken } = req.body

  // Validate input
  if (!mobile) {
    return res.status(400).json({ message: "Mobile number is required" })
  }

  try {
    // Find the user by mobile
    const user = await User.findByMobile(mobile)
    if (!user) {
      return res.status(400).json({ message: "User not found" })
    }

    // Update FCM token if provided
    if (fcmToken) {
      user.fcmToken = fcmToken
      await user.save()
    }

    // Generate and save OTP for the user
    const otp = generateOTP()
    console.log("Dummy OTP:", otp) // Log OTP for testing

    // Save OTP and expiration time to the user record
    await User.updateOtp(mobile, otp)

    // Return the user ID along with the OTP
    res.status(200).json({
      message: "OTP generated successfully",
      otp: otp,
      userId: user._id,
      name: user.name,
      email: user.email,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error during login" })
  }
}

// Verify OTP controller
exports.verifyOTP = async (req, res) => {
  const { mobile, otp, fcmToken } = req.body

  try {
    // Find user by mobile
    const user = await User.findByMobile(mobile)
    if (!user) {
      return res.status(400).json({ message: "User not found" })
    }

    // Check if the OTP matches
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" })
    }

    // Check if OTP is expired
    const now = new Date()
    if (now > user.otpExpiration) {
      return res.status(400).json({ message: "OTP expired" })
    }

    // Update FCM token if provided
    if (fcmToken) {
      user.fcmToken = fcmToken
      await user.save()
    }

    // OTP verified, issue a JWT token
    const token = jwt.sign({ userId: user._id }, "secretKey", { expiresIn: "1h" })

    // Return the token, user ID, name, and email
    res.status(200).json({
      message: "OTP verified",
      token,
      userId: user._id,
      name: user.name,
      email: user.email,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error verifying OTP" })
  }
}

// Update FCM token
exports.updateFcmToken = async (req, res) => {
  const { userId } = req.params
  const { fcmToken } = req.body

  if (!fcmToken) {
    return res.status(400).json({ message: "FCM token is required" })
  }

  try {
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.fcmToken = fcmToken
    await user.save()

    res.status(200).json({ message: "FCM token updated successfully" })
  } catch (error) {
    console.error("Error updating FCM token:", error)
    res.status(500).json({ message: "Error updating FCM token" })
  }
}

// Get user details
exports.getUserDetails = async (req, res) => {
  const { userId } = req.params

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID" })
  }

  try {
    // Include referralCode, referredBy, and walletBalance in the select statement
    const user = await User.findById(userId).select("-password -otp")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({
      message: "User details fetched successfully",
      userId: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      image: user.image,
      fcmToken: user.fcmToken,
      referralCode: user.referralCode, // Include referral code
      referredBy: user.referredBy, // Include referred by
      walletBalance: user.walletBalance, // Include wallet balance
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error fetching user details" })
  }
}

// Update user
exports.updateUser = async (req, res) => {
  const { userId } = req.params
  const { name, email, mobile, fcmToken } = req.body

  console.log("Request Body:", req.body)
  console.log("Request File:", req.file) // Changed from req.files to req.file

  try {
    // Validate mobile number format (simple validation using RegEx)
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: "Invalid mobile number format. Please enter a 10-digit mobile number." })
    }

    // Validate email format
    if (email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
      return res.status(400).json({ message: "Invalid email format" })
    }

    // Check if the new mobile is already registered (excluding current user)
    if (mobile) {
      const existingUserByMobile = await User.findOne({ mobile, _id: { $ne: userId } })
      if (existingUserByMobile) {
        return res.status(400).json({ message: "Mobile number is already registered by another user" })
      }
    }

    // Check if the new email is already registered (excluding current user)
    if (email) {
      const existingUserByEmail = await User.findOne({ email, _id: { $ne: userId } })
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email address is already registered by another user" })
      }
    }

    // Create update object
    const updateData = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (mobile) updateData.mobile = mobile
    if (fcmToken) updateData.fcmToken = fcmToken

    // Handle profile picture update - FIXED
    if (req.file) {
      try {
        console.log("Uploading file:", req.file)
        const profilePictureUrl = await uploadFile2(req.file, "profile-pictures")
        console.log("Upload successful, URL:", profilePictureUrl)
        updateData.image = profilePictureUrl
      } catch (uploadError) {
        console.error("Error uploading profile picture to AWS:", uploadError)
        return res.status(500).json({ message: "Error uploading profile picture to AWS" })
      }
    }

    // Update user in DB
    const user = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    console.log("Updated user:", user) // Debug log

    res.status(200).json({
      message: "User details updated successfully",
      userId: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      image: user.image, // This should now contain the correct image URL
      fcmToken: user.fcmToken,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      walletBalance: user.walletBalance,
    })
  } catch (error) {
    console.error("Error updating user:", error)
    res.status(500).json({ message: "Error updating user details" })
  }
}

// Fetch all users
exports.getAllUsers = async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await User.find().select("-password -otp") // Exclude password and otp

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" })
    }

    res.status(200).json({
      message: "Users fetched successfully",
      users,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error fetching users" })
  }
}

exports.deleteUser = async (req, res) => {
  const { userId } = req.params

  try {
    const deletedUser = await User.findByIdAndDelete(userId)

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    res.status(500).json({ message: "Error deleting user" })
  }
}

// New: Helper function to credit user's wallet (for internal use)
exports.creditUserWallet = async (userId, amount, description, relatedEntity = null, relatedModel = null) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User ID for wallet credit")
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Invalid amount. Must be a positive number.")
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: amount } }, // Increment wallet balance
      { new: true }, // Return the updated document
    )

    if (!user) {
      throw new Error("User not found for wallet credit")
    }

    // Record the transaction
    const transaction = new WalletTransaction({
      userId,
      type: "credit",
      amount,
      description: description || "Wallet credit",
      relatedEntity,
      relatedModel,
    })
    await transaction.save()

    console.log(`Wallet credited by ${amount} for user ${userId}. New balance: ${user.walletBalance}`)
    return user
  } catch (error) {
    console.error("Error crediting user wallet internally:", error)
    throw error // Re-throw to be caught by the calling function
  }
}

// New: Get user's wallet balance (controller for API route)
exports.getWalletBalance = async (req, res) => {
  const { userId } = req.params

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID" })
  }

  try {
    const user = await User.findById(userId).select("walletBalance")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.status(200).json({
      message: "Wallet balance fetched successfully",
      walletBalance: user.walletBalance,
    })
  } catch (error) {
    console.error("Error fetching wallet balance:", error)
    res.status(500).json({ message: "Error fetching wallet balance" })
  }
}

// New: Credit user's wallet (controller for API route)
exports.creditWallet = async (req, res) => {
  const { userId } = req.params
  const { amount } = req.body

  try {
    const updatedUser = await exports.creditUserWallet(userId, amount) // Use the internal helper
    res.status(200).json({
      message: `Wallet credited by ${amount}. New balance: ${updatedUser.walletBalance}`,
      walletBalance: updatedUser.walletBalance,
    })
  } catch (error) {
    console.error("Error crediting wallet via API:", error)
    res.status(500).json({ message: error.message })
  }
}

// New: Get user's wallet transaction history
exports.getWalletHistory = async (req, res) => {
  const { userId } = req.params

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID" })
  }

  try {
    const transactions = await WalletTransaction.find({ userId }).sort({ transactionDate: -1 }).lean() // Use .lean() for faster queries if not modifying documents

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({ message: "No wallet transactions found for this user.", history: [] })
    }

    res.status(200).json({
      message: "Wallet history fetched successfully",
      history: transactions,
    })
  } catch (error) {
    console.error("Error fetching wallet history:", error)
    res.status(500).json({ message: "Error fetching wallet history" })
  }
}


// New: Get referral earnings for admin panel
exports.getReferralEarnings = async (req, res) => {
  try {
    const referralTransactions = await WalletTransaction.find({
      type: "credit",
      description: { $regex: "Referral bonus", $options: "i" }, // Case-insensitive search for "Referral bonus"
    })
      .populate("userId", "name email mobile") // Populate referrer details
      .populate("relatedEntity", "name email mobile") // Populate referred user details
      .sort({ transactionDate: -1 })
      .lean()

    // Filter out transactions where userId or relatedEntity might not be found (e.g., deleted users)
    const filteredTransactions = referralTransactions.filter((t) => t.userId && t.relatedEntity)

    res.status(200).json({
      message: "Referral earnings fetched successfully",
      earnings: filteredTransactions,
    })
  } catch (error) {
    console.error("Error fetching referral earnings:", error)
    res.status(500).json({ message: "Error fetching referral earnings" })
  }
}
