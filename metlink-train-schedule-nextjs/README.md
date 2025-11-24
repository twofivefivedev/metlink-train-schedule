# Wairarapa Train Schedule

A Next.js 14 TypeScript application for displaying real-time train departures for the Wairarapa line (Wellington, Petone, and Featherston).

## Features

- Real-time train departure information
- Auto-refreshing schedule (every 2 minutes)
- Responsive design (mobile and desktop)
- Service status indicators
- Bus replacement notifications
- Delay information

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Sketchpad theme)
- **API**: Next.js API Routes
- **HTTP Client**: Axios (server-side), Fetch (client-side)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Metlink API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd metlink-train-schedule-nextjs
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
METLINK_API_KEY=your_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `METLINK_API_KEY` | Metlink Open Data API key | Yes | - |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | Yes | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | Yes | - |
| `API_TIMEOUT_MS` | API request timeout in milliseconds | No | 10000 |
| `CACHE_DURATION_MS` | Cache duration in milliseconds | No | 60000 |
| `LOG_LEVEL` | Logging level (ERROR, WARN, INFO, DEBUG) | No | INFO |
| `NEXT_PUBLIC_API_BASE` | Public API base URL | No | "" (same-origin) |

## Project Structure

```
metlink-train-schedule-nextjs/
├── app/
│   ├── api/              # API routes
│   │   ├── wairarapa-departures/
│   │   ├── station/[stationId]/
│   │   └── health/
│   ├── globals.css       # Global styles with Sketchpad theme
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── DepartureRow.tsx
│   ├── DirectionTable.tsx
│   └── LoadingSkeleton.tsx
├── hooks/
│   └── useTrainSchedule.ts
├── lib/
│   ├── api/              # API client
│   ├── server/           # Server utilities
│   ├── utils/            # Shared utilities
│   └── constants.ts      # Application constants
├── types/
│   └── index.ts          # TypeScript type definitions
└── public/               # Static assets
```

## API Routes

### GET `/api/wairarapa-departures`
Returns all Wairarapa line departures (inbound and outbound).

**Response:**
```json
{
  "success": true,
  "data": {
    "inbound": [...],
    "outbound": [...],
    "total": 10
  },
  "meta": {
    "cached": false
  }
}
```

### GET `/api/station/[stationId]`
Returns departures for a specific station (WELL, PETO, FEAT).

**Response:**
```json
{
  "success": true,
  "data": {
    "station": "WELL",
    "departures": [...],
    "total": 5
  }
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "cache": {...}
  }
}
```

## Building for Production

```bash
npm run build
npm start
```

## Deployment

This application is designed to be deployed on Vercel. The API routes will automatically be converted to serverless functions.

### Vercel Deployment

1. Push your code to a Git repository
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Migration from CRA + Express

This project replaces the previous Create React App frontend and Express backend with a unified Next.js application. Key changes:

- **Unified codebase**: Frontend and backend in one Next.js project
- **TypeScript**: Full type safety across the application
- **App Router**: Using Next.js 14 App Router instead of Pages Router
- **API Routes**: Express routes migrated to Next.js API routes
- **Server Components**: Leveraging Next.js server components where applicable

## License

ISC
