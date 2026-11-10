import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShieldAlert, Search, Phone, Navigation, Trash2, Clock,
  Users, Flame, AlertTriangle, CheckCircle2, RotateCcw,
  PlusCircle, Maximize2, Volume2, Layers, Compass, Download,
  Sparkles, Bot, Truck, Check, Camera, Upload, X, ArrowRight,
  ShieldCheck, AlertOctagon, FileCheck, Zap, Star, MapPin,
  ExternalLink, Info, Activity, Radio, ChevronRight, ChevronDown
} from 'lucide-react';
import { INCIDENT_STATUSES, SEVERITY_LEVELS, INCIDENT_CATEGORIES } from '../data/mockSeedData';
import { SEVERITY_CONFIG, STATUS_CONFIG } from '../utils/severityCalculator';
import { playEmergencyAlert } from '../utils/audioAlert';
import { compressImageToBase64 } from '../utils/imageCompressor';
import {
  calculatePriorityScore,
  getPriorityBreakdown,
  sortIncidentsByPriority,
  calculateHaversineDistance,
  estimateArrivalTimeMinutes
} from '../utils/prioritizer';
import {
  PRESEEDED_TEAMS,
  rankTeamsForIncident,
  getGoogleMapsDirectionsUrl
} from '../data/teams';

export default function AdminDispatchDashboard({
  incidents,
  stats,
  onUpdateStatus,
  onDeleteIncident,
  onResetSeedData,
  onAddDemoIncident,
  onOpenPhotoLightbox,
  teams = PRESEEDED_TEAMS,
  onAssignTeam,
  onReleaseTeam,
  onResetTeams
}) {
  const [searchQuery,     setSearchQuery]     = useState('');
  const [severityFilter,  setSeverityFilter]  = useState('All');
  const [statusFilter,    setStatusFilter]    = useState('All');
  const [categoryFilter,  setCategoryFilter]  = useState('All');
  const [sortBy,          setSortBy]          = useState('priority'); // 'priority' | 'newest' | 'severity'
  const [showRadar,       setShowRadar]       = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // ── Team Assignment Modal State (Stage 2 Assignment) ──
  const [assigningIncident, setAssigningIncident] = useState(null);
  const [selectedTeamId, setSelectedTeamId]       = useState('');
  const [additionalUnits, setAdditionalUnits]     = useState([]);
  const [customUnitText, setCustomUnitText]       = useState('');

  // ── Proof of Resolution Modal State (Stage 4 Resolution) ──
  const [resolvingIncident, setResolvingIncident]   = useState(null);
  const [proofPhotoBase64, setProofPhotoBase64]     = useState(null);
  const [proofPhotoName, setProofPhotoName]         = useState('');
  const [resolutionNotes, setResolutionNotes]       = useState('');
  const [isCompressingProof, setIsCompressingProof] = useState(false);
  const proofFileInputRef                           = useRef(null);

  // ── Priority Breakdown Tooltip / Modal State ──
  const [priorityModalIncident, setPriorityModalIncident] = useState(null);

  // ── Tactical Polyline Route Modal State ──
  const [routeModalData, setRouteModalData] = useState(null); // { team, incident, distanceKm, etaMinutes }
  const routeMapRef = useRef(null);
  const routeMapInstance = useRef(null);

  // ── 300m Cluster Accordion Expansion State ──
  const [expandedClusters, setExpandedClusters] = useState({});
  const toggleClusterAccordion = (id) => {
    setExpandedClusters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* ── 1. Intelligent Filtering & Prioritization Sorting ── */
  const filteredIncidents = useMemo(() => {
    let list = incidents.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !item.title?.toLowerCase().includes(q) &&
          !item.description?.toLowerCase().includes(q) &&
          !item.category?.toLowerCase().includes(q) &&
          !item.contact_info?.toLowerCase().includes(q) &&
          !item.ai_summary?.toLowerCase().includes(q) &&
          !item.assigned_team_name?.toLowerCase().includes(q) &&
          !item.id?.toLowerCase().includes(q)
        ) return false;
      }
      if (severityFilter !== 'All' && item.severity !== severityFilter) return false;
      if (statusFilter   !== 'All' && item.status   !== statusFilter)   return false;
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      return true;
    });

    if (sortBy === 'priority') {
      return sortIncidentsByPriority(list);
    } else if (sortBy === 'newest') {
      return [...list].sort((a, b) => {
        const timeA = a.created_at_ms || Date.parse(a.created_at) || 0;
        const timeB = b.created_at_ms || Date.parse(b.created_at) || 0;
        return timeB - timeA;
      });
    } else if (sortBy === 'severity') {
      const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return [...list].sort((a, b) => (order[b.severity] || 0) - (order[a.severity] || 0));
    }

    return list;
  }, [incidents, searchQuery, severityFilter, statusFilter, categoryFilter, sortBy]);

  /* ── Ranked Teams for the active assignment incident ── */
  const rankedTeams = useMemo(() => {
    if (!assigningIncident) return [];
    return rankTeamsForIncident(assigningIncident, teams);
  }, [assigningIncident, teams]);

  /* ── Open Team Assignment Modal (Stage 1 -> Stage 2) ── */
  const handleOpenAssignModal = (incident) => {
    setAssigningIncident(incident);
    const ranked = rankTeamsForIncident(incident, teams);
    const bestFit = ranked[0];
    setSelectedTeamId(bestFit ? bestFit.id : (teams[0]?.id || 'FIRE-1'));
    setAdditionalUnits([]);
    setCustomUnitText('');
  };

  /* ── Confirm Team Assignment (Moves to 'Assigned') ── */
  const handleConfirmTeamAssignment = () => {
    if (!assigningIncident || !selectedTeamId) return;

    const chosenTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
    const distanceKm = calculateHaversineDistance(
      chosenTeam.lat,
      chosenTeam.lng,
      assigningIncident.latitude ?? 12.8900,
      assigningIncident.longitude ?? 80.0800
    );
    const etaMinutes = estimateArrivalTimeMinutes(distanceKm);
    const routeUrl = getGoogleMapsDirectionsUrl(chosenTeam, assigningIncident);

    const allDispatchedUnits = [
      `${chosenTeam.name} (${chosenTeam.callSign})`,
      ...additionalUnits
    ];

    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // 1. Update incident to Stage 2: Assigned
    onUpdateStatus(assigningIncident.id, 'Assigned', {
      assigned_team_id: chosenTeam.id,
      assigned_team_name: `${chosenTeam.name} (${chosenTeam.callSign})`,
      assigned_team_callsign: chosenTeam.callSign,
      assigned_team_coords: { lat: chosenTeam.lat, lng: chosenTeam.lng },
      assigned_distance_km: distanceKm,
      assigned_eta_mins: etaMinutes,
      assigned_route_url: routeUrl,
      dispatched_units: allDispatchedUnits,
      assigned_at: timestamp,
      dispatched_at: timestamp
    });

    // 2. Set team status to Busy
    if (onAssignTeam) {
      onAssignTeam(chosenTeam.id, assigningIncident.id);
    }

    // 3. Sound confirmation alert
    playEmergencyAlert('Medium');

    setAssigningIncident(null);
  };

  /* ── Transition Stage 2 ('Assigned') -> Stage 3 ('In Progress') ── */
  const handleDeployToInProgress = (incident) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    onUpdateStatus(incident.id, 'In Progress', {
      in_progress_at: timestamp
    });

    playEmergencyAlert('Low');
  };

  /* ── Open Proof of Completion Modal (Stage 3 -> Stage 4) ── */
  const handleOpenResolveModal = (incident) => {
    setResolvingIncident(incident);
    setProofPhotoBase64(null);
    setProofPhotoName('');
    setResolutionNotes('');
    if (proofFileInputRef.current) proofFileInputRef.current.value = '';
  };

  /* ── Handle Proof Photo Upload with Canvas Compression (<150KB) ── */
  const handleProofPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Photo is too large. Please select an image under 10MB.');
      return;
    }

    setIsCompressingProof(true);
    try {
      const compressed = await compressImageToBase64(file, 800, 0.75);
      setProofPhotoBase64(compressed);
      setProofPhotoName(file.name);
    } catch (err) {
      console.error('Proof photo compression failed:', err);
      alert('Could not process the photo. Please try again.');
    } finally {
      setIsCompressingProof(false);
    }
  };

  /* ── Confirm Resolution with Proof (Stage 4) ── */
  const handleConfirmResolution = () => {
    if (!resolvingIncident) return;
    if (!proofPhotoBase64) {
      alert('Proof of completion photo is mandatory before marking incident as Resolved.');
      return;
    }

    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // 1. Update incident to Stage 4: Resolved
    onUpdateStatus(resolvingIncident.id, 'Resolved', {
      resolution_proof_url: proofPhotoBase64,
      resolved_at: timestamp,
      resolution_notes: resolutionNotes.trim() || 'Incident neutralized and secured by dispatched emergency units.'
    });

    // 2. Free the assigned response team back to Available!
    if (resolvingIncident.assigned_team_id && onReleaseTeam) {
      onReleaseTeam(resolvingIncident.assigned_team_id);
    }

    setResolvingIncident(null);
  };

  /* ── Handle Status Dropdown Change (Locked from selecting Resolved directly) ── */
  const handleDropdownStatusChange = (incident, targetStatus) => {
    if (targetStatus === 'Resolved') {
      handleOpenResolveModal(incident);
      return;
    }
    if (targetStatus === 'Assigned') {
      handleOpenAssignModal(incident);
      return;
    }
    if (targetStatus === 'In Progress') {
      handleDeployToInProgress(incident);
      return;
    }
    if (targetStatus === 'Reported') {
      // Reverting to reported: release assigned team
      if (incident.assigned_team_id && onReleaseTeam) {
        onReleaseTeam(incident.assigned_team_id);
      }
      onUpdateStatus(incident.id, 'Reported', {
        assigned_team_id: null,
        assigned_team_name: null
      });
      return;
    }
    onUpdateStatus(incident.id, targetStatus);
  };

  /* ── Open Leaflet Polyline Route Modal ── */
  const handleOpenRouteModal = (incident) => {
    // Find assigned team or best-fit team
    let team = teams.find(t => t.id === incident.assigned_team_id);
    if (!team) {
      const ranked = rankTeamsForIncident(incident, teams);
      team = ranked[0] || teams[0];
    }

    const distanceKm = calculateHaversineDistance(
      team.lat,
      team.lng,
      incident.latitude ?? 12.8900,
      incident.longitude ?? 80.0800
    );
    const etaMinutes = estimateArrivalTimeMinutes(distanceKm);

    setRouteModalData({
      team,
      incident,
      distanceKm,
      etaMinutes
    });
  };

  /* ── Initialize Leaflet Map with Polyline in Route Modal ── */
  useEffect(() => {
    if (!routeModalData) {
      if (routeMapInstance.current) {
        routeMapInstance.current.remove();
        routeMapInstance.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!routeMapRef.current || routeMapInstance.current) return;

      import('leaflet').then((L) => {
        if (!routeMapRef.current || routeMapInstance.current) return;

        const teamLat = routeModalData.team.lat;
        const teamLng = routeModalData.team.lng;
        const incLat  = routeModalData.incident.latitude ?? 12.8900;
        const incLng  = routeModalData.incident.longitude ?? 80.0800;

        const map = L.map(routeMapRef.current).setView([teamLat, teamLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 1. Team Marker (Blue Pin)
        const teamIcon = L.divIcon({
          className: '',
          html: `
            <div style="background:#2563eb;color:#fff;border-radius:12px;padding:6px 10px;font-size:12px;font-weight:900;box-shadow:0 4px 12px rgba(37,99,235,0.4);border:2px solid #fff;display:flex;align-items:center;gap:4px;white-space:nowrap;">
              <span>${routeModalData.team.icon}</span>
              <span>${routeModalData.team.callSign} Base</span>
            </div>
          `,
          iconSize: [120, 36],
          iconAnchor: [60, 18]
        });
        L.marker([teamLat, teamLng], { icon: teamIcon }).addTo(map)
          .bindPopup(`<b>${routeModalData.team.name}</b><br/>${routeModalData.team.baseLocation}`);

        // 2. Incident Marker (Red Pulsing Pin)
        const incIcon = L.divIcon({
          className: '',
          html: `
            <div style="background:#dc2626;color:#fff;border-radius:12px;padding:6px 10px;font-size:12px;font-weight:900;box-shadow:0 4px 12px rgba(220,38,38,0.4);border:2px solid #fff;display:flex;align-items:center;gap:4px;white-space:nowrap;">
              <span>🚨</span>
              <span>${routeModalData.incident.title}</span>
            </div>
          `,
          iconSize: [140, 36],
          iconAnchor: [70, 18]
        });
        L.marker([incLat, incLng], { icon: incIcon }).addTo(map)
          .bindPopup(`<b>Incident:</b> ${routeModalData.incident.title}<br/>Casualties: ${routeModalData.incident.people_affected}`);

        // 3. Tactical Driving Route Polyline Overlay
        const polyline = L.polyline(
          [[teamLat, teamLng], [incLat, incLng]],
          {
            color: '#2563eb',
            weight: 5,
            opacity: 0.85,
            dashArray: '8, 10',
            lineCap: 'round',
            lineJoin: 'round'
          }
        ).addTo(map);

        // Fit map bounds to encompass both points with padding
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

        routeMapInstance.current = map;
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      if (routeMapInstance.current) {
        routeMapInstance.current.remove();
        routeMapInstance.current = null;
      }
    };
  }, [routeModalData]);

  /* ── Export JSON ── */
  const handleExport = () => {
    const url = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(incidents, null, 2));
    const a   = Object.assign(document.createElement('a'), { href: url, download: `dispatch_export_${Date.now()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
  };

  const clearFilters = () => {
    setSearchQuery(''); setSeverityFilter('All');
    setStatusFilter('All'); setCategoryFilter('All');
  };

  const hasFilters = searchQuery || severityFilter !== 'All' || statusFilter !== 'All' || categoryFilter !== 'All';

  const criticalCount   = stats?.critical || incidents.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;
  const reportedCount   = incidents.filter(i => i.status === 'Reported').length;
  const assignedCount   = incidents.filter(i => i.status === 'Assigned' || i.status === 'Dispatched').length;
  const inProgressCount = incidents.filter(i => i.status === 'In Progress').length;
  const resolvedCount   = incidents.filter(i => i.status === 'Resolved').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* ── Top Command Bar ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-600 text-white shadow-sm shadow-red-200">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Command Dispatch & Sector Allocation
              </h2>
              <p className="text-xs text-slate-500">
                Round 2 Prioritization · Dynamic AI Triage Score · 4-Stage Verified Lifecycle
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => playEmergencyAlert('High')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Test synthetic emergency siren"
          >
            <Volume2 className="w-4 h-4 text-red-600" /> Test Siren
          </button>

          <button
            onClick={() => setShowRadar(!showRadar)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              showRadar
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Compass className={`w-4 h-4 ${showRadar ? 'animate-spin' : 'text-blue-600'}`} style={{ animationDuration: '6s' }} />
            {showRadar ? 'Hide Tactical Radar' : 'Show Tactical Radar'}
          </button>

          <button
            onClick={onAddDemoIncident}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Simulate Emergency
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export JSON
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset all incidents and response teams back to initial state?')) {
                onResetSeedData();
                if (onResetTeams) onResetTeams();
              }
            }}
            className="px-3 py-2 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            title="Reset to default seed data"
          >
            <RotateCcw className="w-4 h-4" /> Reset Data
          </button>
        </div>
      </div>

      {/* ── SECTOR RESPONSE UNITS (Round 2 Live Tracker) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Sector Response Teams — Live Availability & Telemetry
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Auto-assigned via Haversine Distance & Capability Match
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {teams.map((team) => {
            const isAvailable = team.status === 'Available';
            return (
              <div
                key={team.id}
                className={`p-3 rounded-xl border transition-all ${
                  isAvailable
                    ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                    : 'bg-amber-50/50 border-amber-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xl shrink-0">{team.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {team.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 font-bold">
                        {team.callSign} · {team.type}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                      isAvailable
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                    }`}
                  >
                    {team.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                  <div className="truncate text-slate-500 text-[10px]">
                    📍 {team.baseLocation}
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-0.5">
                    <span className="font-mono text-blue-600 font-bold">{team.lat}, {team.lng}</span>
                    <a
                      href={`tel:${team.contact}`}
                      className="text-slate-600 hover:text-blue-600 font-bold flex items-center gap-0.5"
                    >
                      📞 {team.contact}
                    </a>
                  </div>
                </div>

                {!isAvailable && team.assigned_incident_id && (
                  <div className="mt-2 text-[10px] bg-amber-100/80 text-amber-900 p-1.5 rounded-lg border border-amber-200 font-semibold truncate flex items-center justify-between">
                    <span>Engaged: {team.assigned_incident_id}</span>
                    <button
                      onClick={() => onReleaseTeam && onReleaseTeam(team.id)}
                      className="text-[9px] text-amber-800 underline hover:text-amber-950 font-bold"
                      title="Force release team back to Available"
                    >
                      Release
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ENFORCED 4-STAGE LIFECYCLE METRIC TILES ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

        {/* Total Critical Alert Tile */}
        <div className="bg-red-50/80 border border-red-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-600" />
              Active Critical
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
              URGENT
            </span>
          </div>
          <div className="text-3xl font-black text-red-700 font-mono">{criticalCount}</div>
          <div className="text-[11px] text-red-600 mt-1">Requires immediate response</div>
        </div>

        {/* Stage 1: Reported */}
        <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-purple-600" />
              Stage 1: Reported
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
              UNASSIGNED
            </span>
          </div>
          <div className="text-3xl font-black text-purple-700 font-mono">{reportedCount}</div>
          <div className="text-[11px] text-purple-600 mt-1">Awaiting best-fit team dispatch</div>
        </div>

        {/* Stage 2: Assigned */}
        <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              Stage 2: Assigned
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
              EN ROUTE
            </span>
          </div>
          <div className="text-3xl font-black text-blue-700 font-mono">{assignedCount}</div>
          <div className="text-[11px] text-blue-600 mt-1">Sector unit assigned & routing</div>
        </div>

        {/* Stage 3: In Progress */}
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-600" />
              Stage 3: Operating
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              ON-SITE
            </span>
          </div>
          <div className="text-3xl font-black text-amber-700 font-mono">{inProgressCount}</div>
          <div className="text-[11px] text-amber-600 mt-1">Crew actively securing scene</div>
        </div>

        {/* Stage 4: Resolved */}
        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Stage 4: Resolved
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              VERIFIED
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-700 font-mono">{resolvedCount}</div>
          <div className="text-[11px] text-emerald-600 mt-1">Verified with proof of completion</div>
        </div>

      </div>

      {/* ── Tactical Radar (collapsible) ── */}
      {showRadar && (
        <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-500 animate-spin" style={{ animationDuration: '10s' }} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Tactical Geolocation Radar — Tambaram / Kilambakkam Sector
              </h3>
            </div>
            <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Center: 12.8900° N, 80.0800° E
            </span>
          </div>

          <div className="relative w-full h-64 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
            {/* Grid circles */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[20, 40, 60, 80].map((size) => (
                <div key={size} className="absolute rounded-full border border-blue-200/60" style={{ width: `${size}%`, height: `${size}%` }} />
              ))}
              <div className="absolute w-full h-px bg-blue-100" />
              <div className="absolute h-full w-px bg-blue-100" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-400/5 to-blue-400/15 pointer-events-none origin-center animate-spin" style={{ animationDuration: '6s' }} />

            {/* Team Bases on Radar */}
            {teams.map((t) => {
              const dLat = (t.lat ?? 12.89) - 12.89;
              const dLng = (t.lng ?? 80.08) - 80.08;
              const posX = Math.max(8, Math.min(92, 50 + dLng * 1200));
              const posY = Math.max(8, Math.min(92, 50 - dLat * 1200));
              return (
                <div key={t.id} style={{ left: `${posX}%`, top: `${posY}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10">
                  <div className="relative flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-[10px] flex items-center justify-center text-white border border-white shadow">
                      {t.icon}
                    </span>
                  </div>
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block w-40 bg-white border border-slate-200 p-2 rounded-xl shadow-xl z-30 pointer-events-none text-[10px]">
                    <div className="font-bold text-slate-900">{t.name} ({t.callSign})</div>
                    <div className="text-slate-500">{t.status} · {t.baseLocation}</div>
                  </div>
                </div>
              );
            })}

            {/* Incident Blips */}
            {filteredIncidents.map((inc) => {
              const dLat = (inc.latitude  ?? 12.89) - 12.89;
              const dLng = (inc.longitude ?? 80.08) - 80.08;
              const posX = Math.max(8, Math.min(92, 50 + dLng * 1200));
              const posY = Math.max(8, Math.min(92, 50 - dLat * 1200));
              const isCrit = inc.severity === 'Critical';
              return (
                <div key={inc.id} style={{ left: `${posX}%`, top: `${posY}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20">
                  <div className="relative flex items-center justify-center">
                    <span className={`absolute w-5 h-5 rounded-full ${isCrit ? 'bg-red-400/50 animate-ping' : 'bg-amber-300/40'}`} />
                    <span className={`w-3 h-3 rounded-full border-2 border-white shadow ${
                      isCrit ? 'bg-red-500' : inc.severity === 'High' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                  </div>
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block w-52 bg-white border border-slate-200 p-2.5 rounded-xl shadow-xl z-30 pointer-events-none text-[11px]">
                    <div className="font-bold text-slate-900 truncate">{inc.title}</div>
                    <div className="text-slate-500">{inc.category} · {inc.severity} · {inc.status}</div>
                    <div className="font-mono text-blue-600">{inc.latitude}, {inc.longitude}</div>
                  </div>
                </div>
              );
            })}
            <div className="absolute bottom-2 left-3 text-[10px] text-slate-400">
              Hover blips for live GPS coordinates & response details
            </div>
          </div>
        </div>
      )}

      {/* ── Filters, Search & Sorting Controls ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">

          {/* Search */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search title, category, team, AI summary…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-700">✕</button>
            )}
          </div>

          {/* Sorting Selector (Priority Score first) */}
          <div className="md:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-blue-50/70 border border-blue-300 font-bold text-blue-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="priority">⚡ Dynamic Priority Score (Highest First)</option>
              <option value="newest">🕒 Newest Reported First</option>
              <option value="severity">⚠️ Severity Level (Critical First)</option>
            </select>
          </div>

          {/* Severity filter */}
          <div className="md:col-span-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Severities</option>
              {SEVERITY_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Status filter (4 Stages) */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All 4 Stages</option>
              {INCIDENT_STATUSES.map((s) => <option key={s} value={s}>Stage: {s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span className="flex items-center gap-1.5">
            <span>Showing <strong className="text-slate-800">{filteredIncidents.length}</strong> of {incidents.length} incidents</span>
            <span className="text-slate-300">·</span>
            <span className="text-blue-700 font-semibold">
              Sorted by: {sortBy === 'priority' ? 'Dynamic Priority Score (Formula: Severity + Casualties*3 + Elapsed*0.5 + Category)' : sortBy}
            </span>
          </span>
          {hasFilters && (
            <button onClick={clearFilters} className="text-blue-600 hover:text-blue-800 font-semibold">
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Incident Grid Ranked by Priority ── */}
      {filteredIncidents.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-600">No matching incidents found</h3>
          <p className="text-xs text-slate-400 mt-1">Adjust your filters or simulate an incoming emergency.</p>
          <button
            onClick={onAddDemoIncident}
            className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Simulate Emergency Incident
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIncidents.map((item, idx) => {
            const isCritical    = item.severity === 'Critical';
            const severityStyle = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.Low;
            const statusStyle   = STATUS_CONFIG[item.status]     || STATUS_CONFIG.Reported;
            
            // 4 Enforced Lifecycle States
            const isReported   = item.status === 'Reported';
            const isAssigned   = item.status === 'Assigned' || item.status === 'Dispatched';
            const isInProgress = item.status === 'In Progress';
            const isResolved   = item.status === 'Resolved';

            // Spatial 300m Cluster status
            const isClustered   = Boolean(item.clusterCount && item.clusterCount > 1);
            const isHighDensity = Boolean(item.clusterCount && item.clusterCount >= 3);

            // Priority Score & Rank
            const priorityScore = calculatePriorityScore(item);
            const breakdown = getPriorityBreakdown(item);

            return (
              <div
                key={item.id}
                className={`rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm transition-all duration-200 border hover:shadow-md ${
                  isClustered && !isResolved
                    ? 'border-amber-300 bg-amber-50/50 shadow-amber-100 ring-2 ring-amber-300/70 ring-offset-1'
                    : isCritical && !isResolved
                    ? 'border-red-300 bg-red-50/20 shadow-red-100 critical-ring bg-white'
                    : isResolved
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* ── High-Density Cluster / Spatial Cluster Banner ── */}
                {isClustered && (
                  <div className={`px-4 py-2 flex items-center justify-between text-xs font-black border-b ${
                    isHighDensity
                      ? 'bg-amber-500 text-slate-900 border-amber-600 animate-pulse'
                      : 'bg-amber-100 text-amber-900 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-1.5 truncate">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      {isHighDensity ? (
                        <span>⚠️ HIGH-DENSITY CLUSTER ({item.clusterCount} Callers) — Multi-Unit Fleet Dispatched</span>
                      ) : (
                        <span>📍 300m SITE CLUSTER: {item.clusterCount} Reports Received for this Site</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-white/80 text-amber-950 px-2 py-0.5 rounded-full shadow-2xs shrink-0 ml-2">
                      +{(item.clusterCount - 1) * 15} pts
                    </span>
                  </div>
                )}

                {/* Card body */}
                <div className="p-5 space-y-3">

                  {/* Priority Score Header Pill + Category */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Dynamic Priority Score Badge */}
                    <button
                      type="button"
                      onClick={() => setPriorityModalIncident(item)}
                      className={`text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs border transition-transform hover:scale-102 ${
                        priorityScore >= 60
                          ? 'bg-red-600 text-white border-red-700'
                          : priorityScore >= 40
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-blue-600 text-white border-blue-700'
                      }`}
                      title="Click to view full mathematical formula breakdown"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Priority: {priorityScore} pts</span>
                      <span className="opacity-75 font-mono text-[9px]">#{idx + 1}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${severityStyle.badgeClass}`}>
                        {item.severity}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle.badgeClass}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* 4-Stage Lifecycle Stepper */}
                  <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[9px] font-bold text-slate-500">
                    <div className={`px-1.5 py-0.5 rounded ${isReported ? 'bg-purple-100 text-purple-800 font-black' : isAssigned || isInProgress || isResolved ? 'text-purple-600' : 'text-slate-400'}`}>
                      1. Reported
                    </div>
                    <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                    <div className={`px-1.5 py-0.5 rounded ${isAssigned ? 'bg-blue-100 text-blue-800 font-black' : isInProgress || isResolved ? 'text-blue-600' : 'text-slate-400'}`}>
                      2. Assigned
                    </div>
                    <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                    <div className={`px-1.5 py-0.5 rounded ${isInProgress ? 'bg-amber-100 text-amber-800 font-black' : isResolved ? 'text-amber-600' : 'text-slate-400'}`}>
                      3. In Progress
                    </div>
                    <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                    <div className={`px-1.5 py-0.5 rounded ${isResolved ? 'bg-emerald-100 text-emerald-800 font-black' : 'text-slate-400'}`}>
                      4. Resolved
                    </div>
                  </div>

                  {/* Title & Category */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-0.5">
                      <Flame className="w-3 h-3 text-orange-500" /> {item.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">{item.title}</h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{item.description}</p>

                  {/* AI Situational Summary */}
                  {item.ai_summary && (
                    <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                      <div className="text-slate-700 leading-snug flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800">AI Assessment: </span>
                          <span className="text-slate-600">{item.ai_summary}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Playable Audio Widget on Incident Card ── */}
                  {(item.voiceAudioUrl || item.audio_url) && !isClustered && (
                    <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-black text-[11px] shadow-2xs">
                          <Volume2 className="w-3.5 h-3.5" />
                          🎙️ Voice Report Attached (Click Play to Listen)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                          {item.ai_summary?.includes('Pending Manual') ? '⚠️ Fallback Audio' : 'AI Audio'}
                        </span>
                      </div>
                      <audio
                        controls
                        src={item.voiceAudioUrl || item.audio_url}
                        className="w-full h-10 mt-2 rounded-lg bg-slate-100 border border-slate-200 shadow-inner"
                      />
                    </div>
                  )}

                  {/* ── 👥 View All [X] Reporter Photos, Audio & Logs Accordion ── */}
                  {isClustered && item.clusterReports && item.clusterReports.length > 0 && (
                    <div className="rounded-xl border border-amber-300 bg-white overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => toggleClusterAccordion(item.id)}
                        className="w-full px-3 py-2 text-left bg-amber-100/70 hover:bg-amber-100 transition-colors flex items-center justify-between text-xs font-bold text-amber-950"
                      >
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-amber-700" />
                          👥 View All {item.clusterReports.length} Reporter Photos, Audio &amp; Logs
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-amber-800 transition-transform duration-200 ${expandedClusters[item.id] ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedClusters[item.id] && (
                        <div className="p-3 space-y-3 bg-amber-50/20 border-t border-amber-200 divide-y divide-amber-100 max-h-80 overflow-y-auto">
                          {item.clusterReports.map((report, rIdx) => (
                            <div key={report.id || rIdx} className="pt-2.5 first:pt-0 text-xs space-y-1.5">
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <span className="font-black text-amber-950 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                  {report.caller_name || `Caller #${rIdx + 1}`}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {report.timestamp}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-600">
                                <span className="font-semibold text-slate-700">Contact:</span> {report.contact_info || 'Unknown'}
                              </div>

                              {report.title && (
                                <div className="font-bold text-slate-900 text-[11px]">
                                  {report.title}
                                </div>
                              )}

                              {report.description && (
                                <p className="text-slate-600 text-[11px] leading-relaxed bg-white/80 p-2 rounded-lg border border-slate-100">
                                  {report.description}
                                </p>
                              )}

                              {/* Voice Audio Recording in Cluster Item */}
                              {(report.voiceAudioUrl || report.audio_url) && (
                                <div className="bg-white p-2.5 rounded-lg border border-amber-200 space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                                    <span className="flex items-center gap-1">
                                      <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                                      🎙️ Voice Report Attached (Click Play to Listen)
                                    </span>
                                    <span className="text-[9px] font-mono text-amber-700">Audio Payload</span>
                                  </div>
                                  <audio
                                    controls
                                    src={report.voiceAudioUrl || report.audio_url}
                                    className="w-full h-10 mt-1 rounded-lg bg-slate-100 border border-slate-200"
                                  />
                                </div>
                              )}

                              {/* Caller Photo Upload */}
                              {report.photo_url && (
                                <div className="flex items-center gap-2 pt-0.5">
                                  <div
                                    onClick={() => onOpenPhotoLightbox({ photo_url: report.photo_url, title: report.title }, 'scene')}
                                    className="w-16 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity bg-slate-100 shrink-0"
                                  >
                                    <img src={report.photo_url} alt="Caller upload" className="w-full h-full object-cover" />
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-medium">Caller upload photo (click to expand)</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Assigned Team & Routing Telemetry (Stage 2 & 3) ── */}
                  {item.assigned_team_name && (
                    <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          Assigned Sector Unit:
                        </span>
                        {item.assigned_at && (
                          <span className="text-[10px] font-mono text-blue-700 font-normal">
                            {item.assigned_at}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-blue-200 shadow-2xs">
                        <div>
                          <div className="font-bold text-blue-950 text-xs flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            {item.assigned_team_name}
                          </div>
                          {item.assigned_distance_km != null && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Distance: <strong className="text-blue-700">{item.assigned_distance_km} km away</strong> · ETA ~{item.assigned_eta_mins || 4} mins
                            </div>
                          )}
                        </div>

                        {/* Interactive Tactical Route Polyline Preview */}
                        <button
                          type="button"
                          onClick={() => handleOpenRouteModal(item)}
                          className="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                          title="Open tactical Leaflet map polyline overlay"
                        >
                          <Navigation className="w-3 h-3 text-blue-600" />
                          <span>Polyline</span>
                        </button>
                      </div>

                      {/* 1-Click Driving Direction Route */}
                      {item.assigned_route_url && (
                        <a
                          href={item.assigned_route_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Fastest Driving Route in Google Maps</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Photos Row: Initial Scene Photo + Proof of Completion Thumbnail */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* 1. Initial Scene Photo */}
                    {item.photo_url ? (
                      <div
                        onClick={() => onOpenPhotoLightbox(item, 'scene')}
                        className="relative h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group shadow-2xs"
                      >
                        <img
                          src={item.photo_url}
                          alt="Initial Scene"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 left-1 bg-white/90 px-1.5 py-0.5 rounded text-[9px] font-semibold text-slate-700 border border-slate-200 shadow-2xs">
                          📸 Scene
                        </span>
                      </div>
                    ) : (
                      <div className="h-24 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-[10px] text-slate-400">
                        <span>No Scene Photo</span>
                      </div>
                    )}

                    {/* 2. Proof of Completion Thumbnail (Stage 4) */}
                    {item.resolution_proof_url ? (
                      <div
                        onClick={() => onOpenPhotoLightbox(item, 'proof')}
                        className="relative h-24 rounded-xl overflow-hidden bg-emerald-50 border-2 border-emerald-300 cursor-pointer group shadow-2xs"
                      >
                        <img
                          src={item.resolution_proof_url}
                          alt="Proof of Completion"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-emerald-950/20 group-hover:bg-transparent transition-colors"></div>
                        <span className="absolute bottom-1 right-1 bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Proof Attached
                        </span>
                      </div>
                    ) : (
                      <div className={`h-24 rounded-xl border border-dashed flex flex-col items-center justify-center p-2 text-center text-[10px] ${
                        isInProgress ? 'bg-amber-50/50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {isInProgress ? (
                          <>
                            <Camera className="w-4 h-4 mb-1 text-amber-600" />
                            <span className="font-semibold">Proof Required to Resolve</span>
                          </>
                        ) : (
                          <span>Proof Pending</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stage 4 Resolved Notes Banner */}
                  {isResolved && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Resolved & Verified
                        </span>
                        {item.resolved_at && (
                          <span className="text-[10px] font-mono font-normal text-emerald-700">
                            {item.resolved_at}
                          </span>
                        )}
                      </div>
                      {item.resolution_notes && (
                        <p className="text-[11px] text-slate-600 italic">
                          "{item.resolution_notes}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Telemetry strip */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] border-t border-slate-100">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      Casualties: <strong className="text-slate-700">{item.people_affected}</strong>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{item.created_at}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between text-slate-400 font-mono text-[10px]">
                      <span className="text-blue-600">📍 GPS: {item.latitude}, {item.longitude}</span>
                      <span className="text-slate-400 font-sans">
                        Elapsed: <strong>{Math.round(breakdown.elapsedMinutes)}m</strong>
                      </span>
                    </div>
                  </div>

                </div>

                {/* ── Action Bar: Enforced 4-Stage Controls ── */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2.5">

                  {/* Stage 1: Assign Best-Fit Team */}
                  {isReported && (
                    <button
                      type="button"
                      onClick={() => handleOpenAssignModal(item)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <MapPin className="w-4 h-4 animate-bounce" />
                      <span>Stage 1: Assign Best-Fit Team</span>
                    </button>
                  )}

                  {/* Stage 2: Deploy & Start Operations */}
                  {isAssigned && (
                    <button
                      type="button"
                      onClick={() => handleDeployToInProgress(item)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Activity className="w-4 h-4" />
                      <span>Stage 2: Deploy & Begin Operations</span>
                    </button>
                  )}

                  {/* Stage 3: Upload Proof & Resolve */}
                  {isInProgress && (
                    <button
                      type="button"
                      onClick={() => handleOpenResolveModal(item)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Stage 3: Upload Proof & Resolve</span>
                    </button>
                  )}

                  {/* Stage 4: Completed Banner */}
                  {isResolved && (
                    <div className="py-2 px-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Stage 4: Completed with Verified Proof</span>
                    </div>
                  )}

                  {/* Call Reporter & Fastest Route Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${item.contact_info}`}
                      className="px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5" /> 📞 Call
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95 shadow-sm"
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" /> Route
                    </a>
                  </div>

                  {/* Stage Transition Selector & Delete */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 relative">
                      <select
                        value={item.status}
                        onChange={(e) => handleDropdownStatusChange(item, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
                        title="Update operational incident lifecycle stage"
                      >
                        <option value="Reported">Stage 1: Reported</option>
                        <option value="Assigned">Stage 2: Assigned (Select Team)</option>
                        <option value="In Progress">Stage 3: In Progress (Deploy)</option>
                        <option value="Resolved">Stage 4: Resolved (Upload Proof 🔒)</option>
                      </select>
                    </div>

                    {/* Delete Incident */}
                    {deleteConfirmId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (item.assigned_team_id && onReleaseTeam) {
                              onReleaseTeam(item.assigned_team_id);
                            }
                            onDeleteIncident(item.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shadow-sm"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-colors shadow-sm"
                        title="Delete incident"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL 1: Location-Based Best-Fit Team Assignment Modal ── */}
      {assigningIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Location-Based Best-Fit Team Assignment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Incident: {assigningIncident.title} ({assigningIncident.category})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningIncident(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Incident Telemetry info */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500">Incident Coordinates: </span>
                <span className="font-mono text-blue-600 font-bold">{assigningIncident.latitude}, {assigningIncident.longitude}</span>
              </div>
              <div>
                <span className="text-slate-500">Casualties: </span>
                <strong className="text-slate-800">{assigningIncident.people_affected}</strong>
              </div>
            </div>

            {/* Team Selection List */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Sector Response Teams Ranked by Haversine Distance & Capability:</span>
                <span className="text-[10px] text-blue-600 font-semibold">1-Click Driving Direction Enabled</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto p-1">
                {rankedTeams.map((team, idx) => {
                  const isSelected = selectedTeamId === team.id;
                  const isRecommended = idx === 0 && team.isAvailable;

                  return (
                    <div
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                          : isRecommended
                          ? 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-400'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="selectedTeam"
                            checked={isSelected}
                            onChange={() => setSelectedTeamId(team.id)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xl">{team.icon}</span>
                          <div>
                            <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <span>{team.name} ({team.callSign})</span>
                              {isRecommended && (
                                <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-white" /> BEST FIT
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {team.baseLocation} · {team.vehicle}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-blue-700">
                            {team.distanceKm} km away
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            ETA ~{team.etaMinutes} mins
                          </div>
                          <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded mt-0.5 ${
                            team.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {team.status}
                          </span>
                        </div>
                      </div>

                      {/* Capabilities match preview */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">
                          Match: {team.matchesCategory ? '🎯 Direct Specialist Match' : 'Support Unit'}
                        </span>
                        <a
                          href={team.googleMapsRouteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                        >
                          🗺️ Preview Google Route <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigningIncident(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTeamAssignment}
                disabled={!selectedTeamId}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Truck className="w-4 h-4" /> Confirm Assignment & Dispatch
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 2: Mandatory Proof of Completion & Resolution Modal (Stage 4) ── */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Proof of Completion (Stage 4 Resolution)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {resolvingIncident.title} ({resolvingIncident.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolvingIncident(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mandatory Proof Photo Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                Mandatory Proof of Completion Photo <span className="text-red-500">*</span>
              </label>

              {!proofPhotoBase64 ? (
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center bg-slate-50 hover:bg-emerald-50/40 transition-colors">
                  <input
                    ref={proofFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleProofPhotoUpload}
                    className="hidden"
                    id="proof-photo-file-input"
                    disabled={isCompressingProof}
                  />
                  <label
                    htmlFor="proof-photo-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="p-3 rounded-full bg-white border border-slate-200 shadow-sm text-emerald-600">
                      {isCompressingProof ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <div className="text-xs text-slate-800 font-bold">
                      {isCompressingProof ? 'Resizing and compressing photo...' : 'Click to take resolution photo / browse file'}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Auto-compressed with HTML canvas to max 800px (under 150KB)
                    </p>
                  </label>
                </div>
              ) : (
                <div className="relative rounded-xl border border-emerald-300 bg-emerald-50/50 p-2.5 flex items-center gap-3">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                    <img src={proofPhotoBase64} alt="Proof Thumbnail" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {proofPhotoName || 'Proof-of-Completion.jpg'}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Attached & Canvas-Compressed
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Frees assigned team back to Available upon confirmation
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProofPhotoBase64(null);
                      setProofPhotoName('');
                      if (proofFileInputRef.current) proofFileInputRef.current.value = '';
                    }}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Resolution Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Resolution Operational Notes / Handover Log:
              </label>
              <textarea
                rows="3"
                placeholder="e.g., Incident completely mitigated. Victims safely transferred to medical facilities. Assigned unit released to base."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolvingIncident(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolution}
                disabled={!proofPhotoBase64 || isCompressingProof}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" /> Complete & Mark Resolved
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 3: Leaflet Tactical Route Polyline Modal ── */}
      {routeModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative max-w-3xl w-full bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Tactical Leaflet Polyline Route Overlay
                  </h3>
                  <p className="text-xs text-slate-500">
                    {routeModalData.team.name} ({routeModalData.team.callSign}) ➔ {routeModalData.incident.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRouteModalData(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tactical HUD strip */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Team Base Origin:</span>
                <strong className="text-slate-800">{routeModalData.team.baseLocation}</strong>
              </div>
              <div className="text-center">
                <span className="text-slate-400 block text-[10px]">Haversine Distance:</span>
                <strong className="text-blue-600 font-mono text-sm">{routeModalData.distanceKm} km</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Estimated Arrival:</span>
                <strong className="text-emerald-700 font-mono text-sm">~{routeModalData.etaMinutes} mins</strong>
              </div>
            </div>

            {/* Leaflet Map Canvas with Polyline */}
            <div className="relative w-full h-80 rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
              <div ref={routeMapRef} className="w-full h-full" />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Direct vector polyline with OpenStreetMap keyless basemap
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={getGoogleMapsDirectionsUrl(routeModalData.team, routeModalData.incident)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" /> Open Live GPS in Google Maps
                </a>
                <button
                  type="button"
                  onClick={() => setRouteModalData(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 4: Dynamic Priority Score Formula Breakdown Modal ── */}
      {priorityModalIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-100 text-red-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Dynamic Priority Score Formula
                  </h3>
                  <p className="text-xs text-slate-500">
                    Audit Breakdown for {priorityModalIncident.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPriorityModalIncident(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formula display */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-700">
              Priority Score = Severity + (Casualties × 3) + (Elapsed Mins × 0.5) + Category + Cluster Boost (+15/caller)
            </div>

            {/* Step-by-step breakdown */}
            {(() => {
              const b = getPriorityBreakdown(priorityModalIncident);
              return (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span>Severity Weight ({b.severity}):</span>
                    <strong className="text-slate-900">+{b.severityWeight} pts</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span>Casualties ({b.casualties} victims × 3):</span>
                    <strong className="text-slate-900">+{b.casualtyWeight} pts</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span>Elapsed Time ({b.elapsedMinutes} mins × 0.5):</span>
                    <strong className="text-slate-900">+{b.elapsedWeight} pts</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span>Category Weight ({b.category}):</span>
                    <strong className="text-slate-900">+{b.categoryWeight} pts</strong>
                  </div>
                  {b.clusterBoost > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                      <span>Spatial 300m Cluster Boost ({b.clusterCount} Callers):</span>
                      <strong className="text-amber-700 font-black">+{b.clusterBoost} pts</strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm font-bold text-blue-900">
                    <span>Total Calculated Priority:</span>
                    <span className="text-lg font-black font-mono text-blue-700">{b.totalScore} pts</span>
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setPriorityModalIncident(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
