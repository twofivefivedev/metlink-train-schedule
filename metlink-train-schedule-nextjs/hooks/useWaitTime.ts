/**
 * Hook to get current time for wait time calculations
 * Updates every minute to keep wait times accurate
 */

import { useState, useEffect } from 'react';

export function useCurrentTime(): Date {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return currentTime;
}

