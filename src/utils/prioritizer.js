/**
 * DISASTER-OPS Round 2 Intelligent Prioritization & Routing Engine
 * 
 * Formula:
 * Priority Score = Severity Weight + (Casualties * 3) + (Elapsed Minutes * 0.5) + Category Weight
 * 
 * Severity:
 * - Critical = 40
 * - High     = 30
 * - Medium   = 20
 * - Low      = 10
 * 
 * Category Weight:
 * - Fire / Collapse / Structural = 10
 * - Flood / Road Accident        = 5
 * - Medical / Other              = 2
 */

export const SEVERITY_WEIGHTS = {
  Critical: 40,
  High: 30,
  Medium: 20,
  Low: 10
};

export const CATEGORY_WEIGHTS = {
  'Fire Emergency': 10,
  'Building Collapse': 10,
  'Flood': 5,
  'Road Accident': 5,
  'Medical Emergency': 2,
  'Other Emergencies': 2
};

/**
 * Returns the category weight based on category string matching
 */
export function getCategoryWeight(category = '') {
  if (!category) return 2;
  const cat = category.toLowerCase();
  if (cat.includes('fire') || cat.includes('collapse') || cat.includes('structural')) {
    return 10;
  }
  if (cat.includes('flood') || cat.includes('accident') || cat.includes('crash')) {
    return 5;
  }
  return 2;
}

/**
 * Parses incident creation time and returns minutes elapsed until now
 */
export function getElapsedMinutes(incident) {
  if (!incident) return 0;

  let timestamp = null;

  if (incident.created_at_ms) {
    timestamp = incident.created_at_ms;
  } else if (incident.timestamp) {
    timestamp = typeof incident.timestamp === 'number' ? incident.timestamp : Date.parse(incident.timestamp);
  } else if (incident.created_at) {
    const parsed = Date.parse(incident.created_at);
    if (!isNaN(parsed)) {
      timestamp = parsed;
    }
  }

  // Fallback if parsing failed: check incident.id (e.g., INC-1731215400000)
  if (!timestamp && incident.id && typeof incident.id === 'string' && incident.id.startsWith('INC-')) {
    const idNum = parseInt(incident.id.replace('INC-', ''), 10);
    if (!isNaN(idNum) && idNum > 1000000000000) {
      timestamp = idNum;
    }
  }

  if (!timestamp) {
    return 5; // Default safe estimate: 5 minutes elapsed
  }

  const elapsedMs = Math.max(0, Date.now() - timestamp);
  const minutes = elapsedMs / (1000 * 60);
  return Math.min(minutes, 24 * 60); // Cap at 24 hours to avoid runaway scores on ancient seeds
}

/**
 * Calculates the dynamic priority score
 */
export function calculatePriorityScore(incident) {
  if (!incident) return 0;

  const severityWeight = SEVERITY_WEIGHTS[incident.severity] || 10;
  const casualties = Number(incident.people_affected ?? incident.casualties ?? 1);
  const casualtyWeight = Math.max(1, casualties) * 3;
  const elapsedMinutes = getElapsedMinutes(incident);
  const elapsedWeight = elapsedMinutes * 0.5;
  const categoryWeight = getCategoryWeight(incident.category);

  // Spatial 300m Clustering Boost: +15 points for each additional caller report in cluster
  const clusterCount = Number(incident.clusterCount || 1);
  const clusterBoost = clusterCount > 1 ? (clusterCount - 1) * 15 : 0;

  const total = severityWeight + casualtyWeight + elapsedWeight + categoryWeight + clusterBoost;
  return Math.round(total * 10) / 10;
}

/**
 * Returns detailed mathematical breakdown for tooltips & audits
 */
export function getPriorityBreakdown(incident) {
  if (!incident) {
    return {
      severityWeight: 10,
      casualtyWeight: 3,
      elapsedWeight: 0,
      categoryWeight: 2,
      clusterCount: 1,
      clusterBoost: 0,
      elapsedMinutes: 0,
      totalScore: 15
    };
  }

  const severityWeight = SEVERITY_WEIGHTS[incident.severity] || 10;
  const casualties = Number(incident.people_affected ?? incident.casualties ?? 1);
  const casualtyWeight = Math.max(1, casualties) * 3;
  const elapsedMinutes = Math.round(getElapsedMinutes(incident));
  const elapsedWeight = Math.round((elapsedMinutes * 0.5) * 10) / 10;
  const categoryWeight = getCategoryWeight(incident.category);

  const clusterCount = Number(incident.clusterCount || 1);
  const clusterBoost = clusterCount > 1 ? (clusterCount - 1) * 15 : 0;

  const totalScore = Math.round((severityWeight + casualtyWeight + elapsedWeight + categoryWeight + clusterBoost) * 10) / 10;

  return {
    severity: incident.severity,
    severityWeight,
    casualties,
    casualtyWeight,
    elapsedMinutes,
    elapsedWeight,
    category: incident.category,
    categoryWeight,
    clusterCount,
    clusterBoost,
    totalScore
  };
}

/**
 * Sorts incidents by Dynamic Priority Score descending (highest score first)
 */
export function sortIncidentsByPriority(incidents = []) {
  return [...incidents].sort((a, b) => {
    // Unresolved incidents always take precedence over resolved
    if (a.status === 'Resolved' && b.status !== 'Resolved') return 1;
    if (a.status !== 'Resolved' && b.status === 'Resolved') return -1;

    const scoreA = calculatePriorityScore(a);
    const scoreB = calculatePriorityScore(b);
    return scoreB - scoreA;
  });
}

/**
 * Haversine distance between two GPS coordinates in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // 1 decimal place (e.g. 1.8 km)
}

/**
 * Estimate driving arrival time based on distance (assumes urban average 30 km/h)
 */
export function estimateArrivalTimeMinutes(distanceKm) {
  if (distanceKm == null || distanceKm <= 0) return 2;
  const minutes = Math.round((distanceKm / 30) * 60);
  return Math.max(2, minutes);
}

