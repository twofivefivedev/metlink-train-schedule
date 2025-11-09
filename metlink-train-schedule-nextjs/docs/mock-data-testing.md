# Mock Data Testing Guide

## Overview

The mock data system allows you to test alerts and announcements without calling the real Metlink API. This is useful for:
- Developing alert features
- Testing different alert scenarios
- Debugging alert logic
- Avoiding API rate limits during development

## Enabling Mock Mode

### Option 1: Environment Variable (Recommended)

Add to your `.env.local` file:

```bash
NEXT_PUBLIC_USE_MOCK_DATA=true
```

### Option 2: Explicit Disable

To explicitly disable mock mode even in development:

```bash
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### Option 3: Auto-Enable in Development

Mock mode automatically enables in development mode (server-side only) unless explicitly disabled. No configuration needed.

## Test Scenarios

Mock data supports different scenarios via URL query parameter `mockScenario`:

### Available Scenarios

1. **`normal`** (default)
   - Normal train departures with no alerts
   - Use for testing baseline functionality

2. **`cancelled`**
   - First inbound departure is cancelled
   - Tests cancellation alerts
   - URL: `?mockScenario=cancelled`

3. **`delayed`**
   - First inbound departure has a 20-minute delay
   - Tests delay alerts
   - URL: `?mockScenario=delayed`

4. **`approaching`**
   - First inbound departure arrives in 3 minutes
   - Tests approaching train alerts
   - URL: `?mockScenario=approaching`

5. **`multiple`**
   - Combination of delays and cancellations
   - Tests multiple alert conditions
   - URL: `?mockScenario=multiple`

6. **`bus-replacement`**
   - First inbound departure is a bus replacement
   - Tests bus replacement notices
   - URL: `?mockScenario=bus-replacement`

## Usage Examples

### Testing Cancellation Alerts

1. Enable mock mode: `NEXT_PUBLIC_USE_MOCK_DATA=true`
2. Add a favorite route (via Favorites panel)
3. Enable cancellation alerts in preferences
4. Visit: `http://localhost:3000?mockScenario=cancelled`
5. You should see a cancellation alert notification

### Testing Delay Alerts

1. Enable mock mode: `NEXT_PUBLIC_USE_MOCK_DATA=true`
2. Add a favorite route
3. Enable delay alerts in preferences
4. Visit: `http://localhost:3000?mockScenario=delayed`
5. You should see a delay alert notification

### Testing Approaching Train Alerts

1. Enable mock mode: `NEXT_PUBLIC_USE_MOCK_DATA=true`
2. Add a favorite route
3. Enable approaching alerts (set to 5 minutes)
4. Visit: `http://localhost:3000?mockScenario=approaching`
5. You should see an approaching train notification

## Mock Data Structure

Mock departures are generated with:
- Realistic departure times (relative to current time)
- Proper station and destination information
- Service IDs matching the selected line
- Alert conditions based on the selected scenario

## Customizing Mock Data

To customize mock data, edit `lib/utils/mockData.ts`:

- Modify `generateMockDepartures()` to change departure times
- Adjust scenario logic to change alert conditions
- Add new scenarios by extending the `MockScenario` type

## Testing Checklist

- [ ] Cancellation alerts trigger correctly
- [ ] Delay alerts trigger correctly
- [ ] Approaching train alerts trigger correctly
- [ ] Multiple alerts work simultaneously
- [ ] Browser notifications appear (with permission)
- [ ] Service worker notifications work (if configured)
- [ ] Alert conditions match user preferences
- [ ] Alerts only trigger for favorite routes

## Troubleshooting

### Mock data not appearing

1. Check `NEXT_PUBLIC_USE_MOCK_DATA` is set correctly
2. Verify you're in development mode (for auto-enable)
3. Check browser console for errors
4. Ensure the scenario parameter is correct

### Alerts not triggering

1. Verify you have favorite routes configured
2. Check alert preferences are enabled
3. Ensure the scenario matches alert conditions (e.g., `approaching` for approaching alerts)
4. Check browser notification permissions

### Wrong data appearing

1. Clear browser cache and localStorage
2. Verify the `mockScenario` query parameter
3. Check that mock mode is actually enabled (check console logs)

## Disabling Mock Mode

To return to real API:

1. Remove `NEXT_PUBLIC_USE_MOCK_DATA` from `.env.local`, or
2. Set `NEXT_PUBLIC_USE_MOCK_DATA=false`

The application will automatically use the real Metlink API.

