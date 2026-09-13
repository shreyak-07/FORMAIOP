const express = require('express');
const router = express.Router();
const { extractFormData } = require('../controllers/aiController');

router.post('/extract', extractFormData);

module.exports = router;