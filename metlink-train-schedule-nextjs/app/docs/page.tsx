/**
 * API Documentation Page
 * Displays OpenAPI documentation
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <main id="main-content" role="main">
        {/* Header Section */}
        <div className="border-b-2 border-black dark:border-white bg-white dark:bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold uppercase text-black dark:text-white mb-2">
                  API Documentation
                </h1>
                <p className="text-black/80 dark:text-white/80">
                  Metlink Train Schedule API v1
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  asChild
                  variant="outline"
                  className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
                >
                  <Link href="/">Back to Schedule</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
                >
                  <Link href="/analytics">Analytics</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="space-y-6">
            {/* Base URL Section */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
              <div className="p-6 border-b-2 border-black dark:border-white">
                <h2 className="font-bold text-lg uppercase mb-1">Base URL</h2>
              </div>
              <div className="p-6">
                <code className="bg-black dark:bg-white text-white dark:text-black px-3 py-2 font-mono text-sm border-2 border-black dark:border-white">
                  /api/v1
                </code>
              </div>
            </div>

            {/* Endpoints Section */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
              <div className="p-6 border-b-2 border-black dark:border-white">
                <h2 className="font-bold text-lg uppercase mb-1">Endpoints</h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Departures Endpoint */}
                <div>
                  <h3 className="text-xl font-bold uppercase mb-2 text-black dark:text-white">GET /departures</h3>
                  <p className="text-black/80 dark:text-white/80 mb-3">
                    Get train departures for specified stations and line.
                  </p>
                  <div className="bg-black dark:bg-white text-white dark:text-black p-4 border-2 border-black dark:border-white">
                    <p className="font-mono text-sm mb-2 font-bold uppercase">Query Parameters:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">stations</code> (optional): Comma-separated station codes</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">line</code> (optional): Line code (WRL, KPL, HVL, JVL), defaults to WRL</li>
                    </ul>
                  </div>
                </div>

                {/* Performance Endpoint */}
                <div>
                  <h3 className="text-xl font-bold uppercase mb-2 text-black dark:text-white">GET /analytics/performance</h3>
                  <p className="text-black/80 dark:text-white/80 mb-3">
                    Get API performance statistics.
                  </p>
                  <div className="bg-black dark:bg-white text-white dark:text-black p-4 border-2 border-black dark:border-white">
                    <p className="font-mono text-sm mb-2 font-bold uppercase">Query Parameters:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">endpoint</code> (optional): Filter by endpoint</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">startDate</code> (optional): Start date (ISO 8601)</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">endDate</code> (optional): End date (ISO 8601)</li>
                    </ul>
                  </div>
                </div>

                {/* Incidents Summary Endpoint */}
                <div>
                  <h3 className="text-xl font-bold uppercase mb-2 text-black dark:text-white">GET /analytics/incidents/summary</h3>
                  <p className="text-black/80 dark:text-white/80 mb-3">
                    Get summary statistics for service incidents (cancellations, delays, bus replacements).
                  </p>
                  <div className="bg-black dark:bg-white text-white dark:text-black p-4 border-2 border-black dark:border-white">
                    <p className="font-mono text-sm mb-2 font-bold uppercase">Query Parameters:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">serviceId</code> (optional): Service ID filter (WRL, KPL, HVL, JVL)</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">startDate</code> (optional): Start date (ISO 8601), defaults to 7 days ago</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">endDate</code> (optional): End date (ISO 8601), defaults to now</li>
                    </ul>
                  </div>
                </div>

                {/* Recent Incidents Endpoint */}
                <div>
                  <h3 className="text-xl font-bold uppercase mb-2 text-black dark:text-white">GET /analytics/incidents/recent</h3>
                  <p className="text-black/80 dark:text-white/80 mb-3">
                    Get recent service incidents with details.
                  </p>
                  <div className="bg-black dark:bg-white text-white dark:text-black p-4 border-2 border-black dark:border-white">
                    <p className="font-mono text-sm mb-2 font-bold uppercase">Query Parameters:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">serviceId</code> (optional): Service ID filter</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">stopId</code> (optional): Stop ID filter</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">station</code> (optional): Station code filter</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">incidentType</code> (optional): Filter by type (cancelled, delayed, bus_replacement)</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">startDate</code> (optional): Start date (ISO 8601), defaults to 7 days ago</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">endDate</code> (optional): End date (ISO 8601), defaults to now</li>
                      <li><code className="bg-black/20 dark:bg-white/20 px-1">limit</code> (optional): Maximum records (default: 100)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Format Section */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
              <div className="p-6 border-b-2 border-black dark:border-white">
                <h2 className="font-bold text-lg uppercase mb-1">Response Format</h2>
              </div>
              <div className="p-6">
                <div className="bg-black dark:bg-white text-white dark:text-black p-4 border-2 border-black dark:border-white">
                  <pre className="text-sm overflow-x-auto font-mono">
{`{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    // Metadata (cached, cacheAge, version, etc.)
  }
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* OpenAPI Specification Section */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
              <div className="p-6 border-b-2 border-black dark:border-white">
                <h2 className="font-bold text-lg uppercase mb-1">OpenAPI Specification</h2>
              </div>
              <div className="p-6">
                <p className="text-black/80 dark:text-white/80 mb-2">
                  Full OpenAPI 3.0 specification is available at:{' '}
                  <a href="/docs/openapi.yaml" className="text-black dark:text-white underline font-semibold hover:text-black/80 dark:hover:text-white/80">
                    /docs/openapi.yaml
                  </a>
                </p>
              </div>
            </div>

            {/* Versioning Section */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
              <div className="p-6 border-b-2 border-black dark:border-white">
                <h2 className="font-bold text-lg uppercase mb-1">Versioning</h2>
              </div>
              <div className="p-6 space-y-2">
                <p className="text-black/80 dark:text-white/80">
                  The API uses URL-based versioning. Current version is <code className="bg-black dark:bg-white text-white dark:text-black px-1">v1</code>.
                </p>
                <p className="text-black/80 dark:text-white/80">
                  Legacy endpoints (e.g., <code className="bg-black dark:bg-white text-white dark:text-black px-1">/api/wairarapa-departures</code>) are deprecated
                  and will redirect to versioned endpoints. Please migrate to <code className="bg-black dark:bg-white text-white dark:text-black px-1">/api/v1/departures</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

