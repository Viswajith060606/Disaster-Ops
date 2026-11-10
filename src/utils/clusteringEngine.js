/**
 * DISASTER-OPS Spatial Incident Clustering Engine (300m Radius)
 * 
 * Automatically detects and groups emergency reports submitted within 300 meters
 * (0.3 km) of an active incident in the same emergency category.
 * 
 * Features:
 * 1. 300m Haversine radius grouping against active incidents (Reported, Assigned, In Progress).
 * 2. Merges multi-caller submissions into a unified Cluster Group.
 * 3. Increments clusterCount (e.g., "3 Reports Received for this Site").
 * 4. Boosts Priority Score by +15 points for each additional report in the cluster.
 * 5. High-Density Cluster surge protocol (clusterCount >= 3):
 *    - Automatically scales responder allocation to Multi-Unit Fleets (e.g., 2 Ambulances + 1 Fire Tender).
 *    - Triggers priority auto-dispatch and displays high-visibility alert badges.
 */
import { calculateHaversineDistance } from './prioritizer';
import { rankTeamsForIncident, getGoogleMapsDirectionsUrl } from '../data/teams';

export const CLUSTER_RADIUS_KM = 0.3; // 300 meters

/**
 * Normalizes category names to standard classification groups
 * to ensure robust matching across voice/form variations.
 */
export function normalizeCategory(category = '') {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('fire')) return 'Fire Emergency';
  if (cat.includes('collapse') || cat.includes('structural')) return 'Building Collapse';
  if (cat.includes('accident') || cat.includes('crash') || cat.includes('traffic') || cat.includes('vehicle')) return 'Road Accident';
  if (cat.includes('flood') || cat.includes('water')) return 'Flood';
  if (cat.includes('med') || cat.includes('cardiac') || cat.includes('health') || cat.includes('trauma')) return 'Medical Emergency';
  return 'Other Emergencies';
}

/**
 * Checks if a new incident falls within 300m of any active (unresolved) incident in the same category.
 * Returns { matchedIncident, distanceKm } or null.
 */
export function findClusterMatch(newIncident, existingIncidents = []) {
  if (!newIncident) return null;
  const newLat = newIncident.latitude;
  const newLng = newIncident.longitude;
  if (newLat == null || newLng == null) return null;

  const newNormCat = normalizeCategory(newIncident.category);
  const activeIncidents = existingIncidents.filter(inc => inc.status !== 'Resolved');

  for (const inc of activeIncidents) {
    if (inc.latitude == null || inc.longitude == null) continue;
    // Don't match self if re-evaluating
    if (inc.id && newIncident.id && inc.id === newIncident.id) continue;

    const existingNormCat = normalizeCategory(inc.category);
    if (newNormCat === existingNormCat) {
      const distance = calculateHaversineDistance(newLat, newLng, inc.latitude, inc.longitude);
      if (distance <= CLUSTER_RADIUS_KM) {
        return {
          matchedIncident: inc,
          distanceKm: Math.round(distance * 1000) / 1000 // rounded in km
        };
      }
    }
  }

  return null;
}

/**
 * Merges a newly submitted report into an existing incident cluster:
 * - Appends sub-report to clusterReports
 * - Updates clusterCount
 * - Recomputes casualties
 * - If clusterCount >= 3, triggers Multi-Unit Fleet surge dispatch
 */
export function buildClusterMergePayload(matchedIncident, newReport, teams = []) {
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const existingCount = matchedIncident.clusterCount || 1;
  const newClusterCount = existingCount + 1;

  // Initialize clusterReports if not already present
  const existingReports = Array.isArray(matchedIncident.clusterReports) && matchedIncident.clusterReports.length > 0
    ? [...matchedIncident.clusterReports]
    : [
        {
          id: `${matchedIncident.id}-R1`,
          caller_name: 'Caller #1 (Primary)',
          contact_info: matchedIncident.contact_info || 'Primary Caller',
          title: matchedIncident.title,
          description: matchedIncident.description,
          photo_url: matchedIncident.photo_url || null,
          voiceAudioUrl: matchedIncident.voiceAudioUrl || matchedIncident.audio_url || null,
          audio_url: matchedIncident.voiceAudioUrl || matchedIncident.audio_url || null,
          timestamp: matchedIncident.created_at || timestamp,
          people_affected: matchedIncident.people_affected || 1
        }
      ];

  // Append new caller report
  const newCallerEntry = {
    id: `${matchedIncident.id}-R${newClusterCount}`,
    caller_name: `Caller #${newClusterCount}`,
    contact_info: newReport.contact_info || `Caller ${newClusterCount}`,
    title: newReport.title || `Supplemental Report #${newClusterCount}`,
    description: newReport.description || '',
    photo_url: newReport.photo_url || null,
    voiceAudioUrl: newReport.voiceAudioUrl || newReport.audio_url || null,
    audio_url: newReport.voiceAudioUrl || newReport.audio_url || null,
    timestamp,
    people_affected: newReport.people_affected || 1
  };
  const updatedClusterReports = [...existingReports, newCallerEntry];

  // Calculate cumulative casualties
  const addedCasualties = Number(newReport.people_affected || 0);
  const updatedCasualties = (matchedIncident.people_affected || 1) + addedCasualties;

  const isHighDensity = newClusterCount >= 3;

  // Surge Multi-Unit Fleet Dispatch logic for high-density clusters
  let surgeDispatch = null;
  let dispatchedTeamIds = [];
  let updatedDispatchedUnits = Array.isArray(matchedIncident.dispatched_units)
    ? [...matchedIncident.dispatched_units]
    : [];

  if (isHighDensity) {
    // Rank available teams for this incident
    const rankedTeams = rankTeamsForIncident(matchedIncident, teams);
    const availableTeams = rankedTeams.filter(t => t.isAvailable);

    // Pick up to 2-3 available units to form the multi-unit fleet
    const fleetUnits = availableTeams.slice(0, 2);
    if (fleetUnits.length > 0) {
      dispatchedTeamIds = fleetUnits.map(u => u.id);
      const fleetNames = fleetUnits.map(u => `${u.name} (${u.callSign})`);
      
      // Merge unique unit names
      const unitSet = new Set([...updatedDispatchedUnits, ...fleetNames]);
      updatedDispatchedUnits = Array.from(unitSet);

      const leadTeam = fleetUnits[0];
      surgeDispatch = {
        fleetUnits,
        dispatchedTeamIds,
        assigned_team_id: leadTeam.id,
        assigned_team_name: fleetNames.join(' + '),
        assigned_team_callsign: fleetUnits.map(u => u.callSign).join(' / '),
        assigned_distance_km: leadTeam.distanceKm,
        assigned_eta_mins: leadTeam.etaMinutes,
        assigned_route_url: getGoogleMapsDirectionsUrl(leadTeam, matchedIncident),
        toastMessage: `⚠️ HIGH-DENSITY CLUSTER (${newClusterCount} Callers at same 300m site) — Multi-Unit Fleet Dispatched: ${fleetNames.join(' + ')}`
      };
    }
  }

  const mergedFields = {
    clusterCount: newClusterCount,
    is_cluster_group: true,
    clusterReports: updatedClusterReports,
    people_affected: updatedCasualties,
    last_cluster_update_at: timestamp,
    // Keep photo if original didn't have one
    photo_url: matchedIncident.photo_url || newReport.photo_url || null,
    // Keep audio if original didn't have one
    voiceAudioUrl: matchedIncident.voiceAudioUrl || newReport.voiceAudioUrl || matchedIncident.audio_url || newReport.audio_url || null,
    audio_url: matchedIncident.voiceAudioUrl || newReport.voiceAudioUrl || matchedIncident.audio_url || newReport.audio_url || null,
    ...(surgeDispatch ? {
      status: matchedIncident.status === 'Reported' ? 'Assigned' : matchedIncident.status,
      assigned_team_id: surgeDispatch.assigned_team_id,
      assigned_team_name: surgeDispatch.assigned_team_name,
      assigned_team_callsign: surgeDispatch.assigned_team_callsign,
      assigned_distance_km: surgeDispatch.assigned_distance_km,
      assigned_eta_mins: surgeDispatch.assigned_eta_mins,
      assigned_route_url: surgeDispatch.assigned_route_url,
      dispatched_units: updatedDispatchedUnits,
      multi_unit_fleet: true,
      high_density_cluster: true,
      assigned_at: timestamp
    } : {
      high_density_cluster: isHighDensity
    })
  };

  const toastMessage = surgeDispatch
    ? surgeDispatch.toastMessage
    : `📍 SPATIAL CLUSTER DETECTED: Caller report merged into existing site (${newClusterCount} callers within 300m radius)`;

  return {
    targetId: matchedIncident.id,
    newClusterCount,
    isHighDensity,
    mergedFields,
    toastMessage,
    dispatchedTeamIds
  };
}

