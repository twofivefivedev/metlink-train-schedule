import React from 'react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { cn } from '../lib/utils';

export function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-8">
      <div className="text-center space-y-2">
        <div className="h-10 w-64 bg-muted rounded-md mx-auto animate-pulse" />
        <div className="h-5 w-96 bg-muted rounded-md mx-auto animate-pulse" />
      </div>

      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-8 w-48 bg-muted rounded-md animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded-md animate-pulse mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex justify-between items-center p-4 border-b border-border">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-24 bg-muted rounded-md animate-pulse" />
                    <div className="h-4 w-32 bg-muted rounded-md animate-pulse" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded-md animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

