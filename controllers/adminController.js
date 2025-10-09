const Admin = require("../models/Admin")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")

dotenv.config()

// Register Admin
const registerAdmin = async (req, res) => {
  console.log("Request Body:", req.body)
  const { email, password, role } = req.body // Destructure role

  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email })
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" })
    }

    // Create new admin with specified role or default to 'admin'
    const admin = new Admin({ email, password, role: role || "admin" })
    await admin.save()

    // Generate JWT token including the role
    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    })

    res.status(201).json({ token, role: admin.role }) // Return role in response
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}

// Login Admin
const loginAdmin = async (req, res) => {
  const { email, password } = req.body

  try {
    // Find admin by email
    const admin = await Admin.findOne({ email })
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Compare passwords
    const isMatch = await admin.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Generate JWT token including the role
    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    })

    res.status(200).json({ token, role: admin.role }) // Return role in response
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}

// Get all subadmins
const getSubadmins = async (req, res) => {
  try {
    const subadmins = await Admin.find({ role: "subadmin" }).select("-password") // Exclude password
    res.status(200).json(subadmins)
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}

// Update a subadmin
const updateSubadmin = async (req, res) => {
  const { id } = req.params
  const { email, password } = req.body

  try {
    const subadmin = await Admin.findById(id)

    if (!subadmin) {
      return res.status(404).json({ message: "Subadmin not found" })
    }

    if (email) subadmin.email = email
    if (password) subadmin.password = password // Pre-save hook will hash it

    await subadmin.save()
    res.status(200).json({
      message: "Subadmin updated successfully",
      subadmin: { id: subadmin._id, email: subadmin.email, role: subadmin.role },
    })
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}

// Delete a subadmin
const deleteSubadmin = async (req, res) => {
  const { id } = req.params

  try {
    const subadmin = await Admin.findById(id)

    if (!subadmin) {
      return res.status(404).json({ message: "Subadmin not found" })
    }

    if (subadmin.role !== "subadmin") {
      return res.status(403).json({ message: "Cannot delete a non-subadmin account via this endpoint" })
    }

    await subadmin.deleteOne() // Use deleteOne() for Mongoose 6+
    res.status(200).json({ message: "Subadmin deleted successfully" })
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}

module.exports = { registerAdmin, loginAdmin, getSubadmins, updateSubadmin, deleteSubadmin }
