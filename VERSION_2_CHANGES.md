# Version 2.0 Changes

## Overview
Version 2.0 represents a major architectural refactor addressing security, reliability, and maintainability issues identified in the architecture review.

## Backend Changes (`wairarapa-api`)

### Security Improvements
- ✅ **Removed hardcoded API key** - API key is now required via environment variable
- ✅ **Configuration validation** - Fails fast if required environment variables are missing
- ✅ **Removed API key from health check** - No longer exposes configuration state

### Architecture Refactoring
- ✅ **Modular structure** - Split monolithic `server.js` into organized modules:
  - `config/` - Configuration and constants
  - `services/` - Business logic (Metlink API client, departure processing)
  - `routes/` - API route handlers
  - `middleware/` - Express middleware (caching, error handling)
  - `utils/` - Utility functions (logging, retry, response formatting)

### Reliability Improvements
- ✅ **Structured logging** - Replaced console.log with proper logging utility
- ✅ **Retry logic** - Added exponential backoff retry for transient failures
- ✅ **Standardized responses** - Consistent API response format across all endpoints
- ✅ **Error handling** - Centralized error handling middleware
- ✅ **Request logging** - Added request logging middleware

### Code Quality
- ✅ **Centralized constants** - All magic strings moved to constants file
- ✅ **Type safety** - Better JSDoc comments and validation
- ✅ **Separation of concerns** - Clear separation between routes, services, and utilities

## Frontend Changes (`wairarapa-train-schedule`)

### Theme Migration
- ✅ **shadcn/ui Sketchpad theme** - Integrated shadcn/ui with Sketchpad theme
- ✅ **Design system** - Consistent color palette and component styling
- ✅ **Dark mode support** - CSS variables for theme switching (ready for future implementation)

### Architecture Refactoring
- ✅ **Service layer** - Created proper API service (`apiService.js`)
- ✅ **Custom hooks** - Extracted data fetching logic to `useTrainSchedule` hook
- ✅ **Component splitting** - Broke down monolithic component:
  - `TrainSchedule` - Main container component
  - `DirectionTable` - Table/card display component
  - `DepartureRow` - Individual departure row component
  - `LoadingSkeleton` - Loading state component
- ✅ **UI components** - Created reusable shadcn/ui components:
  - `Button`, `Badge`, `Card` components

### Configuration
- ✅ **Environment variables** - API URL now configurable via `REACT_APP_API_URL`
- ✅ **Centralized config** - API configuration in `config/api.js`
- ✅ **Constants** - Application constants in `config/constants.js`

### User Experience
- ✅ **Loading states** - Separate initial loading and refresh states
- ✅ **Error handling** - Better error messages with retry functionality
- ✅ **Loading skeleton** - Skeleton screens instead of simple spinner
- ✅ **Accessibility** - Added ARIA labels and semantic HTML

### Code Quality
- ✅ **Removed unused code** - Deleted old `metlinkApi.js` with mock data
- ✅ **Utility functions** - Moved to `utils/departureUtils.js`
- ✅ **Memoization** - Added useMemo for expensive computations
- ✅ **Consistent styling** - Using shadcn/ui design tokens

## Migration Guide

### Backend Migration

1. **Environment Variables**
   ```bash
   cp wairarapa-api/.env.example wairarapa-api/.env
   # Edit .env and add your METLINK_API_KEY
   ```

2. **Install Dependencies** (if needed)
   ```bash
   cd wairarapa-api
   npm install
   ```

3. **Start Server**
   ```bash
   npm start
   ```

### Frontend Migration

1. **Environment Variables**
   ```bash
   cp wairarapa-train-schedule/.env.example wairarapa-train-schedule/.env
   # Edit .env and set REACT_APP_API_URL
   ```

2. **Install Dependencies**
   ```bash
   cd wairarapa-train-schedule
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

## Breaking Changes

### Backend API
- **Health check response** - Removed `apiKey` field from health check
- **Error responses** - Standardized error response format (may affect error handling in frontend)

### Frontend
- **API service** - Old `metlinkApi.js` removed, use `apiService.js` instead
- **Component structure** - `TrainSchedule` component refactored, internal structure changed
- **Styling** - Tailwind classes updated to use shadcn/ui design tokens

## New Features

### Backend
- Configurable cache duration via environment variable
- Configurable API timeout via environment variable
- Log level configuration
- Retry logic for API calls
- Request logging

### Frontend
- Loading skeleton screens
- Better error messages with retry
- Separate loading/refreshing states
- shadcn/ui component library
- Dark mode CSS variables (ready for implementation)

## Files Changed

### Backend
- `server.js` - Completely refactored
- `config/constants.js` - New
- `config/index.js` - New
- `services/metlinkService.js` - New
- `services/departureService.js` - New
- `routes/departures.js` - New
- `routes/health.js` - New
- `middleware/cache.js` - New
- `middleware/errorHandler.js` - New
- `utils/logger.js` - New
- `utils/retry.js` - New
- `utils/response.js` - New

### Frontend
- `src/components/TrainSchedule.js` - Refactored
- `src/components/DirectionTable.jsx` - New
- `src/components/DepartureRow.jsx` - New
- `src/components/LoadingSkeleton.jsx` - New
- `src/components/ui/*` - New shadcn/ui components
- `src/services/apiService.js` - New
- `src/services/metlinkApi.js` - Removed
- `src/utils/departureUtils.js` - New (extracted from old metlinkApi.js)
- `src/hooks/useTrainSchedule.js` - New
- `src/config/api.js` - New
- `src/config/constants.js` - New
- `src/lib/utils.js` - New
- `tailwind.config.js` - Updated for shadcn/ui
- `src/index.css` - Updated for Sketchpad theme

## Testing

Both backend and frontend should be tested:

### Backend Testing
- Test API endpoints with valid/invalid API keys
- Test error handling
- Test retry logic
- Test caching behavior

### Frontend Testing
- Test component rendering
- Test API error handling
- Test loading states
- Test refresh functionality

## Next Steps

See `FEATURE_ROADMAP.md` for planned features and improvements.

