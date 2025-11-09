/**
 * Departures routes
 * Handles all departure-related API endpoints
 */

const express = require('express');
const router = express.Router();
const { STATIONS, SERVICE_IDS } = require('../config/constants');
const metlinkService = require('../services/metlinkService');
const departureService = require('../services/departureService');
const cache = require('../middleware/cache');
const { success, error: errorResponse, validationError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * GET /api/wairarapa-departures
 * Get all Wairarapa line departures (inbound and outbound)
 */
router.get('/wairarapa-departures', async (req, res, next) => {
    try {
        // Check cache first
        const cachedData = cache.get();
        if (cachedData) {
            logger.info('Returning cached data', {
                cacheAge: cache.getAge(),
            });
            return res.json(success(
                {
                    inbound: cachedData.inbound,
                    outbound: cachedData.outbound,
                    total: cachedData.total,
                },
                {
                    cached: true,
                    cacheAge: `${cache.getAge()}s`,
                }
            ));
        }

        logger.info('Cache expired or empty, fetching fresh data');

        // Fetch data from all stations
        const stationCodes = Object.values(STATIONS);
        const stationResults = await metlinkService.getMultipleStationDepartures(
            stationCodes,
            SERVICE_IDS.WAIRARAPA_LINE
        );

        // Process and organize departures
        const { inbound, outbound, total } = departureService.processDepartures(stationResults);

        logger.info('Fetched fresh departures', {
            inbound: inbound.length,
            outbound: outbound.length,
            total,
        });

        // Cache the result
        cache.set({ inbound, outbound, total });

        // Return response
        res.json(success({
            inbound,
            outbound,
            total,
        }));
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/station/:stationId
 * Get departures for a specific station
 */
router.get('/station/:stationId', async (req, res, next) => {
    try {
        const { stationId } = req.params;
        const upperStationId = stationId.toUpperCase();

        // Validate station ID
        if (!Object.values(STATIONS).includes(upperStationId)) {
            return res.status(400).json(validationError('Invalid station ID', {
                provided: stationId,
                validStations: Object.values(STATIONS),
            }));
        }

        logger.info(`Fetching departures for station: ${upperStationId}`);

        // Fetch departures for the station
        const departures = await metlinkService.getWairarapaDepartures(
            upperStationId,
            SERVICE_IDS.WAIRARAPA_LINE
        );

        res.json(success({
            station: upperStationId,
            departures,
            total: departures.length,
        }));
    } catch (err) {
        next(err);
    }
});

module.exports = router;

