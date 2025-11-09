/**
 * Application constants
 * Centralized location for all magic strings and configuration values
 */

// Note: METLINK_API_BASE is now configured via environment variables
// See lib/config/env.ts for configuration

// Service IDs - Wellington Train Lines
export const SERVICE_IDS = {
  WAIRARAPA_LINE: 'WRL',
  KAPITI_LINE: 'KPL',
  HUTT_VALLEY_LINE: 'HVL',
  JOHNSONVILLE_LINE: 'JVL',
} as const;

// Line Names (for display)
export const LINE_NAMES: Record<string, string> = {
  WRL: 'Wairarapa Line',
  KPL: 'Kapiti Line',
  HVL: 'Hutt Valley Line',
  JVL: 'Johnsonville Line',
} as const;

// Line Codes (for API) - using the service ID values
export type LineCode = typeof SERVICE_IDS[keyof typeof SERVICE_IDS];

// Station Codes - All Stations
export const STATIONS = {
  WELLINGTON: 'WELL',
  PETONE: 'PETO',
  FEATHERSTON: 'FEAT',
  MASTERTON: 'MAST',
  CARTERTON: 'CART',
  WOODSIDE: 'WOOD',
  UPPER_HUTT: 'UPPE',
  LOWER_HUTT: 'LOWE',
  WAIRARAPA: 'WAIR',
  MAYMOOR: 'MAYM',
  KAPITI: 'KAPT',
  PARAPARAUMU: 'PARA',
  PORIRUA: 'PORI',
  TITAHI_BAY: 'TITB',
  MANA: 'MANA',
  PLIMMERTON: 'PLIM',
  PAEKAKARIKI: 'PAEK',
  MURCHISON: 'MURC',
  WAINUIOMATA: 'WAIN',
  EASTBOURNE: 'EAST',
  DAYS_BAY: 'DAYS',
  SEAVIEW: 'SEAV',
  JOHNSONVILLE: 'JOHN',
  KARORI: 'KARO',
  NGAIO: 'NGAI',
  CROFTON_DOWNS: 'CROF',
  KAIWHARAWHARA: 'KAWH',
  BOX_HILL: 'BOXH',
  SIMLA_CRESCENT: 'SIML',
  AOTEA: 'AOTE',
  REDWOOD: 'REDW',
  TAKAPU_ROAD: 'TAKA',
  LINDEN: 'LIND',
  TITAHI_BAY_NORTH: 'TITN',
} as const;

/**
 * Normalize station ID by removing platform numbers
 * e.g., PETO1 -> PETO, WELL1 -> WELL
 */
export function normalizeStationId(stationId: string): string {
  // Remove trailing digits (platform numbers)
  return stationId.replace(/\d+$/, '').toUpperCase();
}

/**
 * Get platform variants for a normalized station ID
 * Returns an array of possible platform IDs to try when calling the Metlink API
 * e.g., PETO -> ['PETO', 'PETO1', 'PETO2'], WELL -> ['WELL', 'WELL1', 'WELL2']
 */
export function getStationPlatformVariants(normalizedId: string): string[] {
  const upperId = normalizedId.toUpperCase();
  // Common stations with multiple platforms
  const multiPlatformStations: Record<string, number> = {
    PETO: 2,
    WELL: 2,
    WATE: 2,
    MANA: 2,
    PAEK: 2,
    PARA: 2,
    PLIM: 3,
    PORI: 2,
    REDW: 2,
    TAKA: 2,
    TAWA: 2,
    TAIT: 2,
    TREN: 2,
    WALL: 2,
    WOBU: 2,
  };

  const platformCount = multiPlatformStations[upperId];
  if (platformCount) {
    // Return normalized ID first, then platform variants
    return [upperId, ...Array.from({ length: platformCount }, (_, i) => `${upperId}${i + 1}`)];
  }

  // Single platform or unknown - return normalized ID
  return [upperId];
}

// Station Names (for display) - normalized station IDs (no platform numbers)
export const STATION_NAMES: Record<string, string> = {
  // Wairarapa Line
  CART: 'Carterton Station',
  FEAT: 'Featherston Station',
  MAST: 'Masterton Station',
  MATA: 'Matarawa Station',
  MAYM: 'Maymorn Station',
  PETO: 'Petone Station',
  RENA: 'Renall Street Station',
  SOLW: 'Solway Station',
  UPPE: 'Upper Hutt Station',
  WATE: 'Waterloo Station',
  WELL: 'Wellington Station',
  WOOD: 'Woodside Station',
  // Kapiti Line
  KENE: 'Kenepuru Station',
  LIND: 'Linden Station',
  MANA: 'Mana Station',
  PAEK: 'Paekākāriki Station',
  PARA: 'Paraparaumu Station',
  PARE: 'Paremata Station',
  PLIM: 'Plimmerton Station',
  PORI: 'Porirua Station',
  PUKE: 'Pukerua Bay Station',
  REDW: 'Redwood Station',
  TAKA: 'Takapu Road Station',
  TAWA: 'Tawa Station',
  WAIK: 'Waikanae Station',
  // Hutt Valley Line
  AVA: 'Ava Station',
  EPUN: 'Epuni Station',
  HERE: 'Heretaunga Station',
  MANO: 'Manor Park Station',
  NAEN: 'Naenae Station',
  NGAU: 'Ngauranga Station',
  POMA: 'Pomare Station',
  SILV: 'Silverstream Station',
  TAIT: 'Taita Station',
  TREN: 'Trentham Station',
  WALL: 'Wallaceville Station',
  WING: 'Wingate Station',
  WOBU: 'Woburn Station',
  // Johnsonville Line (includes bus stops)
  '2001': 'Porirua Station - Stop A',
  '2002': 'Porirua Station - Stop B',
  '2005': 'North City Plaza - Walton Leigh Avenue',
  '2006': 'Lyttelton Avenue at Ferry Place',
  '2008': 'Lyttelton Avenue at Kilkerran Place',
  '2011': 'Lyttelton Avenue at Walton Leigh Avenue',
  '2012': 'Norrie Street - Te Rauparaha Park',
  '2016': 'Wi Neera Drive opposite Pirates Cove',
  '2022': 'Porirua - Parumoana Street',
  '2026': 'Norrie Street opposite Te Rauparaha Park',
  '2028': 'Lyttelton Avenue - at Parumoana Street',
  '2030': 'Lyttelton Avenue (opposite New World)',
  '2871': 'Whitireia Polytechnic - Titahi Bay Road',
  '2873': 'Titahi Bay Road at Semple Street',
  '3000': 'Johnsonville - Stop A',
  '3081': 'Johnsonville - Stop B',
  '3200': 'Middleton Road (near 25)',
  '3202': 'Middleton Road (near 59)',
  '3204': 'Middleton Road (near 71)',
  '3206': 'Middleton Road at Churton Drive',
  '3208': 'Middleton Road opposite Wingfield Place',
  '3900': 'Middleton Road at Glenside Road',
  '3902': 'Middleton Road (near 279)',
  '3903': 'Middleton Road (near 375)',
  '3904': 'Middleton Road (near 409)',
  '3906': 'Middleton Road at Richmond Hill Road',
  '3908': 'Willowbank Road (near 10)',
  '3910': 'Main Road Tawa at Sunrise Boulevard',
  '3911': 'Main Road Tawa at St Francis Xavier School',
  '3912': 'Main Road Tawa at Redwood Avenue',
  '3914': 'Main Road Tawa at Elena Place',
  '3916': 'Tawa Mall - Main Road (near 215)',
  '3918': 'Main Road Tawa (near 249)',
  '3920': 'Main Road Tawa opposite McLellan Street',
  '3922': 'Main Road Tawa (near 337)',
  '3923': 'Karearea Avenue opposite 51',
  '3924': 'Karearea Avenue (near 51)',
  '3926': 'SDA School - Raiha Street',
  '3927': 'Hinau Street (near 3) (school stop)',
  '3928': 'Kenepuru Hospital - Ambulance Drive',
  '3929': 'SDA School - Raiha Street (opposite)',
  '3933': 'Karearea Avenue opposite 5',
  '3934': 'Karearea Avenue (near 1)',
  '3948': 'Kenepuru Drive opposite Rembrandt Avenue',
  '3950': 'Main Road Tawa (near 330)',
  '3952': 'Main Road Tawa at McLellan Street',
  '3954': 'Main Road Tawa (near 290)',
  '3956': 'Tawa Mall - Main Road (near 206)',
  '3958': 'Main Road Tawa opposite Elena Place',
  '3960': 'Main Road Tawa opposite Redwood Avenue',
  '3961': 'Main Road Tawa opposite St Francis Xavier School',
  '3962': 'Main Road Tawa opposite Sunrise Boulevard',
  '3964': 'Willowbank Road (near 21)',
  '3966': 'Middleton Road opposite Richmond Hill Road',
  '3968': 'Middleton Road (opposite 395)',
  '3969': 'Middleton Road (opposite 375)',
  '3970': 'Middleton Road at Westchester Drive',
  '3972': 'Middleton Road opposite Glenside Road',
  '3974': 'Middleton Road at Wingfield Place',
  '3976': 'Middleton Road at Churton Drive (near 122)',
  '3978': 'Middleton Road (near 76)',
  '3980': 'Middleton Road (near 48)',
  '3982': 'Middleton Road (near 18)',
  // Legacy/backward compatibility
  LOWE: 'Lower Hutt',
} as const;

// Stations per line - ordered from origin to destination, deduplicated (no platform numbers)
// Wairarapa Line: Masterton → Wellington
// Kapiti Line: Waikanae → Wellington  
// Hutt Valley Line: Upper Hutt → Wellington
export const LINE_STATIONS: Record<LineCode, string[]> = {
  // Wairarapa Line: Masterton → Renall Street → Solway → Carterton → Matarawa → Woodside → Featherston → Maymorn → Upper Hutt → Waterloo → Petone → Wellington
  WRL: ['MAST', 'RENA', 'SOLW', 'CART', 'MATA', 'WOOD', 'FEAT', 'MAYM', 'UPPE', 'WATE', 'PETO', 'WELL'],
  // Kapiti Line: Waikanae → Paekākāriki → Pukerua Bay → Plimmerton → Mana → Paremata → Porirua → Takapu Road → Redwood → Tawa → Linden → Kenepuru → Wellington
  KPL: ['WAIK', 'PAEK', 'PUKE', 'PLIM', 'MANA', 'PARE', 'PORI', 'TAKA', 'REDW', 'TAWA', 'LIND', 'KENE', 'WELL'],
  // Hutt Valley Line: Upper Hutt → Trentham → Wallaceville → Silverstream → Heretaunga → Ava → Manor Park → Wingate → Naenae → Epuni → Pomare → Taita → Woburn → Waterloo → Petone → Ngauranga → Wellington
  HVL: ['UPPE', 'TREN', 'WALL', 'SILV', 'HERE', 'AVA', 'MANO', 'WING', 'NAEN', 'EPUN', 'POMA', 'TAIT', 'WOBU', 'WATE', 'PETO', 'NGAU', 'WELL'],
  // Johnsonville Line: Bus route stops (keeping numeric IDs as they are bus stops)
  JVL: ['2001', '2002', '2005', '2006', '2008', '2011', '2012', '2016', '2022', '2026', '2028', '2030', '2871', '2873', '3000', '3081', '3200', '3202', '3204', '3206', '3208', '3900', '3902', '3903', '3904', '3906', '3908', '3910', '3911', '3912', '3914', '3916', '3918', '3920', '3922', '3923', '3924', '3926', '3927', '3928', '3929', '3933', '3934', '3948', '3950', '3952', '3954', '3956', '3958', '3960', '3961', '3962', '3964', '3966', '3968', '3969', '3970', '3972', '3974', '3976', '3978', '3980', '3982'],
} as const;

// Default stations to fetch (all stations for selected line)
export const getDefaultStationsForLine = (line: LineCode): string[] => {
  return LINE_STATIONS[line] || LINE_STATIONS.WRL;
};

// Default line to display
export const DEFAULT_LINE: LineCode = 'WRL';

/**
 * Get service ID from line code with validation
 * @param lineCode - The line code (WRL, KPL, HVL, JVL)
 * @returns The validated service ID, or WRL as default
 */
export function getServiceIdFromLineCode(lineCode: string): LineCode {
  const validLineCodes = Object.values(SERVICE_IDS) as LineCode[];
  return validLineCodes.includes(lineCode as LineCode) 
    ? (lineCode as LineCode) 
    : SERVICE_IDS.WAIRARAPA_LINE;
}

// Cache Configuration
export const CACHE_DURATION = {
  DEFAULT: 1 * 60 * 1000, // 1 minute in milliseconds
  MIN: 30 * 1000, // 30 seconds minimum
  MAX: 5 * 60 * 1000, // 5 minutes maximum
} as const;

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second base delay
} as const;

// Direction Constants
export const DIRECTIONS = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;

// Wellington Station Identifiers (normalized, no platform numbers)
export const WELLINGTON_STOPS = ['WELL'] as const;

// Refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  DEFAULT: 2 * 60 * 1000, // 2 minutes
  FAST: 30 * 1000, // 30 seconds
  SLOW: 5 * 60 * 1000, // 5 minutes
} as const;

// Maximum number of departures to display
export const MAX_DEPARTURES = 10;

// Status colors mapping
export const STATUS_COLORS = {
  green: 'success',
  yellow: 'warning',
  red: 'destructive',
  gray: 'secondary',
} as const;

