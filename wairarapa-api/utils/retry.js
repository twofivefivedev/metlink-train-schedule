/**
 * Retry utility with exponential backoff
 * Handles transient failures gracefully
 */

const logger = require('./logger');
const { API_CONFIG } = require('../config/constants');

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 1000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried
 * @returns {Promise<any>} Result of the function
 */
async function retry(fn, options = {}) {
    const {
        maxAttempts = API_CONFIG.RETRY_ATTEMPTS,
        baseDelay = API_CONFIG.RETRY_DELAY,
        shouldRetry = (error) => {
            // Retry on network errors or 5xx status codes
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                return true;
            }
            if (error.response && error.response.status >= 500) {
                return true;
            }
            return false;
        },
    } = options;

    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry if we've exhausted attempts or error shouldn't be retried
            if (attempt === maxAttempts || !shouldRetry(error)) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
                error: error.message,
                attempt,
            });

            await sleep(delay);
        }
    }

    throw lastError;
}

module.exports = { retry, sleep };

