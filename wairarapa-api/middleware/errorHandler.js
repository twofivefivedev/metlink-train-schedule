/**
 * Error handling middleware
 * Provides consistent error handling across the application
 */

const logger = require('../utils/logger');
const { error: errorResponse } = require('../utils/response');

/**
 * Express error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
    logger.error('Request error', {
        path: req.path,
        method: req.method,
        error: err.message,
        stack: err.stack,
    });

    // Determine status code
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (err.response) {
        // Axios error (API call failed)
        statusCode = err.response.status || 500;
        errorCode = 'EXTERNAL_API_ERROR';
        message = `Failed to fetch data from external API: ${err.message}`;
    } else if (err.statusCode) {
        // Custom error with status code
        statusCode = err.statusCode;
        errorCode = err.code || 'ERROR';
        message = err.message;
    } else if (err.message) {
        // Generic error
        message = err.message;
    }

    res.status(statusCode).json(errorResponse(message, {
        code: errorCode,
        statusCode,
    }));
}

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
    res.status(404).json(errorResponse('Route not found', {
        code: 'NOT_FOUND',
        statusCode: 404,
        details: {
            path: req.path,
            method: req.method,
        },
    }));
}

module.exports = {
    errorHandler,
    notFoundHandler,
};

