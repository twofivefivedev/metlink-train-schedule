/**
 * Analytics Page
 * Displays service incidents analytics and API performance metrics
 */

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const IncidentsDashboard = dynamic(
  () =>
    import('@/components/IncidentsDashboard').then((mod) => ({
      default: mod.IncidentsDashboard,
    })),
  {
    ssr: false,
    loading: () => <AnalyticsDashboardSkeleton />,
  }
);

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
                  View service incidents (cancellations, delays, bus replacements) and API performance metrics
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
                  <Link href="/docs">API Docs</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <Suspense fallback={<AnalyticsDashboardSkeleton />}>
            <IncidentsDashboard />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 border-2 border-dashed border-black/30 dark:border-white/30" />
      <div className="h-64 border-2 border-dashed border-black/30 dark:border-white/30" />
      <div className="h-48 border-2 border-dashed border-black/30 dark:border-white/30" />
    </div>
  );
}

