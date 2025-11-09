import React from 'react';

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="border-b-2 border-black pb-4 mb-8">
          <div className="h-8 w-64 bg-black/10 rounded animate-pulse" />
        </div>
        
        <div className="bg-white border-2 border-black">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 border-b-2 border-black px-6 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-black/10 rounded animate-pulse" />
            ))}
          </div>
          
          {/* Rows */}
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="grid grid-cols-4 gap-4 px-6 py-4 border-b-2 border-black">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-5 bg-black/10 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
