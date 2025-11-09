# Feature Roadmap & Enhancement Ideas

## Overview

Potential features and enhancements aligned with identified architectural gaps and user experience improvements.

## High-Impact Features

### 1. Multi-Station Support

**Priority:** High  
**Effort:** Medium  
**Impact:** High

**Description:**
Expand beyond Wellington, Petone, and Featherston to include all Wairarapa line stations (Masterton, Carterton, Woodside, etc.).

**Implementation:**

- Backend: Make station list configurable via API or config file
- Frontend: Add station selector/filter
- Update station mapping to include all stops

**Benefits:**

- Serves broader user base
- More comprehensive service
- Better alignment with Metlink's full dataset

**Dependencies:**

- Resolve hardcoded station mapping (Backend Issue #4)
- Research all Wairarapa line station IDs

---

### 2. Real-Time Train Tracking - Do not implemenet

**Priority:** High  
**Effort:** High  
**Impact:** High

**Description:**
Display live train positions and estimated arrival times based on vehicle_id tracking.

**Implementation:**

- Backend: Poll vehicle positions from Metlink API
- Frontend: Visual map or timeline showing train progress
- WebSocket or Server-Sent Events for real-time updates

**Benefits:**

- Enhanced user experience
- Better decision-making for users
- Competitive advantage over static schedules

**Dependencies:**

- Backend WebSocket/SSE infrastructure
- Map integration (Google Maps, Leaflet, etc.)
- Vehicle tracking API endpoint research

---

### 3. Personalized Favorites & Alerts ✅ IMPLEMENTED

**Priority:** Medium-High  
**Effort:** Medium  
**Impact:** High  
**Status:** Completed

**Description:**
Allow users to save favorite routes/stations and receive alerts for delays, cancellations, or approaching trains.

**Implementation:**

- ✅ Frontend: User preferences stored in localStorage with API stub for future backend integration
- ✅ Backend: Alert system using browser notifications and service worker
- ✅ Real-time monitoring of favorite routes
- ✅ FavoritesPanel component for managing favorites
- ✅ Alert detection for delays, cancellations, and approaching trains
- ✅ Browser notification integration

**Benefits:**

- Increased user engagement
- Proactive service delivery
- User retention

**Dependencies:**

- User authentication system (optional) - Not implemented, using localStorage
- Notification service integration - ✅ Implemented via browser notifications
- Preference storage solution - ✅ Implemented via localStorage with API stub

---

### 4. Historical Data & Analytics

**Priority:** Medium  
**Effort:** High  
**Impact:** Medium

**Description:**
Track and display historical on-time performance, average delays, peak times, and reliability metrics.

**Implementation:**

- Backend: Data collection and storage (database)
- Analytics engine for processing historical data
- Frontend: Charts and statistics display

**Benefits:**

- Data-driven insights for users
- Helps identify patterns and issues
- Potential for public transit advocacy

**Dependencies:**

- Database setup (PostgreSQL, MongoDB, etc.)
- Data retention policy
- Analytics visualization library

---

### 5. Multi-Line Support ✅ IMPLEMENTED

**Priority:** Medium  
**Effort:** High  
**Impact:** Medium-High  
**Status:** Completed

**Description:**
Expand beyond Wairarapa line to support other Wellington train lines (Kapiti, Hutt Valley, Johnsonville).

**Implementation:**

- ✅ Backend: Generic line filtering with configurable service IDs
- ✅ Frontend: LineSelector component for selecting train lines
- ✅ Service ID mapping for all Wellington lines (WRL, KPL, HVL, JVL)
- ✅ API route updated to accept line parameter
- ✅ Hook updated to support line selection

**Benefits:**

- Broader market appeal
- More comprehensive transit tool
- Scales to full Metlink coverage

**Dependencies:**

- ✅ Resolve hardcoded service ID (Backend Issue #4) - Fixed
- ✅ Research all Wellington train lines - Added to constants
- ✅ UI/UX for multi-line interface - Implemented

---

### 6. Offline Mode & Progressive Web App

**Priority:** Medium  
**Effort:** Medium  
**Impact:** Medium

**Description:**
Transform into PWA with offline support, installable app, and cached data.

**Implementation:**

- Service worker for offline caching
- App manifest for installability
- Background sync for data updates
- Offline-first architecture

**Benefits:**

- Works without internet connection
- App-like experience
- Better mobile user experience
- Reduced server load

**Dependencies:**

- Service worker implementation
- Cache strategy design
- PWA best practices

---

### 7. Route Planning & Journey Planner - do not implement

**Priority:** Medium  
**Effort:** High  
**Impact:** Medium-High

**Description:**
Help users plan journeys with connections, walking times, and optimal route suggestions.

**Implementation:**

- Backend: Route calculation algorithm
- Integration with Metlink routing API (if available)
- Frontend: Journey planner interface
- Map integration for visual routes

**Benefits:**

- More comprehensive transit tool
- Competitive with Google Maps transit
- Increased user value

**Dependencies:**

- Routing algorithm or API
- Map integration
- Connection time calculations

---

### 8. Social Features & Crowdsourcing - low priority

**Priority:** Low-Medium  
**Effort:** Medium  
**Impact:** Medium

**Description:**
Allow users to report delays, crowded trains, or service issues. Display crowd-sourced information.

**Implementation:**

- Backend: User submission API
- Moderation system
- Frontend: Report interface and display
- Aggregation of user reports

**Benefits:**

- Community-driven data
- Real-time user insights
- Complements official API data

**Dependencies:**

- User authentication (optional)
- Moderation system
- Spam/abuse prevention

---

### 9. Accessibility Enhancements

**Priority:** High  
**Effort:** Low-Medium  
**Impact:** High

**Description:**
Comprehensive accessibility improvements: screen reader support, keyboard navigation, high contrast mode, text size controls.

**Implementation:**

- ARIA labels and live regions
- Keyboard navigation improvements
- High contrast theme option
- Text scaling support
- Screen reader testing

**Benefits:**

- Legal compliance (accessibility requirements)
- Broader user base
- Better UX for all users

**Dependencies:**

- Accessibility audit
- Screen reader testing
- WCAG compliance review

---

### 10. Performance Monitoring & Analytics

**Priority:** Medium  
**Effort:** Low-Medium  
**Impact:** Medium

**Description:**
Track application performance, API response times, error rates, and user analytics.

**Implementation:**

- Backend: Performance logging and metrics
- Frontend: User analytics (privacy-respecting)
- Error tracking (Sentry, etc.)
- Performance monitoring dashboard

**Benefits:**

- Proactive issue detection
- Data-driven improvements
- Better reliability

**Dependencies:**

- Analytics service integration
- Error tracking service
- Metrics collection infrastructure

---

## Quick Wins (Low Effort, Medium Impact)

### 11. Dark Mode

**Priority:** Medium  
**Effort:** Low  
**Impact:** Medium

**Description:**
Add dark theme option for better viewing in low-light conditions.

**Implementation:**

- CSS variables for theming
- Theme toggle component
- Persist preference in localStorage

---

### 12. Export/Share Functionality - do not implement

**Priority:** Low-Medium  
**Effort:** Low  
**Impact:** Low-Medium

**Description:**
Allow users to export schedule to calendar (ICS), share via social media, or generate PDF.

**Implementation:**

- ICS file generation
- Share API integration
- PDF generation library

---

### 13. Time Zone Display Options - do not implement (aimed at local NZ audience)

**Priority:** Low  
**Effort:** Low  
**Impact:** Low-Medium

**Description:**
Show times in different time zones or 24-hour format based on user preference.

**Implementation:**

- Time format preference
- Time zone selection
- Persist in localStorage

---

### 14. Filter & Sort Options

**Priority:** Medium  
**Effort:** Low-Medium  
**Impact:** Medium

**Description:**
Filter by station, direction, express/all stops. Sort by time, delay, status.

**Implementation:**

- Filter state management
- Sort functions
- UI controls for filters

---

### 15. Estimated Wait Time ✅ IMPLEMENTED

**Priority:** Medium  
**Effort:** Low  
**Impact:** Medium  
**Status:** Completed

**Description:**
Show "Next train in X minutes" prominently for quick reference.

**Implementation:**

- ✅ Calculate time until next departure (calculateWaitTime utility)
- ✅ Display prominently in DepartureBoard header
- ✅ Update in real-time via useCurrentTime hook
- ✅ Display wait time for each departure row
- ✅ Unit tests added for wait time calculation

---

## Infrastructure & Technical Debt

### 16. API Versioning & Documentation

**Priority:** Medium  
**Effort:** Medium  
**Impact:** Medium

**Description:**
Implement API versioning and comprehensive API documentation (OpenAPI/Swagger).

**Implementation:**

- Version prefix in routes
- OpenAPI specification
- Interactive API docs
- Deprecation strategy

---

### 17. Comprehensive Testing Suite

**Priority:** High  
**Effort:** High  
**Impact:** High

**Description:**
Add unit tests, integration tests, E2E tests, and achieve high code coverage.

**Implementation:**

- Jest for unit/integration tests
- React Testing Library for components
- Cypress/Playwright for E2E
- CI/CD test automation

---

### 18. Monitoring & Alerting

**Priority:** High  
**Effort:** Medium  
**Impact:** High

**Description:**
Set up application monitoring, error tracking, uptime monitoring, and alerting.

**Implementation:**

- Error tracking (Sentry)
- Uptime monitoring
- Performance monitoring
- Alert configuration

---

### 19. CI/CD Pipeline ✅ IMPLEMENTED

**Priority:** Medium  
**Effort:** Medium  
**Impact:** Medium  
**Status:** Completed

**Description:**
Automate testing, building, and deployment with proper staging environments.

**Implementation:**

- ✅ GitHub Actions workflow (`.github/workflows/ci.yml`)
- ✅ Automated testing (lint, type-check, test)
- ✅ Build verification
- ✅ Coverage reporting (Codecov integration)
- ✅ Documentation added to MIGRATION.md

---

### 20. Database Migration

**Priority:** Medium  
**Effort:** High  
**Impact:** Medium

**Description:**
Move from in-memory cache to persistent database for historical data and better caching.

**Implementation:**

- Database selection and setup
- Migration from in-memory cache
- Data persistence layer
- Query optimization

---

## Feature Prioritization Matrix

**Note:** Features marked "do not implement" (#2, #7, #12, #13) have been excluded from this prioritization.

### Immediate (Next Sprint)

1. Accessibility Enhancements (#9)
2. Remove hardcoded API URLs (#Frontend Issue #1)
3. Dark Mode (#11)
4. Filter & Sort Options (#14)

### Short Term (1-2 Months)

5. Multi-Station Support (#1)
6. PWA (#6)
7. Monitoring & Alerting (#18)

### Medium Term (3-6 Months)

9. Personalized Favorites & Alerts (#3)
10. Multi-Line Support (#5)
11. CI/CD Pipeline (#19)
12. Estimated Wait Time (#15)

### Long Term (6+ Months)

13. Historical Data & Analytics (#4)
14. Database Migration (#20)
15. Performance Monitoring & Analytics (#10)
16. API Versioning & Documentation (#16)

### Excluded Features

The following features are explicitly excluded from implementation:

- Real-Time Train Tracking (#2) - Do not implement
- Route Planning & Journey Planner (#7) - Do not implement
- Export/Share Functionality (#12) - Do not implement
- Time Zone Display Options (#13) - Do not implement (aimed at local NZ audience)

### Low Priority (Consider if time permits)

- Social Features & Crowdsourcing (#8) - Low priority

## Success Metrics

For each feature, consider tracking:

- **User Engagement:** Daily/monthly active users, session duration
- **Performance:** Page load time, API response time, error rates
- **Accessibility:** WCAG compliance score, screen reader compatibility
- **Reliability:** Uptime percentage, API success rate
- **User Satisfaction:** Feedback, feature usage, retention rate

## Notes

- Features should align with architectural improvements identified in backend/frontend issue documents
- Consider user feedback and usage patterns when prioritizing
- Balance new features with technical debt reduction
- Ensure features are accessible and performant
- Maintain backward compatibility where possible
