/**
 * Sector Response Teams Pre-Seed Data & Tactical Routing Helpers
 */
import { calculateHaversineDistance, estimateArrivalTimeMinutes } from '../utils/prioritizer';

export const PRESEEDED_TEAMS = [
  {
    id: 'FIRE-1',
    name: 'Tambaram Fire Squad',
    callSign: 'FIRE-1',
    type: 'Fire',
    service: 'Fire & Rescue Service',
    capabilities: ['Fire Emergency', 'Building Collapse', 'Hazmat', 'Other Emergencies'],
    baseLocation: 'Tambaram Fire Station, GST Road',
    lat: 12.9205,
    lng: 80.1200,
    status: 'Available', // 'Available' | 'Busy'
    assigned_incident_id: null,
    vehicle: 'Heavy Foam Tender 01 (Water/Foam)',
    crewSize: 6,
    contact: '09445086053',
    icon: '🚒',
    color: '#dc2626' // red-600
  },
  {
    id: 'MED-108',
    name: 'Kilambakkam Ambulance',
    callSign: 'MED-108',
    type: 'Medical',
    service: '108 Advanced Emergency Medical Care',
    capabilities: ['Medical Emergency', 'Road Accident', 'Building Collapse', 'Flood', 'Other Emergencies'],
    baseLocation: 'Kilambakkam Base 108, KCBT Hub',
    lat: 12.9010,
    lng: 80.0750,
    status: 'Available',
    assigned_incident_id: null,
    vehicle: 'Type-C ALS Ambulance (Ventilator/Trauma)',
    crewSize: 3,
    contact: '108',
    icon: '🚑',
    color: '#d97706' // amber-600
  },
  {
    id: 'POLICE-104',
    name: 'Sector Patrol',
    callSign: 'POLICE-104',
    type: 'Police',
    service: 'Tamil Nadu Highway Patrol',
    capabilities: ['Road Accident', 'Building Collapse', 'Fire Emergency', 'Flood', 'Other Emergencies'],
    baseLocation: 'Kilambakkam Police Station',
    lat: 12.9018,
    lng: 80.0745,
    status: 'Available',
    assigned_incident_id: null,
    vehicle: 'Rapid Highway Interceptor Unit 104',
    crewSize: 4,
    contact: '100',
    icon: '🚓',
    color: '#2563eb' // blue-600
  },
  {
    id: 'NDRF-1',
    name: 'Heavy Rescue Platoon',
    callSign: 'NDRF-1',
    type: 'Rescue',
    service: 'National Disaster Response Force / Civil Defense',
    capabilities: ['Building Collapse', 'Flood', 'Fire Emergency', 'Other Emergencies'],
    baseLocation: 'Tambaram Sanatorium NDRF Post',
    lat: 12.9360,
    lng: 80.1400,
    status: 'Available',
    assigned_incident_id: null,
    vehicle: 'Heavy Crane & Extrication Disaster Truck',
    crewSize: 10,
    contact: '1070',
    icon: '🛡️',
    color: '#059669' // emerald-600
  }
];

/**
 * Computes Google Maps driving directions URL from team base to incident location
 */
export function getGoogleMapsDirectionsUrl(team, incident) {
  if (!team || !incident) return '#';
  const originLat = team.lat ?? 12.9010;
  const originLng = team.lng ?? 80.0800;
  const destLat = incident.latitude ?? 12.8900;
  const destLng = incident.longitude ?? 80.0800;
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
}

/**
 * Evaluates all teams against an incident to compute:
 * - Distance (km) via Haversine
 * - Estimated arrival time (mins)
 * - Capability match score
 * - Best-fit recommendation
 */
export function rankTeamsForIncident(incident, teams = PRESEEDED_TEAMS) {
  if (!incident) return [];

  const incLat = incident.latitude ?? 12.8900;
  const incLng = incident.longitude ?? 80.0800;
  const incCategory = incident.category || 'Other Emergencies';

  const evaluated = teams.map((team) => {
    const distanceKm = calculateHaversineDistance(team.lat, team.lng, incLat, incLng);
    const etaMinutes = estimateArrivalTimeMinutes(distanceKm);
    const matchesCategory = team.capabilities.includes(incCategory);
    const isAvailable = team.status === 'Available';

    // Best-fit scoring: lower score is better (distance with penalties for busy or mismatched)
    let fitnessScore = distanceKm;
    if (!matchesCategory) fitnessScore += 15.0; // penalty for non-specialist
    if (!isAvailable) fitnessScore += 50.0;     // high penalty if currently engaged

    return {
      ...team,
      distanceKm,
      etaMinutes,
      matchesCategory,
      isAvailable,
      fitnessScore,
      googleMapsRouteUrl: getGoogleMapsDirectionsUrl(team, incident)
    };
  });

  // Sort best fit first
  evaluated.sort((a, b) => {
    // 1. Available first
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;

    // 2. Matching category first
    if (a.matchesCategory && !b.matchesCategory) return -1;
    if (!a.matchesCategory && b.matchesCategory) return 1;

    // 3. Closest distance
    return a.distanceKm - b.distanceKm;
  });

  return evaluated;
}

/**
 * Return the single best fit team for an incident
 */
export function getBestFitTeam(incident, teams = PRESEEDED_TEAMS) {
  const ranked = rankTeamsForIncident(incident, teams);
  return ranked[0] || null;
}

