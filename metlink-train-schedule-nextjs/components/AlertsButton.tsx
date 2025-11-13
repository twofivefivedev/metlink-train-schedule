'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Bell, BellOff, X } from 'lucide-react';
import {
  loadPreferences,
  updateAlertPreferences,
  type AlertPreferences,
} from '@/lib/utils/favorites';

export function AlertsButton() {
  const [preferences, setPreferences] = useState(loadPreferences());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setPreferences(loadPreferences());
  }, []);

  const handleToggleAlerts = () => {
    const newAlerts: AlertPreferences = {
      ...preferences.alerts,
      enabled: !preferences.alerts.enabled,
    };
    updateAlertPreferences(newAlerts);
    setPreferences(loadPreferences());
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        aria-label="Alerts"
        className={`bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-[42px] px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white ${
          preferences.alerts.enabled ? 'ring-2 ring-black dark:ring-white ring-offset-2' : ''
        }`}
      >
        {preferences.alerts.enabled ? (
          <Bell className="h-4 w-4 fill-current" aria-hidden="true" />
        ) : (
          <BellOff className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute z-20 right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white dark:bg-black border-2 border-black dark:border-white">
            <div className="p-4 border-b-2 border-black dark:border-white flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white">
                Alert Notifications
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between p-3 border-2 border-black dark:border-white">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-1">
                    Enable Alerts
                  </h4>
                  <p className="text-xs text-black/70 dark:text-white/70">
                    Get notified about delays, cancellations, and approaching trains for your saved configurations
                  </p>
                </div>
                <Button
                  onClick={handleToggleAlerts}
                  variant="outline"
                  size="sm"
                  aria-label={preferences.alerts.enabled ? 'Disable alerts' : 'Enable alerts'}
                  className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-8 px-4"
                >
                  {preferences.alerts.enabled ? (
                    <>
                      <Bell className="h-4 w-4 mr-2 fill-current" aria-hidden="true" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <BellOff className="h-4 w-4 mr-2" aria-hidden="true" />
                      Disabled
                    </>
                  )}
                </Button>
              </div>
              {preferences.alerts.enabled && (
                <div className="text-xs text-black/70 dark:text-white/70 p-3 border-2 border-black dark:border-white">
                  <p className="mb-2 font-semibold">Alert Settings:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Delays: {preferences.alerts.notifyOnDelay ? 'On' : 'Off'}</li>
                    <li>Cancellations: {preferences.alerts.notifyOnCancellation ? 'On' : 'Off'}</li>
                    <li>Approaching trains: {preferences.alerts.notifyOnApproaching ? `On (${preferences.alerts.approachingMinutes} min)` : 'Off'}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

