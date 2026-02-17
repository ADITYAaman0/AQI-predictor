'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * Offline Indicator Component
 * 
 * Displays a banner when the user is offline and shows when
 * they come back online. Also indicates when using cached data.
 * 
 * Requirements:
 * - 20.5: Show offline state clearly to users
 * 
 * Properties tested:
 * - Property 45: Offline Asset Caching
 * - Property 46: Offline Request Queueing
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      
      // Hide "Back Online" message after 3 seconds
      setTimeout(() => {
        setShowBackOnline(false);
      }, 3000);

      // Notify service worker to sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_NOW'
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white px-4 py-3 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
              <WifiOff className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 text-center">
                <p className="font-medium text-sm sm:text-base">
                  <span className="font-bold">Offline Mode</span>
                  {' - '}
                  Showing cached data. Changes will sync when you're back online.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {isOnline && showBackOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
              <Wifi className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 text-center">
                <p className="font-medium text-sm sm:text-base">
                  <span className="font-bold">Back Online</span>
                  {' - '}
                  Syncing your data now...
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
