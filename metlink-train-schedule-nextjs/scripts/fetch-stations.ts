/**
 * Script to fetch stations for each train line from Metlink API
 * Run with: npx tsx scripts/fetch-stations.ts
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const API_BASE = 'https://api.opendata.metlink.org.nz/v1';
const API_KEY = process.env.METLINK_API_KEY;

if (!API_KEY) {
  console.error('METLINK_API_KEY not found in environment variables');
  process.exit(1);
}

const ROUTE_IDS = {
  WRL: '4',   // Wairarapa line
  KPL: '2',   // Kapiti line
  HVL: '5',   // Hutt Valley line
  JVL: '600', // Johnsonville line
} as const;

interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat?: number;
  stop_lon?: number;
}

async function fetchStationsForRoute(routeId: string): Promise<Stop[]> {
  try {
    const response = await axios.get(`${API_BASE}/gtfs/stops`, {
      params: { route_id: routeId },
      headers: {
        'accept': 'application/json',
        'x-api-key': API_KEY,
      },
    });

    return response.data || [];
  } catch (error) {
    console.error(`Error fetching stations for route ${routeId}:`, error);
    return [];
  }
}

async function main() {
  console.log('Fetching stations for each train line...\n');

  const results: Record<string, string[]> = {};

  for (const [lineCode, routeId] of Object.entries(ROUTE_IDS)) {
    console.log(`Fetching stations for ${lineCode} (route ${routeId})...`);
    const stops = await fetchStationsForRoute(routeId);
    
    // Extract unique stop IDs
    const stopIds = [...new Set(stops.map(stop => stop.stop_id))].sort();
    results[lineCode] = stopIds;
    
    console.log(`  Found ${stopIds.length} stations:`, stopIds.join(', '));
    console.log('');
  }

  // Output the results in a format that can be copied to constants.ts
  console.log('// Stations per line (fetched from Metlink API)');
  console.log('export const LINE_STATIONS: Record<LineCode, string[]> = {');
  for (const [lineCode, stations] of Object.entries(results)) {
    console.log(`  ${lineCode}: [${stations.map(s => `'${s}'`).join(', ')}],`);
  }
  console.log('} as const;');
}

main().catch(console.error);

