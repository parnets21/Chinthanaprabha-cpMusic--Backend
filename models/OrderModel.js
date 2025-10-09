/* const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "customerModel",
    },
    customerModel: {
      type: String,
      required: true,
      enum: ["User", "Teacher"],
    },
    items: [
      {
        instrument: { type: mongoose.Schema.Types.ObjectId, ref: "Instrument" },
        quantity: { type: Number, default: 1 },
        price: { type: Number, required: true },
        instrumentName: { type: String },
        instrumentDescription: { type: String },
        instrumentImage: { type: String },
        category: { type: String },
        subcategory: { type: String },
        gst: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        deliveryFee: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
      },
    ],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["processing", "shipped", "delivered", "cancelled"],
      default: "processing",
    },
    address: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
 */

const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "customerModel",
    },
    customerModel: {
      type: String,
      required: true,
      enum: ["User", "Teacher"],
    },
    // Add customer info for cases where customer reference might not work
    customerInfo: {
      userId: { type: String },
      userRole: { type: String },
      name: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    items: [
      {
        id: { type: String },
        name: { type: String },
        quantity: { type: Number, default: 1 },
        price: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        gst: { type: Number, default: 0 },
        deliveryFee: { type: Number, default: 0 },
        // Legacy fields for backward compatibility
        instrument: { type: mongoose.Schema.Types.ObjectId, ref: "Instrument" },
        instrumentName: { type: String },
        instrumentDescription: { type: String },
        instrumentImage: { type: String },
        category: { type: String },
        subcategory: { type: String },
      },
    ],
    total: { type: Number, required: true },
    subtotal: { type: Number },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["processing", "shipped", "delivered", "cancelled"],
      default: "processing",
    },
    address: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ["cod", "online", "upi", "card", "netbanking", "wallet"],
      default: "cod",
    },

    // PAYMENT STATUS FIELDS
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "cancelled"],
      default: function () {
        // Auto-set based on payment method
        if (this.paymentMethod === "cod") {
          return "pending"
        }
        return "paid" // Assume online payments are paid immediately
      },
    },

    // Payment Timestamps
    paidAt: {
      type: Date,
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    paymentFailedAt: {
      type: Date,
      default: null,
    },

    // Payment Details
    paymentDetails: {
      transactionId: { type: String },
      paymentGateway: { type: String },
      paymentReference: { type: String },
      refundReference: { type: String },
      refundReason: { type: String },
      refundAmount: { type: Number },
      failureReason: { type: String },
    },

    // Admin Action Tracking
    lastModifiedBy: {
      type: String,
      enum: ["system", "admin", "user"],
      default: "system",
    },

    lastModifiedAt: {
      type: Date,
      default: Date.now,
    },

    // Payment Status History
    paymentStatusHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "paid", "failed", "refunded", "cancelled"],
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: String,
          enum: ["system", "admin", "user"],
          default: "system",
        },
        reason: { type: String },
        notes: { type: String },
      },
    ],

    trackingId: { type: String },
    estimatedDelivery: { type: Date },
    deliveryDate: { type: Date },
    // Enhanced cancellation fields
    cancellationReason: { type: String },
    cancellationDate: { type: Date },
    cancelledBy: { type: String, enum: ["user", "admin"] }, // Track who cancelled
  },
  { timestamps: true },
)

// Pre-save middleware to handle payment status logic
orderSchema.pre("save", function (next) {
  // Auto-set payment status for COD orders when delivered
  if (this.paymentMethod === "cod" && this.status === "delivered" && this.paymentStatus === "pending") {
    this.paymentStatus = "paid"
    this.paidAt = new Date()
    this.lastModifiedBy = "system"
    this.lastModifiedAt = new Date()

    // Add to payment status history
    this.paymentStatusHistory.push({
      status: "paid",
      changedAt: new Date(),
      changedBy: "system",
      reason: "Order delivered - COD payment received",
    })
  }

  // Set paid timestamp when payment status changes to paid
  if (this.isModified("paymentStatus")) {
    this.lastModifiedAt = new Date()

    if (this.paymentStatus === "paid" && !this.paidAt) {
      this.paidAt = new Date()
    }

    // Set refund timestamp when payment status changes to refunded
    if (this.paymentStatus === "refunded" && !this.refundedAt) {
      this.refundedAt = new Date()
    }

    // Set failure timestamp when payment status changes to failed
    if (this.paymentStatus === "failed" && !this.paymentFailedAt) {
      this.paymentFailedAt = new Date()
    }
  }

  next()
})

// Method to add payment status history entry
orderSchema.methods.addPaymentStatusHistory = function (status, changedBy, reason, notes) {
  this.paymentStatusHistory.push({
    status,
    changedAt: new Date(),
    changedBy,
    reason,
    notes,
  })
}

// Method to update payment status with history tracking
orderSchema.methods.updatePaymentStatus = function (newStatus, changedBy, reason, notes, paymentDetails) {
  const oldStatus = this.paymentStatus
  this.paymentStatus = newStatus
  this.lastModifiedBy = changedBy
  this.lastModifiedAt = new Date()

  // Update payment details if provided
  if (paymentDetails) {
    this.paymentDetails = { ...this.paymentDetails, ...paymentDetails }
  }

  // Add to history
  this.addPaymentStatusHistory(
    newStatus,
    changedBy,
    reason || `Payment status changed from ${oldStatus} to ${newStatus}`,
    notes,
  )

  return this
}

module.exports = mongoose.model("Order", orderSchema)
