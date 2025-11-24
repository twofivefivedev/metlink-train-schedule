/**
 * Service Incidents Ingestion Script
 * Can be run as a cron job to collect service incidents (cancellations, delays, bus replacements)
 * 
 * Note: Incidents are automatically recorded when departures are fetched via the API.
 * This script can be used for manual data collection or scheduled runs.
 * 
 * Usage:
 *   npm run ingest-historical
 *   or
 *   node scripts/ingest-historical.ts
 * 
 * For Vercel Cron:
 *   Add to vercel.json:
 *   {
 *     "crons": [{
 *       "path": "/api/cron/ingest-historical",
 *       "schedule": "every 5 minutes"
 *     }]
 *   }
 */

import { getMultipleStationDepartures } from '../lib/server/metlinkService';
import { recordServiceIncidents } from '../lib/server/incidentsService';
import { SERVICE_IDS, LINE_STATIONS } from '../lib/constants';
import { logger } from '../lib/server/logger';

async function ingestHistoricalData() {
  try {
    logger.info('Starting service incidents ingestion');

    // Ingest data for all lines
    const lines = Object.keys(SERVICE_IDS) as Array<keyof typeof SERVICE_IDS>;
    
    for (const lineKey of lines) {
      const serviceId = SERVICE_IDS[lineKey];
      const stations = LINE_STATIONS[serviceId as keyof typeof LINE_STATIONS] || [];
      
      if (stations.length === 0) {
        logger.warn(`No stations found for line ${serviceId}`);
        continue;
      }

      try {
        logger.info(`Ingesting incidents for ${serviceId}`, { stationCount: stations.length });
        
        const stationResults = await getMultipleStationDepartures(stations, serviceId);
        const allDepartures = stationResults.flat();
        
        // Record service incidents (only cancellations, delays >= 5min, bus replacements)
        await recordServiceIncidents(allDepartures, stations.join(','));
        
        logger.info(`Processed ${allDepartures.length} departures for ${serviceId}`);
      } catch (error) {
        logger.error(`Failed to ingest incidents for ${serviceId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Service incidents ingestion completed');
  } catch (error) {
    logger.error('Service incidents ingestion failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  ingestHistoricalData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Unhandled error in ingestion script', error);
      process.exit(1);
    });
}

export { ingestHistoricalData };

