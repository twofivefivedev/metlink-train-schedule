/**
 * Standardized API response utilities
 * Ensures consistent response format across all endpoints
 */

/**
 * Create a successful response
 * @param {Object} data - Response data
 * @param {Object} options - Response options
 * @returns {Object} Standardized success response
 */
function success(data, options = {}) {
    const { cached = false, cacheAge = null, timestamp = new Date().toISOString() } = options;

    return {
        success: true,
        timestamp,
        ...data,
        ...(cached && { cached, cacheAge }),
    };
}

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {Object} options - Error options
 * @returns {Object} Standardized error response
 */
function error(message, options = {}) {
    const {
        code = 'INTERNAL_ERROR',
        statusCode = 500,
        details = null,
    } = options;

    return {
        success: false,
        error: {
            code,
            message,
            ...(details && { details }),
        },
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create a validation error response
 * @param {string} message - Validation error message
 * @param {Object} details - Validation details
 * @returns {Object} Standardized validation error response
 */
function validationError(message, details = {}) {
    return error(message, {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details,
    });
}

module.exports = {
    success,
    error,
    validationError,
};

