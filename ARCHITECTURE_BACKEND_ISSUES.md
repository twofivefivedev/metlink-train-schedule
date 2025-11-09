# Backend Architecture Issues & Improvements

## Overview
Analysis of `wairarapa-api/server.js` identifying architectural risks, reliability concerns, and security gaps.

## Critical Issues

### 1. Security Vulnerabilities

#### Hardcoded API Key Fallback
**Location:** Line 15
```javascript
const METLINK_API_KEY = process.env.METLINK_API_KEY || 'RXKYdArdVE1OFNgSAUYVE6LnOK5hiYMQ49gpwzOI';
```

**Problem:**
- API key is hardcoded as a fallback, exposing credentials in source code
- This key is committed to version control, making it publicly accessible
- Violates security best practices for credential management

**Impact:** High - Credential exposure, potential API abuse, cost implications

**Recommendation:**
- Remove hardcoded fallback entirely
- Fail fast if API key is missing: `const METLINK_API_KEY = process.env.METLINK_API_KEY; if (!METLINK_API_KEY) throw new Error('METLINK_API_KEY is required');`
- Add validation on startup

#### API Key Exposure in Health Check
**Location:** Line 186
```javascript
apiKey: METLINK_API_KEY ? 'configured' : 'missing',
```

**Problem:**
- While not exposing the actual key, this endpoint could leak configuration state
- Health check endpoint should be minimal and not expose internal configuration details

**Recommendation:**
- Remove API key status from health check response
- Keep health check focused on service availability only

### 2. Error Handling & Reliability

#### Incomplete Error Handling
**Location:** Lines 85-88, 130-137

**Problems:**
- Individual station failures return empty arrays but don't surface errors to client
- No retry logic for transient API failures
- No circuit breaker pattern for repeated failures
- Errors are logged but not tracked/monitored

**Impact:** Medium - Silent failures, degraded user experience without visibility

**Recommendations:**
- Implement retry logic with exponential backoff for transient failures
- Add error tracking (e.g., Sentry, logging service)
- Consider circuit breaker pattern to prevent cascading failures
- Return partial results with error metadata when some stations fail

#### No Request Validation
**Location:** Line 141-151

**Problem:**
- Station ID validation is basic (only checks against hardcoded list)
- No input sanitization
- No rate limiting on endpoints

**Recommendations:**
- Add input validation middleware (e.g., express-validator)
- Implement rate limiting (e.g., express-rate-limit)
- Add request logging for monitoring

### 3. Caching Architecture

#### In-Memory Cache Limitations
**Location:** Lines 38-48

**Problems:**
- Cache is stored in memory, lost on server restart
- No cache invalidation strategy beyond TTL
- Cache is shared across all requests (potential race conditions)
- No cache warming strategy
- Cache doesn't persist across deployments (Vercel serverless)

**Impact:** Medium - Inefficient for serverless environments, potential stale data

**Recommendations:**
- For serverless: Consider Redis or Vercel KV for distributed caching
- For traditional servers: Keep in-memory but add cache warming
- Implement cache versioning for schema changes
- Add cache hit/miss metrics

#### Cache Duration Hardcoded
**Location:** Line 38
```javascript
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute
```

**Problem:**
- Cache duration is hardcoded, not configurable
- No differentiation between peak/off-peak hours
- Comment suggests it was "reduced for better real-time accuracy" but this is arbitrary

**Recommendations:**
- Make cache duration configurable via environment variable
- Consider adaptive caching based on time of day or API response times
- Document rationale for cache duration choice

### 4. Code Organization & Maintainability

#### Monolithic Server File
**Location:** Entire `server.js` file

**Problems:**
- All logic in single file (222 lines)
- No separation of concerns (routes, services, middleware)
- Difficult to test individual components
- Hard to scale or add features

**Recommendations:**
- Split into modules:
  - `routes/` - API route handlers
  - `services/metlinkService.js` - API client and data fetching
  - `middleware/` - Caching, error handling, validation
  - `utils/` - Helper functions
  - `config/` - Configuration management

#### Hardcoded Station Mapping
**Location:** Lines 31-35

**Problem:**
- Station codes are hardcoded in server code
- Adding new stations requires code changes
- No validation against actual Metlink station list

**Recommendations:**
- Move to configuration file or environment variables
- Consider fetching station list from Metlink API
- Add station metadata (names, coordinates, etc.)

#### Magic Strings Throughout
**Location:** Multiple locations (e.g., 'WELL', 'WRL', 'PT0S')

**Problem:**
- Magic strings scattered throughout code
- Easy to introduce typos
- No single source of truth

**Recommendations:**
- Create constants file for all API-related strings
- Use enums or constants for service IDs, station codes, status values

### 5. API Design Issues

#### Inconsistent Response Format
**Location:** Lines 114-121, 162-169

**Problem:**
- Different endpoints return different response structures
- `/api/wairarapa-departures` includes `success`, `timestamp`, `cached` fields
- `/api/station/:stationId` has different structure with `original_total`
- No consistent error response format

**Recommendations:**
- Standardize response format across all endpoints
- Use consistent error response structure
- Consider OpenAPI/Swagger documentation

#### No API Versioning
**Location:** All routes

**Problem:**
- Routes don't include version prefix (e.g., `/api/v1/...`)
- Breaking changes will affect all clients immediately
- No deprecation strategy

**Recommendations:**
- Add version prefix: `/api/v1/wairarapa-departures`
- Plan for version migration strategy

### 6. Performance & Scalability

#### Sequential Station Fetching
**Location:** Lines 69-92

**Problem:**
- Uses `Promise.all()` correctly, but no concurrency limits
- All stations fetched simultaneously could overwhelm Metlink API
- No consideration for API rate limits

**Recommendations:**
- Add concurrency limiting (e.g., p-limit library)
- Respect Metlink API rate limits
- Consider batching or staggered requests

#### No Response Compression
**Location:** Missing middleware

**Problem:**
- No compression middleware (gzip/brotli)
- Larger payloads increase bandwidth costs and latency

**Recommendations:**
- Add `compression` middleware for Express
- Enable compression for JSON responses

### 7. Monitoring & Observability

#### Limited Logging
**Location:** Scattered console.log statements

**Problems:**
- Uses `console.log` instead of structured logging
- No log levels (info, warn, error)
- No request ID tracking
- No performance metrics

**Recommendations:**
- Implement structured logging (e.g., Winston, Pino)
- Add request ID middleware for traceability
- Log request/response times
- Add metrics for cache hit rates, API call counts, error rates

#### No Health Check Depth
**Location:** Lines 182-194

**Problem:**
- Health check doesn't verify actual API connectivity
- Only checks if cache exists, not if it's useful
- No dependency health checks

**Recommendations:**
- Add deep health check that tests Metlink API connectivity
- Check cache health and age
- Return appropriate HTTP status codes (503 if unhealthy)

### 8. Configuration Management

#### Environment Variable Handling
**Location:** Lines 7, 15

**Problems:**
- No validation of environment variables
- No default values documented
- No configuration schema

**Recommendations:**
- Use configuration validation library (e.g., joi, zod)
- Document all required/optional environment variables
- Provide sensible defaults where appropriate
- Fail fast on missing required config

### 9. Testing & Quality Assurance

#### No Tests
**Location:** package.json line 9

**Problem:**
- No test suite exists
- `test` script just echoes error
- No unit tests, integration tests, or API tests

**Recommendations:**
- Add Jest or Mocha test framework
- Write unit tests for utility functions
- Add integration tests for API endpoints
- Mock Metlink API responses for testing
- Add test coverage reporting

### 10. Deployment Concerns

#### Serverless Compatibility
**Location:** Lines 209-222

**Problem:**
- In-memory cache won't work well in serverless (Vercel) environment
- Each serverless instance has its own cache
- Cache invalidation is unpredictable

**Recommendations:**
- Use external cache (Redis, Vercel KV) for serverless
- Or accept cache-less operation in serverless mode
- Document deployment considerations

## Summary of Priority Improvements

### High Priority
1. Remove hardcoded API key fallback
2. Implement proper error handling and retry logic
3. Add request validation and rate limiting
4. Implement structured logging

### Medium Priority
5. Refactor into modular structure
6. Standardize API response format
7. Add API versioning
8. Implement distributed caching for serverless
9. Add comprehensive test suite

### Low Priority
10. Add response compression
11. Improve health check depth
12. Add configuration validation
13. Document API with OpenAPI/Swagger

