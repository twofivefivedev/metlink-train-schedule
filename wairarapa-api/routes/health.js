/**
 * Health check routes
 * Provides health and status information
 */

const express = require('express');
const router = express.Router();
const cache = require('../middleware/cache');
const { success } = require('../utils/response');

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req, res) => {
    res.json(success({
        status: 'healthy',
        cache: cache.getInfo(),
    }));
});

module.exports = router;

