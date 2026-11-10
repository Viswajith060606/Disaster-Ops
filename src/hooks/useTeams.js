import { useState, useEffect, useCallback } from 'react';
import { PRESEEDED_TEAMS } from '../data/teams';

const TEAMS_STORAGE_KEY = 'disaster_ops_teams';

export function useTeams() {
  const [teams, setTeams] = useState(() => {
    try {
      const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 4) {
          return parsed;
        }
      }
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(PRESEEDED_TEAMS));
      return PRESEEDED_TEAMS;
    } catch (err) {
      console.error('Error reading localStorage disaster_ops_teams:', err);
      return PRESEEDED_TEAMS;
    }
  });

  const saveTeams = useCallback((updated) => {
    try {
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(updated));
      setTeams(updated);
      window.dispatchEvent(new Event('teams_storage'));
    } catch (err) {
      console.error('Error saving teams to localStorage:', err);
    }
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
        if (stored) {
          setTeams(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed syncing teams storage:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('teams_storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('teams_storage', handleStorageChange);
    };
  }, []);

  // Assign team to incident
  const assignTeam = useCallback((teamId, incidentId) => {
    setTeams(prev => {
      const updated = prev.map(t => {
        if (t.id === teamId || t.callSign === teamId) {
          return {
            ...t,
            status: 'Busy',
            assigned_incident_id: incidentId
          };
        }
        return t;
      });
      saveTeams(updated);
      return updated;
    });
  }, [saveTeams]);

  // Assign multiple teams to an incident (Multi-Unit Fleet Surge for clusters)
  const assignMultipleTeams = useCallback((teamIds = [], incidentId) => {
    if (!teamIds || teamIds.length === 0) return;
    setTeams(prev => {
      const updated = prev.map(t => {
        if (teamIds.includes(t.id) || teamIds.includes(t.callSign)) {
          return {
            ...t,
            status: 'Busy',
            assigned_incident_id: incidentId
          };
        }
        return t;
      });
      saveTeams(updated);
      return updated;
    });
  }, [saveTeams]);

  // Release a specific team back to Available
  const releaseTeam = useCallback((teamId) => {
    setTeams(prev => {
      const updated = prev.map(t => {
        if (t.id === teamId || t.callSign === teamId) {
          return {
            ...t,
            status: 'Available',
            assigned_incident_id: null
          };
        }
        return t;
      });
      saveTeams(updated);
      return updated;
    });
  }, [saveTeams]);

  // Release any team assigned to a specific incident ID
  const releaseTeamByIncident = useCallback((incidentId) => {
    if (!incidentId) return;
    setTeams(prev => {
      const updated = prev.map(t => {
        if (t.assigned_incident_id === incidentId) {
          return {
            ...t,
            status: 'Available',
            assigned_incident_id: null
          };
        }
        return t;
      });
      saveTeams(updated);
      return updated;
    });
  }, [saveTeams]);

  // Reset teams back to pre-seeded state
  const resetTeams = useCallback(() => {
    saveTeams(PRESEEDED_TEAMS);
  }, [saveTeams]);

  return {
    teams,
    assignTeam,
    assignMultipleTeams,
    releaseTeam,
    releaseTeamByIncident,
    resetTeams
  };
}

