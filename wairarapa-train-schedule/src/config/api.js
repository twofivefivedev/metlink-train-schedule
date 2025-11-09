/**
 * API configuration
 * Centralized API endpoint configuration
 */

const API_CONFIG = {
  // Backend API base URL
  BASE_URL: process.env.REACT_APP_API_URL || (
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : 'https://wairarapa-train-schedule-puvxgxusd.vercel.app'
  ),
  
  // Endpoints
  ENDPOINTS: {
    WAIRARAPA_DEPARTURES: '/api/wairarapa-departures',
    STATION: (stationId) => `/api/station/${stationId}`,
    HEALTH: '/health',
  },
  
  // Request configuration
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

/**
 * Get full API URL for an endpoint
 * @param {string} endpoint - API endpoint path
 * @returns {string} Full API URL
 */
export function getApiUrl(endpoint) {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Export API_CONFIG as both named and default export
export { API_CONFIG };
export default API_CONFIG;

