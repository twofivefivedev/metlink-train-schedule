# Metlink API Documentation - Wairarapa Train Schedule

## API Overview
- **Base URLs:**
  - Real-time data: `https://api.opendata.metlink.org.nz/v1/gtfs-rt/`
  - Static data: `https://api.opendata.metlink.org.nz/v1/gtfs/`
  - Stop predictions: `https://api.opendata.metlink.org.nz/v1/stop-predictions`
- **Authentication:** API key required in header: `x-api-key: YOUR_API_KEY`
- **Data Format:** JSON

## Key Endpoints

### 1. Stop Predictions (Primary endpoint for our app)
**URL:** `GET /v1/stop-predictions?stop_id={STOP_ID}`

**Purpose:** Get real-time departure predictions for a specific station

**Station IDs for Wairarapa Line:**
- **Wellington:** `WELL` (multiple platforms: WELL1, WELL2)
- **Petone:** `PETO` (multiple platforms: PETO1, PETO2) 
- **Featherston:** Need to research - might be a bus stop ID

### 2. Routes
**URL:** `GET /v1/gtfs/routes`

**Wairarapa Line Identifier:** `WRL` (route_id: 4)

### 3. Stops
**URL:** `GET /v1/gtfs/stops`

**Returns:** All stops in the network with details

## Response Structure for Stop Predictions

```json
{
  "farezone": "4",
  "closed": false,
  "departures": [
    {
      "stop_id": "PETO1",
      "service_id": "WRL",
      "direction": "inbound",
      "operator": "RAIL",
      "origin": {
        "stop_id": "MAST",
        "name": "MastertonStn"
      },
      "destination": {
        "stop_id": "WELL1", 
        "name": "WELL - Express"
      },
      "delay": "PT1H45M40S",
      "vehicle_id": "4081",
      "name": "PetoneStn",
      "arrival": {
        "aimed": "2025-08-07T11:57:00+12:00",
        "expected": "2025-08-07T13:42:40+12:00"
      },
      "departure": {
        "aimed": "2025-08-07T11:57:00+12:00", 
        "expected": "2025-08-07T13:42:40+12:00"
      },
      "status": "delayed",
      "monitored": true,
      "wheelchair_accessible": true,
      "trip_id": "WRL__1__1607__RAIL__Rail_MTuWThF-XHol_20250720"
    }
  ]
}
```

## Key Fields for Our App

### Essential Fields:
- **`service_id`**: "WRL" for Wairarapa line
- **`direction`**: "inbound" (to Wellington) or "outbound" (from Wellington)
- **`origin.name`**: Starting station
- **`destination.name`**: End station  
- **`departure.aimed`**: Scheduled departure time
- **`departure.expected`**: Real-time expected departure (if available)
- **`status`**: null, "delayed", "canceled", etc.
- **`delay`**: ISO 8601 duration format (PT1H45M40S = 1 hour 45 minutes 40 seconds)
- **`monitored`**: Whether real-time tracking is available

### Status Interpretation:
- **`status: null`**: On time
- **`status: "delayed"`**: Train is delayed (check `delay` field)
- **`status: "canceled"`**: Service canceled
- **`expected: null`**: Use `aimed` time (no real-time data)
- **`expected: present`**: Use `expected` time (real-time update available)

## Direction Logic
- **Inbound (`direction: "inbound"`)**: Trains heading TO Wellington (from Masterton/Featherston)
- **Outbound (`direction: "outbound"`)**: Trains heading FROM Wellington (to Masterton)

## Station Names Mapping
- **Wellington Station**: "WgtnStn" (origin) / "WELL - Express" (destination)
- **Petone Station**: "PetoneStn"
- **Masterton Station**: "MastertonStn" (origin) / "MAST - Express" (destination)

## Sample API Calls

### Get Petone Departures:
```bash
curl -H "x-api-key: YOUR_API_KEY" \
"https://api.opendata.metlink.org.nz/v1/stop-predictions?stop_id=PETO"
```

### Get Wellington Departures:
```bash
curl -H "x-api-key: YOUR_API_KEY" \
"https://api.opendata.metlink.org.nz/v1/stop-predictions?stop_id=WELL"
```

### Filter for WRL Only:
```bash
curl -H "x-api-key: YOUR_API_KEY" \
"https://api.opendata.metlink.org.nz/v1/stop-predictions?stop_id=PETO" | \
jq '.departures[] | select(.service_id == "WRL")'
```

## Real-Time Features Observed

1. **Live Delays**: API provides real-time delay information in ISO 8601 format
2. **Vehicle Tracking**: Some services have `vehicle_id` for live tracking
3. **Expected Times**: Real-time expected arrival/departure times when monitored
4. **Status Updates**: Services can be marked as delayed, canceled, etc.

## Implementation Notes for React App

1. **Polling Frequency**: Refresh every 30-60 seconds for real-time updates
2. **Error Handling**: Handle cases where API is unavailable or returns errors
3. **Time Display**: Convert ISO 8601 times to user-friendly format
4. **Delay Parsing**: Parse ISO 8601 duration (PT1H45M40S) to readable format
5. **Filtering**: Filter departures by `service_id === "WRL"` for Wairarapa line only
6. **Direction Display**: Show clear direction indicators (To Wellington / From Wellington)

## Testing Results Summary

✅ **API Access**: Successfully connected with provided API key
✅ **Wairarapa Data**: Found WRL services with real-time data
✅ **Station Data**: Confirmed Wellington (WELL) and Petone (PETO) station IDs
✅ **Real-time Features**: Observed delays, expected times, and status updates
✅ **Data Quality**: Comprehensive departure information available

**Next Steps**: Need to research Featherston station ID and test API calls for that station.