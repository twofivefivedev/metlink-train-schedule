/**
 * Configuration management with validation
 * Ensures all required environment variables are present
 */

require('dotenv').config();

const { CACHE_DURATION, API_CONFIG } = require('./constants');

/**
 * Validates that required environment variables are present
 * @throws {Error} If required variables are missing
 */
function validateConfig() {
    const required = ['METLINK_API_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
            'Please set METLINK_API_KEY in your .env file or environment.'
        );
    }
}

/**
 * Get cache duration from environment or use default
 * @returns {number} Cache duration in milliseconds
 */
function getCacheDuration() {
    const envDuration = process.env.CACHE_DURATION_MINUTES;
    if (envDuration) {
        const minutes = parseInt(envDuration, 10);
        if (isNaN(minutes) || minutes < 0.5 || minutes > 5) {
            console.warn(
                `Invalid CACHE_DURATION_MINUTES (${envDuration}), using default: ${CACHE_DURATION.DEFAULT / 1000 / 60} minutes`
            );
            return CACHE_DURATION.DEFAULT;
        }
        return minutes * 60 * 1000;
    }
    return CACHE_DURATION.DEFAULT;
}

/**
 * Get API timeout from environment or use default
 * @returns {number} Timeout in milliseconds
 */
function getApiTimeout() {
    const envTimeout = process.env.API_TIMEOUT_SECONDS;
    if (envTimeout) {
        const seconds = parseInt(envTimeout, 10);
        if (isNaN(seconds) || seconds < 1 || seconds > 30) {
            console.warn(
                `Invalid API_TIMEOUT_SECONDS (${envTimeout}), using default: ${API_CONFIG.TIMEOUT / 1000} seconds`
            );
            return API_CONFIG.TIMEOUT;
        }
        return seconds * 1000;
    }
    return API_CONFIG.TIMEOUT;
}

// Validate configuration on module load
validateConfig();

const config = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    metlinkApiKey: process.env.METLINK_API_KEY,
    cacheDuration: getCacheDuration(),
    apiTimeout: getApiTimeout(),
    logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = config;

