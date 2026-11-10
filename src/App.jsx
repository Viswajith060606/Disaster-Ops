import React, { useState, useCallback } from 'react';
import { useIncidents } from './hooks/useIncidents';
import { useTeams } from './hooks/useTeams';
import { useOfflineQueue } from './hooks/useOfflineQueue';
import { calculateSeverity } from './utils/severityCalculator';
import { shouldAutoDispatch, executeAutoDispatch } from './utils/autoDispatcher';
import { findClusterMatch, buildClusterMergePayload } from './utils/clusteringEngine';

import LoginPage from './components/LoginPage';
import EmergencyQuickDial from './components/EmergencyQuickDial';
import Navbar from './components/Navbar';
import PublicIncidentReporter from './components/PublicIncidentReporter';
import AdminDispatchDashboard from './components/AdminDispatchDashboard';
import PhotoLightboxModal from './components/PhotoLightboxModal';

// Demo incident pool for the simulate button
const DEMO_INCIDENT_POOL = [
  {
    title: 'Gas Cylinder Explosion',
    description:
      'LPG cylinder blast at a street-level restaurant kitchen. Structural integrity of the adjacent wall compromised. 7 people with burn injuries on premises.',
    category: 'Fire Emergency',
    people_affected: 7,
    contact_info: '+919988776655',
    latitude: 12.897,
    longitude: 80.076,
    ai_summary: 'Commercial LPG blast with structural wall failure; high thermal burns risk requiring burn ICU triage and foam suppression.',
    recommended_units: ['Tambaram Fire Tender', '108 Burn Care Ambulance', 'Police Crowd Control']
  },
  {
    title: 'Pedestrian Hit & Run Near School',
    description:
      'Student (est. age 12) struck by overspeeding vehicle near Tambaram govt school gate. Driver fled. Child unconscious, urgent medical evacuation needed.',
    category: 'Road Accident',
    people_affected: 1,
    contact_info: '+919874563210',
    latitude: 12.902,
    longitude: 80.082,
    ai_summary: 'Pediatric high-velocity trauma with altered consciousness; priority green corridor dispatch to pediatric trauma ICU.',
    recommended_units: ['ALS Trauma Ambulance', 'Tambaram Traffic Police Unit']
  },
  {
    title: 'Cardiac Arrest at Bus Terminus',
    description:
      'Elderly male passenger collapsed and unresponsive on Tambaram bus stand platform. CPR ongoing by bystander. AED & paramedics needed urgently.',
    category: 'Medical Emergency',
    people_affected: 1,
    contact_info: '+919123456789',
    latitude: 12.888,
    longitude: 80.086,
    ai_summary: 'Out-of-hospital witnessed cardiac arrest with CPR ongoing; immediate ALS defibrillator response needed.',
    recommended_units: ['108 Cardiac Mobile Care', 'Station First Aid Post']
  },
  {
    title: 'Canal Overflow – Low-Lying Colony',
    description:
      'Canal bank breach near Pozhichalur aqueduct spilling into ground-floor row houses. Around 12 families wading through waist-deep water.',
    category: 'Flood',
    people_affected: 12,
    contact_info: '+919080706050',
    latitude: 12.882,
    longitude: 80.092,
    ai_summary: 'Flash embankment breach submerging residential sector; boat extrication and temporary community shelter mobilization required.',
    recommended_units: ['NDRF Flood Rescue Platoon', 'Civil Defense Relief Rafts', 'Mobile Water Purification Unit']
  },
];

let demoPoolIndex = 0;

export default function App() {
  // --- Auth state ---
  const [role, setRole] = useState(null); // null | 'citizen' | 'admin'

  // --- UI state ---
  const [lightboxData, setLightboxData] = useState(null);

  // --- Auto-dispatch toast state ---
  const [autoDispatchToast, setAutoDispatchToast] = useState(null);

  const { incidents, addIncident, mergeClusterIncident, updateStatus, deleteIncident, resetSeedData, stats } =
    useIncidents();

  const { teams, assignTeam, assignMultipleTeams, releaseTeam, releaseTeamByIncident, resetTeams } =
    useTeams();

  // --- Offline Queue ---
  const offlineQueue = useOfflineQueue(
    // onSubmitReport callback — when queue flushes, each report goes through addIncidentWithAutoDispatch
    useCallback((reportData) => {
      const saved = addIncident(reportData);
      // Try auto-dispatch on flushed report
      if (saved && shouldAutoDispatch(saved)) {
        const dispatchResult = executeAutoDispatch(saved, teams);
        if (dispatchResult) {
          updateStatus(saved.id, 'Assigned', dispatchResult.incidentUpdateFields);
          assignTeam(dispatchResult.teamId, saved.id);
        }
      }
    }, [addIncident, updateStatus, assignTeam, teams])
  );

  // Login handler
  const handleLogin = (userRole) => {
    setRole(userRole);
  };

  // Logout handler
  const handleLogout = () => {
    setRole(null);
  };

  /**
   * Smart Add Incident — with Spatial 300m Clustering & Auto-Dispatch
   * Used by form submission, voice reporting, demo pool, and SOS button.
   */
  const addIncidentWithAutoDispatch = useCallback((incidentData) => {
    // If offline, enqueue instead
    if (!offlineQueue.isOnline) {
      offlineQueue.enqueueReport(incidentData);
      return {
        ...incidentData,
        id: `INC-QUEUED-${Date.now()}`,
        status: 'Queued (Offline)',
        offline_queued: true
      };
    }

    // ── 1. Spatial 300m Clustering Check ──
    const clusterMatch = findClusterMatch(incidentData, incidents);
    if (clusterMatch) {
      const { matchedIncident, distanceKm } = clusterMatch;
      const clusterResult = buildClusterMergePayload(matchedIncident, incidentData, teams);

      // Merge into the existing incident cluster
      const updatedIncident = mergeClusterIncident(clusterResult.targetId, clusterResult.mergedFields);

      // If high-density surge fleet was triggered, assign all teams
      if (clusterResult.dispatchedTeamIds && clusterResult.dispatchedTeamIds.length > 0) {
        assignMultipleTeams(clusterResult.dispatchedTeamIds, clusterResult.targetId);
      }

      // Show cluster notification banner/toast
      setAutoDispatchToast(clusterResult.toastMessage);
      setTimeout(() => setAutoDispatchToast(null), 10000);

      return {
        ...(updatedIncident || matchedIncident),
        ...clusterResult.mergedFields,
        id: clusterResult.targetId,
        is_cluster_merged: true,
        clusterCount: clusterResult.newClusterCount,
        cluster_distance_km: distanceKm,
        auto_dispatched: clusterResult.isHighDensity
      };
    }

    // ── 2. Standard Incident Addition ──
    const saved = addIncident(incidentData);

    // Check if auto-dispatch threshold is met
    if (saved && shouldAutoDispatch(saved)) {
      const dispatchResult = executeAutoDispatch(saved, teams);

      if (dispatchResult) {
        // 1. Update incident to Assigned with team details
        updateStatus(saved.id, 'Assigned', dispatchResult.incidentUpdateFields);

        // 2. Mark team as Busy
        assignTeam(dispatchResult.teamId, saved.id);

        // 3. Show auto-dispatch toast
        setAutoDispatchToast(dispatchResult.toastMessage);
        setTimeout(() => setAutoDispatchToast(null), 10000);

        // Return saved with auto-dispatch fields merged
        return {
          ...saved,
          ...dispatchResult.incidentUpdateFields,
          auto_dispatched: true,
          auto_dispatch_team: dispatchResult.teamName,
          auto_dispatch_distance: dispatchResult.distanceKm,
          auto_dispatch_eta: dispatchResult.etaMinutes
        };
      }
    }

    return saved;
  }, [addIncident, mergeClusterIncident, updateStatus, assignTeam, assignMultipleTeams, teams, incidents, offlineQueue]);

  /**
   * SOS Panic Button Handler
   * Immediately creates a Critical incident and triggers auto-dispatch.
   */
  const handleSOSPanic = useCallback(() => {
    // Get GPS
    const triggerSOS = (lat, lng, accuracy) => {
      const sosIncident = {
        title: 'CRITICAL SOS: Silent Victim Signal Triggered',
        description: 'Emergency SOS panic button activated by citizen. Immediate police and medical response required. No additional details available — assume active threat or medical emergency.',
        category: 'Medical Emergency',
        people_affected: 1,
        contact_info: 'SOS-AUTO',
        severity: 'Critical',
        ai_summary: 'Silent SOS panic signal activated. GPS coordinates transmitted automatically. Deploy nearest police and medical units immediately for potential active threat or unresponsive victim.',
        recommended_units: ['Sector Patrol (POLICE-104)', '108 ALS Ambulance (MED-108)'],
        triage_score: 16,
        latitude: lat,
        longitude: lng,
        photo_url: null,
        sos_triggered: true,
        sos_triggered_at: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };

      const result = addIncidentWithAutoDispatch(sosIncident);
      return result;
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          triggerSOS(
            parseFloat(pos.coords.latitude.toFixed(4)),
            parseFloat(pos.coords.longitude.toFixed(4)),
            Math.round(pos.coords.accuracy)
          );
        },
        () => {
          // GPS failed — use fallback coordinates
          triggerSOS(12.8900, 80.0800, null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      triggerSOS(12.8900, 80.0800, null);
    }
  }, [addIncidentWithAutoDispatch]);

  // Simulate incoming emergency incident (admin tool)
  const handleAddDemoIncident = () => {
    const demo = DEMO_INCIDENT_POOL[demoPoolIndex % DEMO_INCIDENT_POOL.length];
    demoPoolIndex++;
    addIncidentWithAutoDispatch({
      ...demo,
      severity: calculateSeverity(demo.category, demo.people_affected, [2, 2, 2, 2])
    });
  };

  // Open photo lightbox with initial view
  const handleOpenPhotoLightbox = (incident, view = 'scene') => {
    setLightboxData({ incident, view });
  };

  // --- Show Login page when not authenticated ---
  if (!role) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">

      {/* ── Offline Mesh Relay Warning Banner ── */}
      {!offlineQueue.isOnline && (
        <div className="bg-amber-600 text-white px-4 py-3 text-center text-xs font-bold flex items-center justify-center gap-2 animate-pulse z-50">
          <span className="text-base">📡</span>
          <span>Network Offline — Emergency alerts stored on local device mesh. Auto-transmitting upon reconnection.</span>
          {offlineQueue.queuedCount > 0 && (
            <span className="bg-white text-amber-700 px-2 py-0.5 rounded-full font-black text-[11px]">
              {offlineQueue.queuedCount} queued
            </span>
          )}
        </div>
      )}

      {/* ── Offline Queue Flush Success Banner ── */}
      {offlineQueue.lastFlushMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 text-center text-xs font-bold flex items-center justify-center gap-2 z-50">
          <span className="text-base">✅</span>
          <span>{offlineQueue.lastFlushMessage}</span>
        </div>
      )}

      {/* ── Auto-Dispatch Toast Banner ── */}
      {autoDispatchToast && (
        <div className="bg-blue-700 text-white px-4 py-3 text-center text-xs font-bold flex items-center justify-center gap-2 z-50 shadow-lg">
          <span className="text-base">⚡</span>
          <span>{autoDispatchToast}</span>
          <button
            onClick={() => setAutoDispatchToast(null)}
            className="ml-2 bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded text-[11px] font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Sticky Emergency Quick-Dial Hub (always visible) */}
      <EmergencyQuickDial />

      {/* 2. Sticky Navigation Header with Strict Role Isolation */}
      <Navbar
        stats={stats}
        role={role}
        onLogout={handleLogout}
        onSOSPanic={handleSOSPanic}
        isOnline={offlineQueue.isOnline}
        queuedCount={offlineQueue.queuedCount}
      />

      {/* 3. Main Content Area — strictly role-isolated */}
      <main className="flex-1 pb-12">
        {role === 'admin' ? (
          /* Admin-only view: Full dispatch dashboard (4-stage verified lifecycle) */
          <AdminDispatchDashboard
            incidents={incidents}
            stats={stats}
            onUpdateStatus={updateStatus}
            onDeleteIncident={deleteIncident}
            onResetSeedData={resetSeedData}
            onAddDemoIncident={handleAddDemoIncident}
            onOpenPhotoLightbox={handleOpenPhotoLightbox}
            teams={teams}
            onAssignTeam={assignTeam}
            onReleaseTeam={releaseTeam}
            onResetTeams={resetTeams}
          />
        ) : (
          /* Citizen-only view: Incident reporter + SOS + offline queue */
          <PublicIncidentReporter
            onAddIncident={addIncidentWithAutoDispatch}
            isOnline={offlineQueue.isOnline}
            queuedCount={offlineQueue.queuedCount}
            onSOSPanic={handleSOSPanic}
            autoDispatchToast={autoDispatchToast}
          />
        )}
      </main>

      {/* 4. Footer */}
      <footer className="border-t border-slate-200 bg-white text-center py-4 text-[11px] text-slate-400">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <span className="font-mono font-bold text-slate-600">DISASTER-OPS v3.1 MVP</span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span>4-Stage Lifecycle · Auto-Dispatch · Offline Mesh Relay · 1-Tap SOS</span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="text-emerald-600 font-semibold">
            {role === 'admin' ? '🛡️ Admin Command Active' : '🏠 Citizen Portal Active'} — Tambaram / Kilambakkam Sector
          </span>
        </div>
      </footer>

      {/* 5. Photo Lightbox Modal (globally mounted) */}
      {lightboxData && (
        <div onClick={() => setLightboxData(null)}>
          <PhotoLightboxModal
            incident={lightboxData.incident}
            initialView={lightboxData.view}
            onClose={() => setLightboxData(null)}
          />
        </div>
      )}
    </div>
  );
}
