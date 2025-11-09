/**
 * In-memory cache middleware
 * Provides caching functionality for API responses
 */

const config = require('../config');
const logger = require('../utils/logger');

class Cache {
    constructor() {
        this.data = null;
        this.timestamp = null;
        this.duration = config.cacheDuration;
    }

    /**
     * Check if cache is valid
     * @returns {boolean} True if cache is valid
     */
    isValid() {
        if (!this.data || !this.timestamp) {
            return false;
        }
        const age = Date.now() - this.timestamp;
        return age < this.duration;
    }

    /**
     * Get cached data
     * @returns {Object|null} Cached data or null
     */
    get() {
        if (!this.isValid()) {
            return null;
        }
        return this.data;
    }

    /**
     * Set cache data
     * @param {Object} data - Data to cache
     */
    set(data) {
        this.data = data;
        this.timestamp = Date.now();
        logger.debug('Cache updated', {
            duration: this.duration / 1000,
            timestamp: new Date(this.timestamp).toISOString(),
        });
    }

    /**
     * Clear cache
     */
    clear() {
        this.data = null;
        this.timestamp = null;
        logger.debug('Cache cleared');
    }

    /**
     * Get cache age in seconds
     * @returns {number|null} Cache age in seconds or null
     */
    getAge() {
        if (!this.timestamp) {
            return null;
        }
        return Math.round((Date.now() - this.timestamp) / 1000);
    }

    /**
     * Get cache info for health check
     * @returns {Object} Cache information
     */
    getInfo() {
        return {
            hasData: !!this.data,
            isValid: this.isValid(),
            ageSeconds: this.getAge(),
            durationSeconds: this.duration / 1000,
        };
    }
}

// Singleton instance
const cache = new Cache();

module.exports = cache;

