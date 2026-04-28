const express = require('express');
const controller = require('../controllers/system.controller');

const router = express.Router();

router.get('/healthz', controller.health);
router.get('/readyz', controller.ready);
router.get('/metrics', controller.metrics);

module.exports = router;
