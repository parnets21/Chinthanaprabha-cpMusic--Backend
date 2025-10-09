// const express = require("express");
// const router = express.Router();
// const orderController = require("../controllers/OrderController");

// // Create order
// router.post("/", orderController.createOrder);

// // Get all orders
// router.get("/", orderController.getOrders);

// // Get order statistics
// router.get("/stats/overview", orderController.getOrderStats);

// // Get order by ID
// router.get("/:id", orderController.getOrderById);

// // Update order (status)
// router.put("/:id", orderController.updateOrder);

// // Delete order
// router.delete("/:id", orderController.deleteOrder);

// module.exports = router;


/* const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');

// CREATE Order
router.post('/', orderController.createOrder);

// GET all orders
router.get('/', orderController.getOrders);

// GET order by ID
router.get('/:id', orderController.getOrderById);

// UPDATE order
router.put('/:id', orderController.updateOrder);

// DELETE order
router.delete('/:id', orderController.deleteOrder);

module.exports = router; */


const express = require("express")
const router = express.Router()
const orderController = require("../controllers/OrderController")

// CREATE Order
router.post("/", orderController.createOrder)

// GET all orders (with filtering and pagination)
router.get("/", orderController.getOrders)

// GET order statistics
router.get("/stats/overview", orderController.getOrderStats)

// GET order by ID
router.get("/:id", orderController.getOrderById)

// UPDATE order (status, tracking, cancellation, payment status, etc.)
router.put("/:id", orderController.updateOrder)

// DELETE order
router.delete("/:id", orderController.deleteOrder)

module.exports = router
