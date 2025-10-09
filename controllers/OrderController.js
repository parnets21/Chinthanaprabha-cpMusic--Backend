/* const Order = require("../models/OrderModel");
// CREATE Order (user or teacher)
exports.createOrder = async (req, res) => {
  try {
    const {
      customer, // user or teacher _id
      customerModel, // "User" or "Teacher"
      items,
      total,
      address,
      status,
    } = req.body;

    if (!customer || !customerModel || !items || !total || !address) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Optionally: Validate customerModel and customer existence here

    const order = new Order({
      customer,
      customerModel,
      items,
      total,
      address,
      status: status,
    });
    await order.save();
    res
      .status(201)
      .json({ success: true, message: "Order created", data: order });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: err.message,
    });
  }
};

// GET all orders (with customer and instrument details)
// Get Orders
exports.getOrders = async (req, res) => {
  try {
    const { customer, customerModel } = req.query;

    // Build query object
    const query = {};
    if (customer) query.customer = customer;
    if (customerModel) query.customerModel = customerModel;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 }) // optional: latest first
      .populate("customer"); // optional: populate user/teacher info if referenced

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: err.message,
    });
  }
};

// GET order by ID (with customer and instrument details)
// Get a specific order by ID
exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Find order by ID
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: err.message,
    });
  }
};

// UPDATE order status
exports.updateOrder = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    if (status) order.status = status;
    await order.save();
    res.json({ success: true, message: "Order updated", data: order });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: err.message,
    });
  }
};

// DELETE order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: err.message,
    });
  }
};
 */
const Order = require("../models/OrderModel")

// CREATE Order (user or teacher)
exports.createOrder = async (req, res) => {
  try {
    const {
      customer,
      customerModel,
      items,
      total,
      subtotal,
      discount,
      tax,
      gst,
      deliveryFee,
      address,
      paymentMethod,
      status,
      customerInfo,
    } = req.body

    console.log("=== ORDER CREATION DEBUG ===")
    console.log("Customer ID:", customer)
    console.log("Customer Model:", customerModel)
    console.log("Customer Info:", customerInfo)
    console.log("Payment Method:", paymentMethod)
    console.log("============================")

    // Enhanced validation
    if (!customer || !customerModel || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: customer, customerModel, and items are required",
      })
    }

    if (!total || total <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total amount must be greater than 0",
      })
    }

    if (!address || address.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      })
    }

    // Validate customerModel
    if (!["User", "Teacher"].includes(customerModel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer model. Must be 'User' or 'Teacher'",
      })
    }

    // Get customer data for storing in customerInfo
    let customerData = null
    try {
      if (customerModel === "User") {
        const User = require("../models/UserModel")
        customerData = await User.findById(customer).select("name email phone fullName phoneNumber")
      } else if (customerModel === "Teacher") {
        const Teacher = require("../models/TeacherModel")
        customerData = await Teacher.findById(customer).select("name email phone fullName phoneNumber")
      }
    } catch (error) {
      console.log("Error fetching customer data:", error.message)
    }

    // Validate items structure
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.name || !item.price || item.price <= 0 || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid item at index ${i}. Name, price, and quantity are required`,
        })
      }

      // Validate discount percentage
      if (item.discount && (item.discount < 0 || item.discount > 100)) {
        return res.status(400).json({
          success: false,
          message: `Invalid discount percentage for item: ${item.name}`,
        })
      }
    }

    // Create order with enhanced customer info and payment status
    const order = new Order({
      customer,
      customerModel,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
        tax: item.tax || 0,
        gst: item.gst || 0,
        deliveryFee: item.deliveryFee || 0,
        // Additional fields for better tracking
        instrumentName: item.instrumentName || item.name,
        instrumentDescription: item.instrumentDescription || item.description || "",
        instrumentImage: item.instrumentImage || "",
        category: item.category || "",
        subcategory: item.subcategory || "",
      })),
      total: total,
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      gst: gst,
      deliveryFee: deliveryFee,
      address: address.trim(),
      paymentMethod: paymentMethod || "cod",
      status: status || "processing",
      // Store customer info for reliable display
      customerInfo: {
        userId: customer,
        userRole: customerModel.toLowerCase(),
        name: customerData?.name || customerData?.fullName || `${customerModel} User`,
        phone: customerData?.phone || customerData?.phoneNumber || "",
        email: customerData?.email || "",
      },
    })

    // Add initial payment status history
    order.addPaymentStatusHistory(
      order.paymentStatus,
      "system",
      `Order created with payment method: ${order.paymentMethod}`,
      `Initial payment status set based on payment method`,
    )

    await order.save()

    console.log("Order created successfully:", order._id)

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    })
  } catch (err) {
    console.error("Error creating order:", err)
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    })
  }
}

// GET all orders (with enhanced filtering and population)
exports.getOrders = async (req, res) => {
  try {
    const {
      customer,
      customerModel,
      status,
      paymentStatus,
      paymentMethod,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    // Build query object
    const query = {}
    if (customer) query.customer = customer
    if (customerModel) query.customerModel = customerModel
    if (status) query.status = status
    if (paymentStatus) query.paymentStatus = paymentStatus
    if (paymentMethod) query.paymentMethod = paymentMethod

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    const sortOptions = {}
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1

    // Execute query
    const orders = await Order.find(query).sort(sortOptions).skip(skip).limit(Number.parseInt(limit)).lean()

    // Enhanced customer data population
    for (const order of orders) {
      try {
        // First try to use stored customerInfo
        if (order.customerInfo && order.customerInfo.name) {
          order.customer = {
            _id: order.customer,
            name: order.customerInfo.name,
            phone: order.customerInfo.phone,
            email: order.customerInfo.email,
          }
        } else {
          // Fallback to database lookup
          if (order.customerModel === "User") {
            const User = require("../models/UserModel")
            const userData = await User.findById(order.customer).select("name email phone fullName phoneNumber").lean()
            if (userData) {
              order.customer = {
                _id: order.customer,
                name: userData.name || userData.fullName || "User",
                phone: userData.phone || userData.phoneNumber || "",
                email: userData.email || "",
              }
            } else {
              // If user not found, create a fallback
              order.customer = {
                _id: order.customer,
                name: "User",
                phone: "",
                email: "",
              }
            }
          } else if (order.customerModel === "Teacher") {
            const Teacher = require("../models/TeacherModel")
            const teacherData = await Teacher.findById(order.customer)
              .select("name email phone fullName phoneNumber")
              .lean()
            if (teacherData) {
              order.customer = {
                _id: order.customer,
                name: teacherData.name || teacherData.fullName || "Teacher",
                phone: teacherData.phone || teacherData.phoneNumber || "",
                email: teacherData.email || "",
              }
            } else {
              // If teacher not found, create a fallback
              order.customer = {
                _id: order.customer,
                name: "Teacher",
                phone: "",
                email: "",
              }
            }
          }
        }
      } catch (populateError) {
        console.log("Could not populate customer data for order:", order._id, populateError.message)
        // Create fallback customer object
        order.customer = {
          _id: order.customer,
          name: order.customerModel || "Customer",
          phone: "",
          email: "",
        }
      }
    }

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query)
    const totalPages = Math.ceil(totalOrders / Number.parseInt(limit))

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: Number.parseInt(page) < totalPages,
        hasPrevPage: Number.parseInt(page) > 1,
      },
    })
  } catch (err) {
    console.error("Error fetching orders:", err)
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    })
  }
}

// GET order by ID (with enhanced population)
exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id

    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    // Find order by ID
    const order = await Order.findById(orderId).lean()

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Enhanced customer data population
    try {
      // First try to use stored customerInfo
      if (order.customerInfo && order.customerInfo.name) {
        order.customer = {
          _id: order.customer,
          name: order.customerInfo.name,
          phone: order.customerInfo.phone,
          email: order.customerInfo.email,
        }
      } else {
        // Fallback to database lookup
        if (order.customerModel === "User") {
          const User = require("../models/UserModel")
          const userData = await User.findById(order.customer).select("name email phone fullName phoneNumber").lean()
          if (userData) {
            order.customer = {
              _id: order.customer,
              name: userData.name || userData.fullName || "User",
              phone: userData.phone || userData.phoneNumber || "",
              email: userData.email || "",
            }
          }
        } else if (order.customerModel === "Teacher") {
          const Teacher = require("../models/TeacherModel")
          const teacherData = await Teacher.findById(order.customer)
            .select("name email phone fullName phoneNumber")
            .lean()
          if (teacherData) {
            order.customer = {
              _id: order.customer,
              name: teacherData.name || teacherData.fullName || "Teacher",
              phone: teacherData.phone || teacherData.phoneNumber || "",
              email: teacherData.email || "",
            }
          }
        }
      }
    } catch (populateError) {
      console.log("Could not populate customer data:", populateError.message)
      // Create fallback customer object
      order.customer = {
        _id: order.customer,
        name: order.customerModel || "Customer",
        phone: "",
        email: "",
      }
    }

    res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    })
  } catch (err) {
    console.error("Error fetching order:", err)
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    })
  }
}

// UPDATE order status and payment status with validation and admin/user differentiation
exports.updateOrder = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      trackingId,
      estimatedDelivery,
      deliveryDate,
      cancellationReason,
      isAdminAction,
      paymentDetails,
      notes,
    } = req.body
    const orderId = req.params.id

    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Validate status transition
    const validStatuses = ["processing", "shipped", "delivered", "cancelled"]
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      })
    }

    // Validate payment status
    const validPaymentStatuses = ["pending", "paid", "failed", "refunded", "cancelled"]
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status. Must be one of: " + validPaymentStatuses.join(", "),
      })
    }

    // Handle payment status updates
    if (paymentStatus) {
      const changedBy = isAdminAction ? "admin" : "user"
      const reason = `Payment status updated to ${paymentStatus}`

      // Validate payment status transitions
      if (paymentStatus === "refunded" && order.paymentStatus !== "paid") {
        return res.status(400).json({
          success: false,
          message: "Can only refund paid orders",
        })
      }

      if (paymentStatus === "paid" && order.paymentStatus === "refunded") {
        return res.status(400).json({
          success: false,
          message: "Cannot mark refunded orders as paid",
        })
      }

      // Update payment status with history tracking
      order.updatePaymentStatus(paymentStatus, changedBy, reason, notes, paymentDetails)
    }

    // Update other fields
    if (status) order.status = status
    if (trackingId) order.trackingId = trackingId
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery)
    if (deliveryDate) order.deliveryDate = new Date(deliveryDate)

    // Set cancellation reason and metadata
    if (status === "cancelled") {
      if (isAdminAction) {
        order.cancellationReason = cancellationReason || "Cancelled by admin"
        order.cancelledBy = "admin"
      } else {
        order.cancellationReason = cancellationReason || "Cancelled by user"
        order.cancelledBy = "user"
      }
      order.cancellationDate = new Date()
    }

    // Auto-set delivery date when status is delivered
    if (status === "delivered" && !deliveryDate) {
      order.deliveryDate = new Date()
    }

    // Update modification tracking
    if (isAdminAction) {
      order.lastModifiedBy = "admin"
    } else {
      order.lastModifiedBy = "user"
    }
    order.lastModifiedAt = new Date()

    await order.save()

    let message = "Order updated successfully"
    if (status === "cancelled") {
      message = isAdminAction ? "Order cancelled by admin successfully" : "Order cancelled successfully"
    } else if (paymentStatus) {
      message = `Payment status updated to ${paymentStatus} successfully`
    }

    res.json({
      success: true,
      message: message,
      data: order,
    })
  } catch (err) {
    console.error("Error updating order:", err)
    res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    })
  }
}

// DELETE order with validation
exports.deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id

    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Prevent deletion of delivered orders or paid orders
    if (order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete delivered orders",
      })
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete paid orders. Please refund first.",
      })
    }

    await Order.findByIdAndDelete(orderId)

    res.json({
      success: true,
      message: "Order deleted successfully",
    })
  } catch (err) {
    console.error("Error deleting order:", err)
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    })
  }
}

// GET order statistics with payment status breakdown
exports.getOrderStats = async (req, res) => {
  try {
    const { customerModel, customer } = req.query

    const matchQuery = {}
    if (customerModel) matchQuery.customerModel = customerModel
    if (customer) matchQuery.customer = customer

    const stats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          averageOrderValue: { $avg: "$total" },
          statusBreakdown: {
            $push: "$status",
          },
          paymentStatusBreakdown: {
            $push: "$paymentStatus",
          },
          paymentMethodBreakdown: {
            $push: "$paymentMethod",
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: 1,
          averageOrderValue: { $round: ["$averageOrderValue", 2] },
          statusBreakdown: 1,
          paymentStatusBreakdown: 1,
          paymentMethodBreakdown: 1,
        },
      },
    ])

    // Calculate status counts
    const statusCounts = {}
    const paymentStatusCounts = {}
    const paymentMethodCounts = {}

    if (stats.length > 0) {
      // Order status counts
      if (stats[0].statusBreakdown) {
        stats[0].statusBreakdown.forEach((status) => {
          statusCounts[status] = (statusCounts[status] || 0) + 1
        })
        delete stats[0].statusBreakdown
      }

      // Payment status counts
      if (stats[0].paymentStatusBreakdown) {
        stats[0].paymentStatusBreakdown.forEach((paymentStatus) => {
          paymentStatusCounts[paymentStatus] = (paymentStatusCounts[paymentStatus] || 0) + 1
        })
        delete stats[0].paymentStatusBreakdown
      }

      // Payment method counts
      if (stats[0].paymentMethodBreakdown) {
        stats[0].paymentMethodBreakdown.forEach((paymentMethod) => {
          paymentMethodCounts[paymentMethod] = (paymentMethodCounts[paymentMethod] || 0) + 1
        })
        delete stats[0].paymentMethodBreakdown
      }

      stats[0].statusCounts = statusCounts
      stats[0].paymentStatusCounts = paymentStatusCounts
      stats[0].paymentMethodCounts = paymentMethodCounts
    }

    res.status(200).json({
      success: true,
      message: "Order statistics fetched successfully",
      data:
        stats.length > 0
          ? stats[0]
          : {
              totalOrders: 0,
              totalRevenue: 0,
              averageOrderValue: 0,
              statusCounts: {},
              paymentStatusCounts: {},
              paymentMethodCounts: {},
            },
    })
  } catch (err) {
    console.error("Error fetching order stats:", err)
    res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    })
  }
}

module.exports = {
  createOrder: exports.createOrder,
  getOrders: exports.getOrders,
  getOrderById: exports.getOrderById,
  updateOrder: exports.updateOrder,
  deleteOrder: exports.deleteOrder,
  getOrderStats: exports.getOrderStats,
}
