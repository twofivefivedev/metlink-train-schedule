/**
 * Metlink API service
 * Handles all interactions with the Metlink Open Data API
 */

const axios = require('axios');
const config = require('../config');
const { METLINK_API_BASE } = require('../config/constants');
const { retry } = require('../utils/retry');
const logger = require('../utils/logger');

/**
 * Create axios instance with default configuration
 */
const metlinkClient = axios.create({
    baseURL: METLINK_API_BASE,
    headers: {
        'x-api-key': config.metlinkApiKey,
        'Content-Type': 'application/json',
    },
    timeout: config.apiTimeout,
});

/**
 * Get stop predictions for a specific station
 * @param {string} stopId - Station stop ID
 * @returns {Promise<Object>} API response with departures
 */
async function getStopPredictions(stopId) {
    try {
        const response = await retry(
            () => metlinkClient.get(`/stop-predictions?stop_id=${stopId}`),
            {
                shouldRetry: (error) => {
                    // Retry on network errors or 5xx, but not on 4xx (client errors)
                    if (error.response && error.response.status < 500) {
                        return false;
                    }
                    return true;
                },
            }
        );

        return response.data;
    } catch (error) {
        logger.error(`Failed to fetch stop predictions for ${stopId}`, error);
        throw error;
    }
}

/**
 * Get Wairarapa line departures for a specific station
 * @param {string} stopId - Station stop ID
 * @param {string} serviceId - Service ID to filter (default: WRL)
 * @returns {Promise<Array>} Filtered departures
 */
async function getWairarapaDepartures(stopId, serviceId = 'WRL') {
    try {
        const data = await getStopPredictions(stopId);
        const departures = data.departures || [];

        const filtered = departures.filter(
            departure => departure.service_id === serviceId
        );

        logger.debug(`Fetched ${filtered.length} WRL departures for ${stopId}`, {
            total: departures.length,
            filtered: filtered.length,
        });

        return filtered;
    } catch (error) {
        logger.error(`Failed to fetch Wairarapa departures for ${stopId}`, error);
        throw error;
    }
}

/**
 * Get departures for multiple stations in parallel
 * @param {Array<string>} stopIds - Array of station stop IDs
 * @param {string} serviceId - Service ID to filter
 * @returns {Promise<Array>} Array of departure arrays, one per station
 */
async function getMultipleStationDepartures(stopIds, serviceId = 'WRL') {
    const promises = stopIds.map(async (stopId) => {
        try {
            const departures = await getWairarapaDepartures(stopId, serviceId);
            return departures.map(departure => ({
                ...departure,
                station: stopId,
            }));
        } catch (error) {
            logger.warn(`Failed to fetch departures for station ${stopId}`, {
                error: error.message,
            });
            return []; // Return empty array on error for this station
        }
    });

    return Promise.all(promises);
}

module.exports = {
    getStopPredictions,
    getWairarapaDepartures,
    getMultipleStationDepartures,
};

