/**
 * Express application entry point
 * Sets up middleware, routes, and error handling
 */

const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const departuresRoutes = require('./routes/departures');
const healthRoutes = require('./routes/health');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});

// Routes
app.use('/api', departuresRoutes);
app.use('/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Wairarapa Train Schedule API',
        version: '2.0.0',
        endpoints: {
            '/api/wairarapa-departures': 'Get all Wairarapa line departures (inbound/outbound)',
            '/api/station/:stationId': 'Get departures for specific station (WELL, PETO, FEAT)',
            '/health': 'Health check',
        },
    });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Export the Express app for Vercel
module.exports = app;

// Start server (only when not in Vercel environment)
if (require.main === module) {
    const PORT = config.port;
    app.listen(PORT, () => {
        logger.info(`Wairarapa Train API running on port ${PORT}`, {
            nodeEnv: config.nodeEnv,
            port: PORT,
        });
        logger.info('Endpoints:', {
            'GET /api/wairarapa-departures': 'All Wairarapa departures',
            'GET /api/station/:stationId': 'Station-specific departures',
            'GET /health': 'Health check',
        });
    });
}
