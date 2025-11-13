/**
 * Analytics Page
 * Displays performance metrics and on-time performance statistics
 */

import { HistoricalTrends } from '@/components/HistoricalTrends';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <main id="main-content" role="main">
        {/* Header Section */}
        <div className="border-b-2 border-black dark:border-white bg-white dark:bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold uppercase text-black dark:text-white mb-2">
                  Analytics & Performance
                </h1>
                <p className="text-black/80 dark:text-white/80">
                  View performance metrics, on-time statistics, and historical data
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
                  <Link href="/historical">Historical Data</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
                >
                  <Link href="/docs">API Docs</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <HistoricalTrends />
        </div>
      </main>
    </div>
  );
}

