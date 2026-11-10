/**
 * DISASTER-OPS Automated Dispatch Engine
 * 
 * Auto-dispatches the nearest matching & available sector team
 * for any incident that is High/Critical severity or has a Priority Score >= 35.
 * 
 * Lower severity incidents (Medium/Low with score < 35) remain in "Reported"
 * status for manual admin dispatch approval.
 */
import { calculatePriorityScore, calculateHaversineDistance, estimateArrivalTimeMinutes } from './prioritizer';
import { rankTeamsForIncident, getGoogleMapsDirectionsUrl } from '../data/teams';

/**
 * Determines whether an incident qualifies for automated dispatch
 */
/**
 * Determines whether an incident qualifies for automated dispatch.
 *
 * An incident is auto‑dispatch eligible when its severity is "High" or "Critical",
 * or when its calculated priority score meets the threshold of 35.
 *
 * @param {Object} incident - The incident object.
 * @param {string} [incident.severity] - Severity string (Low, Medium, High, Critical).
 * @returns {boolean} True if auto‑dispatch should run.
 */
export function shouldAutoDispatch(incident) {
  if (!incident) return false;

  const severity = (incident.severity || '').toLowerCase();
  const isHighOrCritical = severity === 'high' || severity === 'critical';

  const priorityScore = calculatePriorityScore(incident);
  const meetsThreshold = priorityScore >= 35;

  return isHighOrCritical || meetsThreshold;
}

/**
 * Executes automated dispatch:
 * 1. Finds the nearest available team matching the incident category
 * 2. Returns the dispatch payload (team info, distance, route URL, updated fields)
 * 
 * Returns null if no team is available.
 */
export function executeAutoDispatch(incident, teams) {
  if (!incident || !teams || teams.length === 0) return null;

  // Rank all teams by distance + capability match + availability
  const ranked = rankTeamsForIncident(incident, teams);

  // Find the first available team
  const bestTeam = ranked.find(t => t.isAvailable);

  if (!bestTeam) {
    // No available teams — incident stays as Reported for manual intervention
    return null;
  }

  const incLat = incident.latitude ?? 12.8900;
  const incLng = incident.longitude ?? 80.0800;

  const distanceKm = calculateHaversineDistance(
    bestTeam.lat, bestTeam.lng, incLat, incLng
  );
  const etaMinutes = estimateArrivalTimeMinutes(distanceKm);
  const routeUrl = getGoogleMapsDirectionsUrl(bestTeam, incident);

  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return {
    teamId: bestTeam.id,
    teamCallSign: bestTeam.callSign,
    teamName: bestTeam.name,
    teamIcon: bestTeam.icon,
    distanceKm,
    etaMinutes,
    routeUrl,

    // Fields to merge into the incident record
    incidentUpdateFields: {
      status: 'Assigned',
      assigned_team_id: bestTeam.id,
      assigned_team_name: `${bestTeam.name} (${bestTeam.callSign})`,
      assigned_team_callsign: bestTeam.callSign,
      assigned_team_coords: { lat: bestTeam.lat, lng: bestTeam.lng },
      assigned_distance_km: distanceKm,
      assigned_eta_mins: etaMinutes,
      assigned_route_url: routeUrl,
      dispatched_units: [`${bestTeam.name} (${bestTeam.callSign})`],
      assigned_at: timestamp,
      dispatched_at: timestamp,
      auto_dispatched: true
    },

    // Toast/banner message
    toastMessage: `⚡ AUTOMATED DISPATCH: ${bestTeam.icon} ${bestTeam.name} (${bestTeam.callSign}) deployed automatically to high-risk site (Distance: ${distanceKm} km, ETA: ~${etaMinutes} mins)`
  };
}

