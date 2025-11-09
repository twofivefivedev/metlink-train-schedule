/**
 * Structured logging utility
 * Provides consistent logging format across the application
 */

const config = require('../config');

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

const LOG_LEVEL_NAMES = {
    0: 'ERROR',
    1: 'WARN',
    2: 'INFO',
    3: 'DEBUG',
};

const currentLogLevel = LOG_LEVELS[config.logLevel.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @returns {string} Formatted log message
 */
function formatLog(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[LOG_LEVELS[level]] || level;
    const metaStr = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${levelName}] ${message}${metaStr}`;
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Error|Object} error - Error object or metadata
 */
function error(message, error = {}) {
    if (LOG_LEVELS.ERROR <= currentLogLevel) {
        const metadata = error instanceof Error
            ? { message: error.message, stack: error.stack, name: error.name }
            : error;
        console.error(formatLog('ERROR', message, metadata));
    }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} metadata - Additional metadata
 */
function warn(message, metadata = {}) {
    if (LOG_LEVELS.WARN <= currentLogLevel) {
        console.warn(formatLog('WARN', message, metadata));
    }
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} metadata - Additional metadata
 */
function info(message, metadata = {}) {
    if (LOG_LEVELS.INFO <= currentLogLevel) {
        console.log(formatLog('INFO', message, metadata));
    }
}

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {Object} metadata - Additional metadata
 */
function debug(message, metadata = {}) {
    if (LOG_LEVELS.DEBUG <= currentLogLevel) {
        console.log(formatLog('DEBUG', message, metadata));
    }
}

module.exports = {
    error,
    warn,
    info,
    debug,
    LOG_LEVELS,
};

