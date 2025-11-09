# Frontend Architecture Issues & Improvements

## Overview

Analysis of React application architecture focusing on `TrainSchedule.js` component and `metlinkApi.js` service layer, identifying data flow issues, UX gaps, and architectural concerns.

## Critical Issues

### 1. Data Flow & State Management

#### Hardcoded API URL

**Location:** `TrainSchedule.js` lines 23-25

```javascript
const apiUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001/api/wairarapa-departures"
    : "https://wairarapa-train-schedule-puvxgxusd.vercel.app/api/wairarapa-departures";
```

**Problems:**

- Hardcoded production URL in source code
- No environment variable for API base URL
- Difficult to switch between staging/production
- URL contains deployment-specific identifier

**Impact:** High - Deployment inflexibility, maintenance burden

**Recommendations:**

- Use environment variable: `REACT_APP_API_URL`
- Provide fallback or fail gracefully if not configured
- Document required environment variables

#### No Centralized API Configuration

**Location:** `metlinkApi.js` and `TrainSchedule.js`

**Problems:**

- API URLs scattered across files
- `metlinkApi.js` has unused API configuration (lines 1-2)
- Duplicate station/service constants in multiple files
- No single source of truth for API endpoints

**Recommendations:**

- Create `config/api.js` for all API configuration
- Centralize all constants (stations, service IDs, endpoints)
- Use environment variables for all URLs

#### Unused Service Layer

**Location:** `metlinkApi.js` entire file

**Problems:**

- `metlinkApi.js` contains mock data and unused functions
- `getStopPredictions()` returns mock data (lines 24-105)
- `getWairarapaDepartures()` is never called
- Component directly calls backend API instead of using service layer
- Service layer functions are exported but unused

**Impact:** Medium - Code confusion, technical debt, unused code

**Recommendations:**

- Remove mock data functions or clearly mark as development-only
- Refactor to use service layer properly
- Create proper abstraction between component and API
- Or remove unused service file if not needed

### 2. Component Architecture

#### Monolithic Component

**Location:** `TrainSchedule.js` (293 lines)

**Problems:**

- Single component handles all logic: data fetching, state management, rendering
- Mixes concerns: API calls, data transformation, UI rendering
- Difficult to test individual pieces
- Hard to reuse logic or UI components

**Recommendations:**

- Split into smaller components:
  - `TrainSchedule` - Container component (data fetching, state)
  - `DirectionTable` - Renders one direction's departures
  - `DepartureRow` - Individual departure row/card
  - `StatusBadge` - Status indicator component
  - `NoticesBox` - Service notices display
- Extract custom hooks: `useTrainSchedule()` for data fetching logic

#### Inline Data Transformation

**Location:** `TrainSchedule.js` lines 87-244

**Problems:**

- Data transformation logic mixed with rendering
- `renderDirectionTable()` does too much (filtering, mapping, rendering)
- Status calculation, time formatting scattered throughout
- Difficult to test transformation logic independently

**Recommendations:**

- Extract data transformation to utility functions
- Move status/formatting logic to service layer or utils
- Keep components focused on presentation

#### Duplicate Rendering Logic

**Location:** `TrainSchedule.js` lines 100-152 (mobile) and 155-217 (desktop)

**Problems:**

- Mobile and desktop layouts have duplicate logic
- Same data transformation repeated twice
- Changes must be made in two places
- Violates DRY principle

**Recommendations:**

- Extract shared logic to helper functions
- Use single component with responsive classes
- Or create separate components but share data preparation

### 3. State Management

#### Basic useState Usage

**Location:** `TrainSchedule.js` lines 12-15

**Problems:**

- Simple state management may not scale
- No state normalization (departures stored as-is from API)
- No optimistic updates
- No state persistence (localStorage, etc.)

**Impact:** Low-Medium - May need refactoring as features grow

**Recommendations:**

- Consider Context API if state needs to be shared
- Add localStorage persistence for offline support
- Normalize state structure if needed
- Consider state management library (Redux, Zustand) if complexity grows

#### No Loading State Differentiation

**Location:** `TrainSchedule.js` lines 78-85

**Problems:**

- Single loading state for initial load and refresh
- No distinction between first load and background refresh
- Users can't tell if data is stale during refresh

**Recommendations:**

- Separate initial loading from refresh loading
- Show "Refreshing..." indicator during background updates
- Keep displaying stale data while refreshing

#### Error State Management

**Location:** `TrainSchedule.js` lines 14, 52-54, 272-276

**Problems:**

- Error state is simple string, no error types
- No error recovery strategies
- Errors cleared on next fetch attempt (may hide persistent issues)
- No retry mechanism

**Recommendations:**

- Create error object with type, message, retry function
- Implement retry logic with exponential backoff
- Show error details for debugging (dev mode)
- Add "Retry" button for failed requests

### 4. Performance Issues

#### Unnecessary Re-renders

**Location:** `TrainSchedule.js` entire component

**Problems:**

- No memoization of expensive computations
- `renderDirectionTable()` recreated on every render
- Status calculations repeated for same data
- No React.memo for child components

**Recommendations:**

- Memoize expensive calculations with `useMemo`
- Use `useCallback` for event handlers passed to children
- Consider React.memo for pure components
- Profile with React DevTools to identify bottlenecks

#### Inefficient Data Processing

**Location:** `TrainSchedule.js` lines 221-242

**Problems:**

- Notices extraction runs on every render
- Processes all departures even if notices box isn't visible
- Creates new arrays/sets on every render

**Recommendations:**

- Memoize notices extraction
- Only process visible departures
- Cache processed notices

#### No Code Splitting

**Location:** `App.js`, `index.js`

**Problems:**

- Entire app loads as single bundle
- No lazy loading of components
- Larger initial bundle size

**Recommendations:**

- Implement React.lazy() for route-based code splitting
- Consider component-level code splitting for large components
- Use dynamic imports for heavy dependencies

### 5. User Experience Gaps

#### Hardcoded Refresh Interval

**Location:** `TrainSchedule.js` line 64

```javascript
const interval = setInterval(fetchSchedule, 120000);
```

**Problems:**

- 2-minute refresh is hardcoded
- No user control over refresh frequency
- May be too frequent or infrequent depending on use case
- No pause/resume functionality

**Recommendations:**

- Make refresh interval configurable
- Add user preference for auto-refresh (on/off, interval)
- Pause auto-refresh when tab is hidden (Page Visibility API)
- Show countdown to next refresh

#### Limited Error Feedback

**Location:** `TrainSchedule.js` lines 272-276

**Problems:**

- Generic error message: "Failed to fetch train schedule"
- No actionable error information
- No distinction between network errors, API errors, parsing errors
- Error disappears on next successful fetch

**Recommendations:**

- Show specific error messages based on error type
- Provide actionable guidance (check connection, try again)
- Log errors for debugging
- Consider error boundaries for better error handling

#### No Offline Support

**Location:** Entire application

**Problems:**

- No service worker for offline functionality
- No cached data display when offline
- No offline indicator
- Users see error immediately when offline

**Recommendations:**

- Implement service worker for offline caching
- Cache last successful response
- Show cached data with "Offline" indicator
- Queue requests when offline, sync when online

#### No Loading Skeleton

**Location:** `TrainSchedule.js` lines 78-85

**Problems:**

- Simple spinner, no content structure hint
- Layout shift when content loads
- No indication of what's loading

**Recommendations:**

- Implement skeleton screens matching layout
- Show structure while loading
- Reduce perceived load time

### 6. Accessibility Issues

#### Missing ARIA Labels

**Location:** `TrainSchedule.js` throughout

**Problems:**

- No ARIA labels on status badges
- No ARIA live regions for dynamic updates
- No screen reader announcements for status changes
- Table may not be properly labeled

**Recommendations:**

- Add ARIA labels to all interactive elements
- Use aria-live regions for status updates
- Ensure proper table headers and scope
- Test with screen readers

#### Color-Only Status Indicators

**Location:** `TrainSchedule.js` lines 135-137, 198-210

**Problems:**

- Status relies on color (green/yellow/red)
- Colorblind users may not distinguish statuses
- No text labels in some cases

**Recommendations:**

- Ensure status text is always visible
- Use icons + text, not just color
- Test with colorblind simulation tools
- Follow WCAG contrast guidelines

#### Keyboard Navigation

**Location:** `TrainSchedule.js` line 263-269

**Problems:**

- Refresh button may not have proper focus management
- No keyboard shortcuts documented
- Table navigation may not be optimal

**Recommendations:**

- Ensure all interactive elements are keyboard accessible
- Add keyboard shortcuts (e.g., R for refresh)
- Test tab order and focus management

### 7. Code Quality & Maintainability

#### Inconsistent Naming

**Location:** Throughout codebase

**Problems:**

- Mix of camelCase and inconsistent abbreviations
- `wairapapaDepartures` typo in `metlinkApi.js` line 121
- Inconsistent function naming patterns

**Recommendations:**

- Establish naming conventions
- Fix typos
- Use consistent abbreviations

#### Magic Numbers

**Location:** `TrainSchedule.js` lines 64, 106, 172

**Problems:**

- Hardcoded values: `120000`, `10`, etc.
- No explanation of why these values were chosen
- Difficult to adjust without finding all occurrences

**Recommendations:**

- Extract to named constants
- Document rationale for values
- Make configurable where appropriate

#### No Type Safety

**Location:** Entire codebase

**Problems:**

- JavaScript without TypeScript
- No type checking for API responses
- Runtime errors possible from unexpected data shapes
- No IDE autocomplete for API data

**Recommendations:**

- Consider migrating to TypeScript
- Or add PropTypes for runtime validation
- Create type definitions/JSDoc for API responses
- Validate API responses at runtime

#### Console.log Statements

**Location:** Multiple files

**Problems:**

- Debug console.log statements left in code
- No structured logging
- Logs may expose sensitive information in production

**Recommendations:**

- Remove or gate debug logs behind environment check
- Use proper logging library
- Don't log sensitive data

### 8. Testing

#### No Tests

**Location:** `App.test.js` exists but minimal

**Problems:**

- No unit tests for components
- No tests for utility functions
- No integration tests
- No E2E tests

**Recommendations:**

- Add unit tests for utility functions (formatTime, parseDelay, etc.)
- Add component tests with React Testing Library
- Add integration tests for API calls (mocked)
- Consider E2E tests with Cypress/Playwright

### 9. Service Layer Issues

#### Mock Data in Production Code

**Location:** `metlinkApi.js` lines 24-105

**Problems:**

- Mock data function exists but is never used
- Comment says "Temporary mock data" but it's still there
- Creates confusion about actual data flow

**Recommendations:**

- Remove mock data if not needed
- Or move to separate mock file for testing
- Clearly document if used for development

#### Unused Exports

**Location:** `metlinkApi.js`

**Problems:**

- Many exported functions never imported
- `getStopPredictions`, `getWairarapaDepartures` unused
- Only utility functions (formatTime, getStatus, etc.) are used

**Recommendations:**

- Remove unused exports
- Or refactor to use service layer properly
- Document which functions are public API

#### Hardcoded API Key

**Location:** `metlinkApi.js` line 2

**Problems:**

- API key hardcoded as fallback (same issue as backend)
- Key exposed in frontend code (worse than backend)
- Frontend shouldn't call Metlink API directly anyway

**Recommendations:**

- Remove API key from frontend entirely
- Frontend should only call backend API
- Remove unused Metlink API configuration

### 10. Build & Deployment

#### No Environment Variable Validation

**Location:** Build process

**Problems:**

- No validation that required env vars are set
- Build succeeds even if API URL is wrong
- Runtime errors instead of build-time errors

**Recommendations:**

- Validate environment variables at build time
- Fail build if required vars missing
- Provide helpful error messages

#### Hardcoded Build Configuration

**Location:** `package.json`, `vercel.json`

**Problems:**

- No build optimization configuration visible
- May be missing performance optimizations
- No bundle analysis setup

**Recommendations:**

- Add bundle analyzer to identify large dependencies
- Optimize build output
- Consider adding source maps for production debugging

## Summary of Priority Improvements

### High Priority

1. Remove hardcoded API URLs, use environment variables
2. Remove or properly implement service layer
3. Split monolithic component into smaller components
4. Remove hardcoded API key from frontend
5. Add proper error handling and user feedback

### Medium Priority

6. Implement offline support and caching
7. Add loading states and skeleton screens
8. Fix accessibility issues (ARIA labels, keyboard nav)
9. Extract duplicate rendering logic
10. Add memoization for performance

### Low Priority

11. Migrate to TypeScript or add PropTypes
12. Add comprehensive test suite
13. Implement code splitting
14. Add user preferences (refresh interval, etc.)
15. Clean up unused code and console.logs
