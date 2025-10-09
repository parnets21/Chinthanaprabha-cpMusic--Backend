const express = require('express');
const multer = require('multer');
const path = require('path');
const PerformerOfTheWeekController = require('../controllers/PerformerOfTheWeekController');

// Set up file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profile');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));  // Add timestamp to the image filename
    }
});

const upload = multer();

const router = express.Router();

// Routes for Performer of the Week
/* router.post('/add', upload.single('image'), PerformerOfTheWeekController.addPerformer);
router.get('/', PerformerOfTheWeekController.getAllPerformers); */


router.post("/performers", upload.single("image"), PerformerOfTheWeekController.createPerformer); // Create a performer
router.get("/performers", PerformerOfTheWeekController.getAllPerformers); // Get all performers (Top 10)
router.get("/performers/:id", PerformerOfTheWeekController.getPerformerById); // Get a performer by ID
router.put("/performers/:id", upload.single("image"), PerformerOfTheWeekController.updatePerformer); // Update a performer
router.delete("/performers/:id", PerformerOfTheWeekController.deletePerformer); // Delete a performer

module.exports = router;
