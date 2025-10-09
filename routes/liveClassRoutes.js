const express = require('express');
const LiveClassController = require('../controllers/LiveClassController');
const router = express.Router();

// Live Class Routes
router.post("/live-classes", LiveClassController.createLiveClass);
router.get("/live-classes", LiveClassController.getAllLiveClasses);
router.get("/live-classes/:id", LiveClassController.getLiveClassById);
router.put("/live-classes/:id", LiveClassController.updateLiveClass);
router.delete("/live-classes/:id", LiveClassController.deleteLiveClass);
router.get("/live-classes/user/:userId", LiveClassController.getLiveClassesByUser);
router.get('/live-classes/teacher/:teacherId', LiveClassController.getLiveClassesByTeacher);

module.exports = router;