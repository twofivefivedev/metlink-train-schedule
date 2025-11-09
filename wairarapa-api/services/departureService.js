/**
 * Departure data processing service
 * Handles business logic for processing and organizing departure data
 */

const { DIRECTIONS, WELLINGTON_STOPS } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Check if a destination is Wellington
 * @param {Object} departure - Departure object
 * @returns {boolean} True if destination is Wellington
 */
function isWellingtonDestination(departure) {
    const destination = departure.destination?.stop_id || '';
    return WELLINGTON_STOPS.some(stop => destination.includes(stop));
}

/**
 * Separate departures into inbound and outbound
 * @param {Array} departures - Array of departure objects
 * @returns {Object} Object with inbound and outbound arrays
 */
function separateByDirection(departures) {
    const inbound = departures.filter(dep => isWellingtonDestination(dep));
    const outbound = departures.filter(dep => !isWellingtonDestination(dep));

    logger.debug('Separated departures by direction', {
        total: departures.length,
        inbound: inbound.length,
        outbound: outbound.length,
    });

    return { inbound, outbound };
}

/**
 * Sort departures by departure time
 * @param {Array} departures - Array of departure objects
 * @returns {Array} Sorted departures
 */
function sortByDepartureTime(departures) {
    return [...departures].sort((a, b) => {
        const timeA = new Date(a.departure?.expected || a.departure?.aimed || 0);
        const timeB = new Date(b.departure?.expected || b.departure?.aimed || 0);
        return timeA - timeB;
    });
}

/**
 * Process and organize departures from multiple stations
 * @param {Array<Array>} stationResults - Array of departure arrays from each station
 * @returns {Object} Processed departures separated by direction
 */
function processDepartures(stationResults) {
    // Flatten all station results
    const allDepartures = stationResults.flat();

    // Sort by departure time
    const sorted = sortByDepartureTime(allDepartures);

    // Separate by direction
    const { inbound, outbound } = separateByDirection(sorted);

    return {
        inbound,
        outbound,
        total: allDepartures.length,
    };
}

module.exports = {
    isWellingtonDestination,
    separateByDirection,
    sortByDepartureTime,
    processDepartures,
};

