const express = require("express");
const router = express.Router();
const instrumentController = require("../controllers/instrumentController");
//const { instrumentUpload } = require("../middleware/multer");


const multer = require("multer");

const instrumentUpload = multer({})

// Routes
router.post("/", instrumentUpload.single("image"), instrumentController.createInstrument);
router.get("/", instrumentController.getInstruments);
router.get("/:id", instrumentController.getInstrumentById);
router.put("/:id", instrumentUpload.single("image"), instrumentController.updateInstrument);
router.delete("/:id", instrumentController.deleteInstrument);

module.exports = router;
