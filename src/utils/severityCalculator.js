/**
 * Local Fallback Scoring Engine:
 * - Base category score:
 *   - Collapse / Fire = 3
 *   - Flood / Accident / Medical = 2
 *   - Other = 1
 * - Casualty scale:
 *   - 1 = 0 pts
 *   - 2–4 = 2 pts
 *   - 5–9 = 4 pts
 *   - 10+ = 6 pts
 * - Plus sum of selected MCQ option points (each option 0, 2, or 4 pts)
 * 
 * Thresholds:
 * - Score >= 11 -> Critical
 * - Score 7–10 -> High
 * - Score 4–6  -> Medium
 * - Score < 4   -> Low
 */

export function getBaseCategoryPoints(category) {
  if (category === 'Building Collapse' || category === 'Fire Emergency') {
    return 3;
  }
  if (category === 'Flood' || category === 'Road Accident' || category === 'Medical Emergency') {
    return 2;
  }
  return 1;
}

export function getCasualtyPoints(peopleAffected) {
  const count = Number(peopleAffected) || 1;
  if (count >= 10) return 6;
  if (count >= 5) return 4;
  if (count >= 2) return 2;
  return 0;
}

export function calculateTriageScore(category, peopleAffected, mcqOptionPoints = []) {
  const catPoints = getBaseCategoryPoints(category);
  const casualtyPoints = getCasualtyPoints(peopleAffected);
  const mcqSum = mcqOptionPoints.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  return catPoints + casualtyPoints + mcqSum;
}

export function calculateSeverity(category, peopleAffected, mcqOptionPoints = []) {
  const score = calculateTriageScore(category, peopleAffected, mcqOptionPoints);
  if (score >= 11) return 'Critical';
  if (score >= 7)  return 'High';
  if (score >= 4)  return 'Medium';
  return 'Low';
}

/** Light-theme visual configurations for Severity levels */
export const SEVERITY_CONFIG = {
  Critical: {
    label: 'Critical Alert',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    badgeClass: 'bg-red-100 text-red-700 border border-red-200',
    glowClass: 'shadow-red-200',
    dotColor: 'bg-red-500',
    cardBorder: 'border-red-300',
    cardBg: 'bg-red-50'
  },
  High: {
    label: 'High Priority',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
    glowClass: '',
    dotColor: 'bg-amber-500',
    cardBorder: 'border-amber-200',
    cardBg: 'bg-amber-50/40'
  },
  Medium: {
    label: 'Medium Priority',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    badgeClass: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    glowClass: '',
    dotColor: 'bg-yellow-400',
    cardBorder: 'border-yellow-200',
    cardBg: 'bg-white'
  },
  Low: {
    label: 'Low Priority',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    glowClass: '',
    dotColor: 'bg-emerald-400',
    cardBorder: 'border-slate-200',
    cardBg: 'bg-white'
  }
};

/** Light-theme visual configurations for Status */
export const STATUS_CONFIG = {
  Reported: {
    label: 'Reported',
    badgeClass: 'bg-purple-100 text-purple-700 border border-purple-200',
    dotColor: 'bg-purple-500'
  },
  Assigned: {
    label: 'Assigned',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-300 font-bold',
    dotColor: 'bg-blue-600'
  },
  Dispatched: {
    label: 'Assigned',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-300 font-bold',
    dotColor: 'bg-blue-600'
  },
  'In Progress': {
    label: 'In Progress',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
    dotColor: 'bg-amber-500'
  },
  Pending: {
    label: 'Pending',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    dotColor: 'bg-slate-500'
  },
  Resolved: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold',
    dotColor: 'bg-emerald-500'
  }
};
