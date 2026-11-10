import { useState, useEffect, useCallback } from 'react';
import { MOCK_SEED_INCIDENTS } from '../data/mockSeedData';
import { playEmergencyAlert } from '../utils/audioAlert';

const STORAGE_KEY = 'emergency_incidents';

export function useIncidents() {
  const [incidents, setIncidents] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Bootstrap with initial demo incidents if empty
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_SEED_INCIDENTS));
      return MOCK_SEED_INCIDENTS;
    } catch (err) {
      console.error('Error reading localStorage emergency_incidents:', err);
      return MOCK_SEED_INCIDENTS;
    }
  });

  // Save to localStorage whenever incidents change
  const saveIncidents = useCallback((updated) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setIncidents(updated);
      // Dispatch custom window event so other tabs/listeners update immediately
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  }, []);

  // Sync across tabs or external updates
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setIncidents(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed syncing storage:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 1. Add Incident
  const addIncident = useCallback((incidentData) => {
    const now = Date.now();
    const newIncident = {
      id: `INC-${now}`,
      created_at_ms: now,
      created_at: new Date(now).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      status: 'Reported',
      ...incidentData
    };

    setIncidents(prev => {
      const updated = [newIncident, ...prev];
      saveIncidents(updated);
      return updated;
    });

    // Sound alert
    playEmergencyAlert(newIncident.severity);

    return newIncident;
  }, [saveIncidents]);

  // 2. Merge into Cluster Group (Spatial 300m grouping)
  const mergeClusterIncident = useCallback((targetId, mergedFields = {}) => {
    let result = null;
    setIncidents(prev => {
      const updated = prev.map(inc => {
        if (inc.id === targetId) {
          result = { ...inc, ...mergedFields };
          return result;
        }
        return inc;
      });
      saveIncidents(updated);
      return updated;
    });

    // Escalation alert sound
    playEmergencyAlert('High');

    return result;
  }, [saveIncidents]);

  // 3. Update Status and/or Incident Fields (dispatch, team assignment, resolution proof, notes)
  const updateStatus = useCallback((id, newStatus, additionalFields = {}) => {
    setIncidents(prev => {
      const updated = prev.map(inc => inc.id === id ? { ...inc, status: newStatus, ...additionalFields } : inc);
      saveIncidents(updated);
      return updated;
    });
  }, [saveIncidents]);

  // 3. Delete Incident
  const deleteIncident = useCallback((id) => {
    setIncidents(prev => {
      const updated = prev.filter(inc => inc.id !== id);
      saveIncidents(updated);
      return updated;
    });
  }, [saveIncidents]);

  // 4. Reset to Seed Data
  const resetSeedData = useCallback(() => {
    saveIncidents(MOCK_SEED_INCIDENTS);
  }, [saveIncidents]);

  // Computed KPI Metrics for the 4-stage lifecycle
  const stats = {
    total: incidents.length,
    critical: incidents.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length,
    totalCritical: incidents.filter(i => i.severity === 'Critical').length,
    reported: incidents.filter(i => i.status === 'Reported').length,
    assigned: incidents.filter(i => i.status === 'Assigned' || i.status === 'Dispatched').length,
    in_progress: incidents.filter(i => i.status === 'In Progress').length,
    resolved: incidents.filter(i => i.status === 'Resolved').length
  };

  return {
    incidents,
    addIncident,
    mergeClusterIncident,
    updateStatus,
    deleteIncident,
    resetSeedData,
    stats
  };
}
