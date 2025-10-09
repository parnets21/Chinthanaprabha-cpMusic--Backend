const express = require("express");
const contactController = require('../controllers/contactController.js');

const router = express.Router();

router.post('/', contactController.createContact);
router.get('/', contactController.getContacts);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
