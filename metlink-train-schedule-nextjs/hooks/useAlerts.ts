/**
 * Hook to check for alerts on favorite routes
 */

import { useEffect, useState } from 'react';
import { loadPreferences } from '@/lib/utils/favorites';
import { getAlertsForFavorites } from '@/lib/utils/alertUtils';
import { useCurrentTime } from './useWaitTime';
import type { Departure } from '@/types';
import type { AlertCondition } from '@/lib/utils/alertUtils';

interface DeparturesData {
  inbound: Departure[];
  outbound: Departure[];
}

export function useAlerts(departures: DeparturesData): AlertCondition[] {
  const [alerts, setAlerts] = useState<AlertCondition[]>([]);
  const currentTime = useCurrentTime();

  useEffect(() => {
    const preferences = loadPreferences();
    if (!preferences.alerts.enabled || preferences.favorites.length === 0) {
      setAlerts([]);
      return;
    }

    const allDepartures = [...departures.inbound, ...departures.outbound];
    const alertConditions = getAlertsForFavorites(
      allDepartures,
      preferences.favorites,
      preferences.alerts,
      currentTime
    );

    setAlerts(alertConditions);

    // Show browser notifications for new alerts
    if (alertConditions.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
      alertConditions.forEach(condition => {
        const notification = new Notification('Metlink Alert', {
          body: condition.message,
          icon: '/favicon.ico',
          tag: condition.departure.service_id, // Prevent duplicate notifications
        });

        // Also try service worker notification if available
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: 'Metlink Alert',
            options: {
              body: condition.message,
              icon: '/favicon.ico',
              tag: condition.departure.service_id,
            },
          });
        }
      });
    }
  }, [departures, currentTime]);

  return alerts;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

