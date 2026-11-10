/**
 * Offline Mesh Relay & Sync Queue — Disaster Resilience
 * 
 * When network is offline (e.g., cell towers damaged in a storm/flood),
 * incident reports are stored in localStorage under `offline_mesh_queue`.
 * When connectivity restores, the queue is automatically flushed and
 * all pending reports are submitted to the Admin Command Hub.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const OFFLINE_QUEUE_KEY = 'offline_mesh_queue';

export function useOfflineQueue(onSubmitReport) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queuedCount, setQueuedCount] = useState(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (_) {}
    return 0;
  });
  const [lastFlushMessage, setLastFlushMessage] = useState('');
  const flushingRef = useRef(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-flush when we come back online
      flushQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Enqueue a report for later submission (when offline)
   */
  const enqueueReport = useCallback((reportData) => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = stored ? JSON.parse(stored) : [];
      const entry = {
        ...reportData,
        queued_at: Date.now(),
        queued_at_display: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };
      queue.push(entry);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      setQueuedCount(queue.length);
      return entry;
    } catch (err) {
      console.error('Failed to enqueue offline report:', err);
      return null;
    }
  }, []);

  /**
   * Flush the offline queue: submit all pending reports
   */
  const flushQueue = useCallback(() => {
    if (flushingRef.current) return;

    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!stored) return;

      const queue = JSON.parse(stored);
      if (!Array.isArray(queue) || queue.length === 0) return;

      flushingRef.current = true;
      let submitted = 0;

      queue.forEach((report) => {
        if (onSubmitReport) {
          // Remove queue metadata before submitting
          const { queued_at, queued_at_display, ...reportData } = report;
          onSubmitReport(reportData);
          submitted++;
        }
      });

      // Clear the queue
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      setQueuedCount(0);
      flushingRef.current = false;

      if (submitted > 0) {
        const msg = `📡 Network Restored — ${submitted} queued emergency report${submitted > 1 ? 's' : ''} auto-transmitted to Admin Command Hub.`;
        setLastFlushMessage(msg);
        // Clear flush message after 8 seconds
        setTimeout(() => setLastFlushMessage(''), 8000);
      }
    } catch (err) {
      console.error('Failed to flush offline queue:', err);
      flushingRef.current = false;
    }
  }, [onSubmitReport]);

  /**
   * Manually trigger flush (e.g., a "Retry" button)
   */
  const manualFlush = useCallback(() => {
    if (isOnline) {
      flushQueue();
    }
  }, [isOnline, flushQueue]);

  /**
   * Clear the queue without submitting
   */
  const clearQueue = useCallback(() => {
    try {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      setQueuedCount(0);
    } catch (_) {}
  }, []);

  return {
    isOnline,
    queuedCount,
    lastFlushMessage,
    enqueueReport,
    flushQueue,
    manualFlush,
    clearQueue
  };
}

