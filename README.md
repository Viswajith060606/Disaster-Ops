# 🚨 DISASTER-OPS

> **AI-Powered Emergency Operations & Dispatch Command Platform — Real-Time Incident Triage, Team Dispatch, Spatial Clustering & Disaster Resilience.**

![React](https://img.shields.io/badge/react-18.3.1-61DAFB.svg)
![Vite](https://img.shields.io/badge/vite-6.0.7-646CFF.svg)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-3.4.17-06B6D4.svg)
![Leaflet](https://img.shields.io/badge/leaflet-1.9.4-199900.svg)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 📌 Problem Statement

When large-scale disasters strike — earthquakes, floods, chemical fires, and mass accidents — emergency coordination systems fail in three critical ways:

1. **Unstructured Citizen Reports:** Citizens report emergencies through fragmented, inconsistent channels. Dispatchers receive incomplete descriptions, wrong locations, and duplicate calls for the same incident site, wasting precious seconds routing units.

2. **Manual Dispatch Bottlenecks:** Admin operators manually review every incoming report to decide severity and assign teams. For High and Critical incidents, this human-in-the-loop delay costs lives. No existing lightweight, self-hosted solution auto-assigns the nearest available specialist unit in real time.

3. **Network Failure During Peak Disaster:** Cell tower damage during floods or earthquakes causes citizen apps to go dark exactly when the most reports are needed. Reports are lost and never reach the command hub.

**DISASTER-OPS** solves all three with a full-stack, offline-resilient, AI-triage web platform that:
- Guides citizens through structured voice or form-based reporting
- Uses Gemini 2.5 Flash to extract severity, category, and casualties from free-form speech or text
- Automatically dispatches the nearest matching team for critical incidents without admin intervention
- Merges duplicate reports from the same 300m site into a single clustered command card
- Queues all reports locally during network outages and auto-flushes on reconnection

---

## 🚀 Features

### Full Feature Matrix

| Feature | Subsystem | Mechanism | Status |
|---|---|---|---|
| **Gemini AI Dynamic MCQ Triage** | `geminiTriage.js` | Gemini 2.5 Flash generates 4 customized MCQs per incident category; score accumulates to calculate severity | ✅ Production |
| **Full Hands-Free Voice Reporting** | `PublicIncidentReporter.jsx` | MediaRecorder API captures audio → Gemini 2.5 Flash acoustic analysis extracts title, severity, casualties, category, and summary | ✅ Production |
| **Web Speech API (STT)** | `PublicIncidentReporter.jsx` | `window.SpeechRecognition` / `window.webkitSpeechRecognition` for live transcription into the description field; supports English (`en-US`) and Tamil (`ta-IN`) | ✅ Production |
| **Voice Audio Fallback Storage** | `PublicIncidentReporter.jsx` + `geminiTriage.js` | On Gemini API failure, raw `audio/webm` is encoded as Base64 Data URL and stored as `voiceAudioUrl` on the incident; admin can play it back inline | ✅ Production |
| **300m Spatial Incident Clustering** | `clusteringEngine.js` | Haversine radius engine merges reports within 300m of same category into a single cluster; +15 priority boost per additional caller | ✅ Production |
| **Multi-Unit Fleet Surge Dispatch** | `clusteringEngine.js` | When a cluster reaches ≥ 3 callers, automatically selects and dispatches up to 2–3 available units as a coordinated fleet | ✅ Production |
| **Automated Dispatch Engine** | `autoDispatcher.js` | For High/Critical incidents or Priority Score ≥ 35: instantly assigns nearest available matching team without admin action | ✅ Production |
| **Dynamic Priority Scoring** | `prioritizer.js` | Formula: `Severity Weight + (Casualties × 3) + (Elapsed Minutes × 0.5) + Category Weight + Cluster Boost` | ✅ Production |
| **Location-Based Best-Fit Team Selector** | `teams.js` | Haversine distance + capability match score ranks all teams; fitness score penalizes non-specialists (+15) and busy units (+50) | ✅ Production |
| **Leaflet Tactical Routing Map** | `EmergencyServicesMap.jsx` | Interactive OpenStreetMap polyline routing from team base to incident; real-time distance and ETA overlays | ✅ Production |
| **1-Tap SOS Panic Button** | `Navbar.jsx` / `SOSButton.jsx` | Double-tap confirmation gathers GPS coordinates and auto-submits a Critical incident; triggers auto-dispatch of nearest Police + Medical units | ✅ Production |
| **Offline Mesh Relay & Sync Queue** | `useOfflineQueue.js` | `navigator.onLine` detection; offline reports stored in `localStorage` under `offline_mesh_queue`; auto-flushed with toast on reconnect | ✅ Production |
| **4-Stage Enforced Lifecycle** | `AdminDispatchDashboard.jsx` | Reported → Assigned → In Progress → Resolved; Resolved status is locked — requires photo Proof of Completion upload | ✅ Production |
| **Photo Proof of Completion** | `AdminDispatchDashboard.jsx` | Modal capture/upload (`capture="environment"`); client-side `<canvas>` resizes to max 800×800px, compressed JPEG Base64 ≤ 150KB; thumbnail + timestamp badge rendered on resolved card | ✅ Production |
| **Admin Cluster Accordion** | `AdminDispatchDashboard.jsx` | Expandable `👥 View All [X] Reporter Photos, Audio & Logs` panel per cluster card with inline `<audio>` voice playback and per-caller thumbnails | ✅ Production |
| **Role-Based Access Control** | `App.jsx` / `LoginPage.jsx` | Citizen view and Admin view are strictly isolated; role set at login; no component cross-contamination | ✅ Production |
| **Auto-Dispatch Toast Banners** | `ToastContainer.jsx` | Fixed-position non-overlapping banner for auto-dispatch alerts and network state changes; dismissible with ✕ | ✅ Production |
| **Responsive SOS FAB** | `SOSButton.jsx` | Desktop: inline in top nav (`⚡ 1-Tap SOS Panic`); Mobile: floating action button bottom-right (`w-14 h-14 rounded-full`) | ✅ Production |
| **LocalStorage Full Persistence** | `useIncidents.js` / `useTeams.js` | All incident state and team state serialized to `localStorage`; cross-tab sync via `window.dispatchEvent(new Event('storage'))` | ✅ Production |
| **Emergency Audio Alert** | `audioAlert.js` | Browser-synthesized beep alert fires on new High/Critical incident submission | ✅ Production |

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DISASTER-OPS PLATFORM                           │
├─────────────────────────────┬──────────────────────────────────────────┤
│        CITIZEN VIEW         │             ADMIN VIEW                   │
│  PublicIncidentReporter.jsx │  AdminDispatchDashboard.jsx              │
│                             │                                          │
│  ① Text Form Report         │  ⑦ Priority-Sorted Incident Cards       │
│  ② Voice Recording          │  ⑧ Best-Fit Team Selector               │
│  ③ Speech-to-Text (STT)     │  ⑨ Leaflet Tactical Map                 │
│  ④ 1-Tap SOS Button         │  ⑩ Cluster Accordion + Audio Players    │
│  ⑤ Offline Queue Banner     │  ⑪ 4-Stage Lifecycle + Proof Upload     │
│  ⑥ Language Toggle          │  ⑫ Auto-Dispatch Toast                  │
└──────────────┬──────────────┴────────────────┬───────────────────────-┘
               │                               │
               ▼                               ▼
     geminiTriage.js                    prioritizer.js
  (MCQ + Voice Analysis)         (Dynamic Priority Scoring)
               │                               │
               ▼                               ▼
     clusteringEngine.js ◄──── useIncidents.js (localStorage)
   (300m Haversine Merge)              │
               │                       ▼
               ▼              autoDispatcher.js
     useOfflineQueue.js        (High/Critical auto-assign)
  (localStorage + flush)              │
                                       ▼
                               teams.js + useTeams.js
                            (Haversine rank + fleet surge)
```

### Data Flow: New Incident Submission

```
Citizen submits report
        │
        ▼
  [Online?] ──No──► enqueueReport() ──► localStorage (offline_mesh_queue)
        │                                      │
       Yes                              [Online restored]
        │                                      │
        ▼                                      ▼
geminiTriage.js                         flushQueue() ──► re-submit all
(MCQ score → severity)                  
        │
        ▼
clusteringEngine.findClusterMatch()
   (any active incident within 300m + same category?)
        │
   ┌────┴────┐
  Yes        No
   │          │
   ▼          ▼
buildCluster   addIncident()
Merge()        (new INC-timestamp)
   │          │
   └────┬─────┘
        ▼
 autoDispatcher.shouldAutoDispatch()
  (severity High/Critical OR score ≥ 35?)
        │
   ┌────┴────┐
  Yes        No
   │          │
   ▼          ▼
executeAuto   Status = 'Reported'
Dispatch()    (manual admin queue)
   │
   ▼
rankTeamsForIncident()
(Haversine + capability + availability)
   │
   ▼
incident.status = 'Assigned'
team.status = 'Busy'
Toast: "⚡ AUTOMATED DISPATCH: ..."
```

---

## 🛠️ Tech Stack

### Frontend

| Component | Version | Role | Technical Rationale |
|---|---|---|---|
| **React** | `^18.3.1` | Core UI framework | Concurrent rendering for real-time incident card updates and voice transcript streaming |
| **Vite** | `^6.0.7` | Build tool & dev server | Sub-second HMR, `import.meta.env` for secure env var injection, optimised production chunking |
| **Tailwind CSS** | `^3.4.17` | Styling system | Light/White enterprise theme — utility-first responsive layout without runtime overhead |
| **Leaflet.js** | `^1.9.4` | Interactive mapping | OpenStreetMap tiles (keyless, free); polyline routing from team base to incident coordinates |
| **react-leaflet** | `^4.2.1` | React Leaflet bindings | Declarative map layer management with incident markers and route overlays |
| **Lucide React** | `^1.16.0` | Icon set | Crisp vector icons for status badges, action buttons, and severity indicators |
| **autoprefixer + PostCSS** | `^10.4.20` | CSS processing | Vendor prefix injection for cross-browser compatibility |

### Browser APIs Used

| API | Used For | Fallback Behaviour |
|---|---|---|
| **Gemini 2.5 Flash REST** | MCQ generation, incident analysis, voice transcript extraction | Static fallback MCQs per category; raw voice audio stored locally for manual admin review |
| **MediaRecorder API** | Full voice report capture (`audio/webm` / `audio/ogg`) | Falls back gracefully; form-based text input remains available |
| **Web Speech API** | Live speech-to-text transcription into description field (Tamil + English) | Error feedback shown; textarea still usable manually |
| **Geolocation API** | GPS coordinates for SOS panic button and incident location capture | Manual latitude/longitude input fields displayed as fallback |
| **LocalStorage** | Full state persistence for incidents, teams, and offline queue | In-memory state only; app remains functional within session |
| **Canvas API** | Client-side photo compression (max 800×800px, JPEG 0.75) for proof of completion | Raw file upload without compression if canvas unavailable |
| **navigator.onLine** | Network connectivity detection for offline queue | Assumes online; queue flushed on window `online` event |

### Environment & Security

| Variable | File | Purpose |
|---|---|---|
| `VITE_GEMINI_API_KEY` | `.env` (gitignored) | Google Gemini 2.5 Flash API key injected at build time via `import.meta.env` |

---

## 📊 Intelligent Priority Scoring

Every incident card is sorted on the Admin Dashboard by its **Dynamic Priority Score**, calculated as:

$$\text{Priority Score} = \underbrace{S_w}_{\text{Severity}} + \underbrace{C \times 3}_{\text{Casualties}} + \underbrace{T \times 0.5}_{\text{Elapsed mins}} + \underbrace{K_w}_{\text{Category}} + \underbrace{(n-1) \times 15}_{\text{Cluster Boost}}$$

| Factor | Variable | Values |
|---|---|---|
| **Severity Weight** ($S_w$) | `incident.severity` | Critical = **40**, High = **30**, Medium = **20**, Low = **10** |
| **Casualties** ($C$) | `incident.people_affected` | Per person × 3 points |
| **Elapsed Time** ($T$) | `created_at_ms` → minutes | Per minute × 0.5 (capped at 24 hrs = 720 min) |
| **Category Weight** ($K_w$) | `incident.category` | Fire/Collapse = **10**, Flood/Accident = **5**, Medical/Other = **2** |
| **Cluster Boost** | `clusterCount - 1` | +**15** pts per additional caller within 300m |

**Auto-Dispatch Threshold:** Priority Score ≥ 35 OR Severity is `High` / `Critical`.

**Resolved incidents** are always sorted to the bottom, regardless of score.

---

## 📍 Location-Based Best-Fit Team Assignment

### Pre-Seeded Sector Response Teams

| Call Sign | Name | Type | Base Location | Coordinates | Vehicle | Crew | Contact |
|---|---|---|---|---|---|---|---|
| `FIRE-1` | Tambaram Fire Squad | 🚒 Fire | Tambaram Fire Station, GST Road | 12.9205°N, 80.1200°E | Heavy Foam Tender 01 | 6 | 09445086053 |
| `MED-108` | Kilambakkam Ambulance | 🚑 Medical | Kilambakkam Base 108, KCBT Hub | 12.9010°N, 80.0750°E | Type-C ALS Ambulance (Ventilator/Trauma) | 3 | 108 |
| `POLICE-104` | Sector Patrol | 🚓 Police | Kilambakkam Police Station | 12.9018°N, 80.0745°E | Rapid Highway Interceptor Unit 104 | 4 | 100 |
| `NDRF-1` | Heavy Rescue Platoon | 🛡️ Rescue | Tambaram Sanatorium NDRF Post | 12.9360°N, 80.1400°E | Heavy Crane & Extrication Disaster Truck | 10 | 1070 |

### Team Capability Matrix

| Team | Fire Emergency | Building Collapse | Medical Emergency | Road Accident | Flood | Other |
|---|---|---|---|---|---|---|
| `FIRE-1` | ✅ Specialist | ✅ | ❌ | ❌ | ❌ | ✅ |
| `MED-108` | ❌ | ✅ | ✅ Specialist | ✅ | ✅ | ✅ |
| `POLICE-104` | ✅ | ✅ | ❌ | ✅ Specialist | ✅ | ✅ |
| `NDRF-1` | ✅ | ✅ Specialist | ❌ | ❌ | ✅ | ✅ |

### Fitness Score Algorithm (`rankTeamsForIncident`)

```
fitness_score = haversine_distance_km
             + (15.0 if not matching category specialist)
             + (50.0 if team is currently Busy)
```

Teams are ranked: **Available first → Matching category first → Closest distance**.

Haversine formula (Earth radius = 6371 km):

$$d = 2R \cdot \arctan2\!\left(\sqrt{a},\,\sqrt{1-a}\right), \quad a = \sin^2\!\tfrac{\Delta\phi}{2} + \cos\phi_1\cos\phi_2\sin^2\!\tfrac{\Delta\lambda}{2}$$

Estimated arrival time assumes urban driving speed of **30 km/h** (minimum 2 minutes).

---

## 🎙️ Voice Reporting Module

### Two Voice Input Modes

#### Mode 1 — Live Speech-to-Text (STT) on Description Field
- Uses `window.SpeechRecognition` / `window.webkitSpeechRecognition`
- Language toggle: `en-US` (English) or `ta-IN` (Tamil)
- Microphone button (🎤) with animated 🔴 pulsing badge when active
- Transcribed text appended directly into description textarea in real time
- Triggers Gemini MCQ triage as text populates (live re-analysis)
- Graceful error messages for browser unsupported or permission denied

#### Mode 2 — Full Hands-Free Voice Report
- Large **🎤 Tap to Speak Full Report** button with Tamil/English language toggle
- Records audio via `MediaRecorder` API (`audio/webm` / `audio/ogg`)
- Shows animated waveform and 🔴 Recording status during capture
- On stop: audio blob encoded to Base64 Data URL and stored as `voiceAudioUrl`

**Gemini 2.5 Flash Voice Processing Prompt:**
```
You are an emergency response AI. Process this raw spoken emergency report audio/transcript.
Extract and return JSON ONLY with keys:
  'title', 'category' ('Fire'|'Medical'|'Accident'|'Flood'|'Collapse'|'Other'),
  'description', 'casualties' (number), 'severity' ('Low'|'Medium'|'High'|'Critical'),
  'ai_summary' (1 sentence), and 'recommended_units' (array).
```

**Fallback Behaviour on API Failure:**
- Sets `ai_summary` = `"🎙️ Raw Voice Recording Attached (Pending Manual Admin Review)"`
- Defaults to `category: "Medical Emergency"`, `severity: "High"` for safety
- Preserves `voiceAudioUrl` on the incident so admin can play back raw audio

### Admin Voice Playback
On any incident card where `voiceAudioUrl` is present, the Admin Dashboard renders:
```html
<audio controls src="{voiceAudioUrl}" />
```
Full browser-native audio controls inline on the incident card and within the cluster accordion.

---

## 🗺️ Spatial Incident Clustering (300m Engine)

### How It Works

1. When a new report is submitted, `findClusterMatch()` checks all **active** (non-resolved) incidents with the **same normalized category** within **300m** (0.3 km) using the Haversine formula.

2. If a match is found, `buildClusterMergePayload()` is called instead of creating a new incident:
   - Appends a new `clusterReports` entry for the caller (name, description, photo, audio, timestamp)
   - Increments `clusterCount`
   - Accumulates `people_affected` across all callers
   - Stamps `last_cluster_update_at`

3. **High-Density Surge Protocol (clusterCount ≥ 3):**
   - Automatically ranks available teams using `rankTeamsForIncident()`
   - Selects up to 2 available units → forms a **Multi-Unit Fleet**
   - Updates incident status to `Assigned`, sets `multi_unit_fleet: true`, `high_density_cluster: true`
   - Shows toast: `⚠️ HIGH-DENSITY CLUSTER (N Callers at same 300m site) — Multi-Unit Fleet Dispatched: [TEAM-A] + [TEAM-B]`

4. **Category Normalization** (`normalizeCategory`) maps loose strings from voice/form:
   - `"fire"` → `Fire Emergency`
   - `"collapse"` / `"structural"` → `Building Collapse`
   - `"accident"` / `"crash"` / `"traffic"` / `"vehicle"` → `Road Accident`
   - `"flood"` / `"water"` → `Flood`
   - `"med"` / `"cardiac"` / `"health"` / `"trauma"` → `Medical Emergency`
   - anything else → `Other Emergencies`

### Cluster Accordion (Admin Dashboard)

Each cluster incident card shows an expandable **👥 View All [X] Reporter Photos, Audio & Logs** accordion. Inside:
- Per-caller entries with name, timestamp, description, photo thumbnail
- Inline `<audio controls>` player for each voice recording
- Cluster badge showing count

---

## ⚡ Automated Dispatch Engine

### Eligibility Check (`shouldAutoDispatch`)

```
incident.severity === 'High' OR 'Critical'
OR
calculatePriorityScore(incident) >= 35
```

### Execution (`executeAutoDispatch`)

1. Runs `rankTeamsForIncident(incident, teams)` → sorted fitness-score list
2. Picks first team with `status === 'Available'`
3. Computes Haversine distance and ETA (30 km/h urban average)
4. Generates Google Maps Directions URL
5. Returns update payload:
   ```js
   {
     status: 'Assigned',
     assigned_team_id, assigned_team_name, assigned_team_callsign,
     assigned_distance_km, assigned_eta_mins, assigned_route_url,
     dispatched_at, auto_dispatched: true
   }
   ```
6. Toast: `"⚡ AUTOMATED DISPATCH: 🚒 Tambaram Fire Squad (FIRE-1) deployed automatically to high-risk site (Distance: 1.8 km, ETA: ~4 mins)"`

**Manual Dispatch (Medium / Low severity):** Incident stays in `Reported` status for admin review. Admin manually selects team from the ranked list on the dashboard.

---

## 🔄 Enforced 4-Stage Incident Lifecycle

```
Reported  ──► Assigned  ──► In Progress  ──► Resolved (locked — requires proof)
```

| Stage | Status | Admin Actions Available |
|---|---|---|
| **Stage 1** | `Reported` | Dispatch Emergency Units (manual or auto-dispatch completes this) |
| **Stage 2** | `Assigned` | View assigned team, map route, mark In Progress |
| **Stage 3** | `In Progress` | Monitor active units, upload Proof of Completion |
| **Stage 4** | `Resolved` | 🔒 **Locked** — only reachable after proof photo is uploaded |

### Proof of Completion Upload
- Modal with `<input type="file" accept="image/*" capture="environment" />` for camera or gallery
- Client-side `<canvas>` resizes to max 800×800px, encodes to `image/jpeg` at quality 0.75
- Target file size: ≤ 150KB Base64
- On approval: `proof_photo_url` and `proof_uploaded_at` stamped on incident
- Resolved card renders proof thumbnail + timestamp badge

---

## 📡 Offline Mesh Relay & Sync Queue

### Trigger
When `navigator.onLine === false` and a citizen submits a report:
- Report stored in `localStorage['offline_mesh_queue']` as JSON array
- Warning banner displayed: `📡 Network Offline — Your report has been saved locally. It will be auto-submitted when connectivity is restored.`
- Queued report count shown in badge

### Auto-Flush on Reconnect
When `window` fires the `online` event:
- `flushQueue()` reads all entries from `localStorage['offline_mesh_queue']`
- Calls `onSubmitReport()` for each, running full clustering + auto-dispatch pipeline
- Clears queue from localStorage
- Shows success toast: `📡 Network Restored — N queued emergency reports auto-transmitted to Admin Command Hub.`

### Manual Flush
Admin / citizen can tap a **Retry Now** button to manually trigger `flushQueue()` while online.

---

## 🆘 1-Tap SOS Panic Button

### Behaviour
1. Citizen taps **⚡ 1-Tap SOS Panic** button
2. Second tap required within 3 seconds (double-tap anti-misfire confirmation)
3. Geolocation API requests GPS coordinates
4. Submits a Critical incident: title = `"🆘 SOS PANIC ALERT"`, category = `Other Emergencies`, severity = `Critical`
5. `autoDispatcher` immediately assigns nearest available Police + Medical team
6. Dispatch toast appears with team name, distance, and ETA

### Responsive Layout
- **Desktop** (`md:` breakpoint and above): Inline in the top navigation bar — `md:static md:ml-4 md:px-4 md:py-2 md:rounded-lg`
- **Mobile** (below `md:`): Floating Action Button — `fixed bottom-6 right-6 rounded-full w-14 h-14 z-40 text-xl`

---

## 👥 Roles & Access Control

| Role | Login | Access |
|---|---|---|
| **Citizen** | Citizen login | Incident reporter form, hands-free voice recording, STT description field, SOS button, offline queue banner |
| **Admin** | Admin login | Dispatch command dashboard only — all incident cards, team assignment panel, lifecycle management, cluster accordion, proof upload modal, Leaflet map |

No component cross-contamination: `App.jsx` conditionally renders either `PublicIncidentReporter` or `AdminDispatchDashboard` based on `role` state. Citizens never see admin components and vice versa.

---

## 📂 Project Structure

```
disaster-ops/
├── public/
│   └── index.html                        # App shell
├── src/
│   ├── components/
│   │   ├── AdminDispatchDashboard.jsx    # Admin command hub
│   │   │                                  # - Priority-sorted incident cards
│   │   │                                  # - Best-fit team selector panel
│   │   │                                  # - 4-stage lifecycle controls
│   │   │                                  # - Proof of Completion upload modal
│   │   │                                  # - Cluster accordion with audio players
│   │   │                                  # - Google Maps route button
│   │   ├── PublicIncidentReporter.jsx    # Citizen incident form
│   │   │                                  # - Text form with MCQ triage
│   │   │                                  # - Speech-to-Text microphone button
│   │   │                                  # - Full hands-free voice reporting card
│   │   │                                  # - Offline queue status banner
│   │   ├── EmergencyServicesMap.jsx      # Leaflet OpenStreetMap tactical map
│   │   │                                  # - Incident markers
│   │   │                                  # - Team base markers
│   │   │                                  # - Polyline routing overlays
│   │   │                                  # - Distance & ETA popups
│   │   ├── Navbar.jsx                    # Role-gated top navigation
│   │   │                                  # - SOS button integration
│   │   │                                  # - Network status indicator
│   │   │                                  # - Role badge
│   │   ├── LoginPage.jsx                 # Role selector (Citizen / Admin)
│   │   ├── ToastContainer.jsx            # Fixed-position alert banner
│   │   │                                  # - Auto-dispatch notifications
│   │   │                                  # - Network restore notifications
│   │   │                                  # - Cluster surge alerts
│   │   │                                  # - Dismissible with ✕ button
│   │   └── SOSButton.jsx                 # Responsive SOS FAB
│   │                                      # - Desktop: inline nav button
│   │                                      # - Mobile: bottom-right floating button
│   ├── hooks/
│   │   ├── useIncidents.js               # Incident state management
│   │   │                                  # - localStorage CRUD (key: emergency_incidents)
│   │   │                                  # - Cross-tab sync via storage event
│   │   │                                  # - addIncident, updateIncident, removeIncident
│   │   │                                  # - mergeClusterIncident (cluster merge)
│   │   │                                  # - Emergency audio alert on new High/Critical
│   │   ├── useTeams.js                   # Team state management
│   │   │                                  # - localStorage CRUD (key: disaster_ops_teams)
│   │   │                                  # - assignTeam (single unit)
│   │   │                                  # - assignMultipleTeams (fleet surge)
│   │   │                                  # - releaseTeamByIncident
│   │   │                                  # - resetAllTeams
│   │   └── useOfflineQueue.js            # Offline mesh relay
│   │                                      # - enqueueReport (offline storage)
│   │                                      # - flushQueue (auto-submit on reconnect)
│   │                                      # - manualFlush, clearQueue
│   │                                      # - isOnline, queuedCount, lastFlushMessage
│   ├── utils/
│   │   ├── geminiTriage.js               # Gemini 2.5 Flash API integration
│   │   │                                  # - CATEGORY_STATIC_MCQS (fallback per category)
│   │   │                                  # - generateDynamicMCQs(category, description)
│   │   │                                  # - analyzeIncidentWithGemini(formData, mcqAnswers)
│   │   │                                  # - processVoiceReportWithGemini(transcript, audioB64)
│   │   │                                  # - inferFallback() (safe defaults on failure)
│   │   ├── autoDispatcher.js             # Automated dispatch engine
│   │   │                                  # - shouldAutoDispatch(incident)
│   │   │                                  # - executeAutoDispatch(incident, teams)
│   │   ├── clusteringEngine.js           # 300m Haversine spatial clustering
│   │   │                                  # - CLUSTER_RADIUS_KM = 0.3
│   │   │                                  # - normalizeCategory(category)
│   │   │                                  # - findClusterMatch(newIncident, existingIncidents)
│   │   │                                  # - buildClusterMergePayload(matched, newReport, teams)
│   │   ├── prioritizer.js                # Dynamic priority scoring
│   │   │                                  # - SEVERITY_WEIGHTS, CATEGORY_WEIGHTS
│   │   │                                  # - calculatePriorityScore(incident)
│   │   │                                  # - getPriorityBreakdown(incident)
│   │   │                                  # - sortIncidentsByPriority(incidents)
│   │   │                                  # - calculateHaversineDistance(lat1,lon1,lat2,lon2)
│   │   │                                  # - estimateArrivalTimeMinutes(distanceKm)
│   │   ├── severityCalculator.js         # MCQ triage score → severity classification
│   │   └── audioAlert.js                 # Browser-synthesized emergency beep
│   ├── data/
│   │   ├── mockSeedData.js               # Bootstrap incidents for localStorage
│   │   │                                  # - Structural Collapse (Critical, 14 casualties)
│   │   │                                  # - Highway Multi-Car Crash (High, cluster demo)
│   │   │                                  # - Flash Flood Warning (High)
│   │   └── teams.js                      # Pre-seeded response teams
│   │                                      # - PRESEEDED_TEAMS (FIRE-1, MED-108, POLICE-104, NDRF-1)
│   │                                      # - getGoogleMapsDirectionsUrl(team, incident)
│   │                                      # - rankTeamsForIncident(incident, teams)
│   │                                      # - getBestFitTeam(incident, teams)
│   ├── App.jsx                           # Root — role routing + global state orchestration
│   │                                      # - Clustering integration on submit
│   │                                      # - Auto-dispatch pipeline
│   │                                      # - Toast state management
│   │                                      # - SOS handler
│   ├── main.jsx                          # React 18 root mount
│   └── index.css                         # Tailwind directives + custom scrollbar
├── .env                                  # 🔒 LOCAL ONLY (gitignored) — VITE_GEMINI_API_KEY
├── .env.example                          # ✅ Git-tracked template — placeholder key
├── .gitignore                            # node_modules/, dist/, .env, .env.local
├── package.json                          # Dependencies and npm scripts
├── vite.config.js                        # Vite configuration with React plugin
├── tailwind.config.js                    # Tailwind content paths
├── postcss.config.js                     # PostCSS + autoprefixer
└── README.md                             # This file
```

---

## ⚙️ Installation & Setup

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | `18.x` or `20.x` (LTS) | JavaScript runtime |
| **npm** | `9.x+` | Package manager |
| **Git** | `2.30+` | Version control |
| **Modern Browser** | Chrome 90+, Firefox 88+, Edge 90+ | MediaRecorder + SpeechRecognition API support |

> **Microphone permission** must be granted by the browser for voice reporting and speech-to-text features.

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/disaster-ops.git
cd disaster-ops
```

---

### Step 2: Install Dependencies

```bash
npm install
```

This installs all dependencies listed in `package.json`:

```json
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "lucide-react": "^1.16.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-leaflet": "^4.2.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^6.0.7"
  }
}
```

---

### Step 3: Configure Environment Variables

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Open `.env` and add your Gemini API key:

```env
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Get a free key at [https://ai.google.dev/](https://ai.google.dev/).

> ⚠️ The app works in **full fallback mode without an API key**:
> - Static MCQs are served per category instead of Gemini-generated ones
> - Voice recordings are stored as raw Base64 audio on the incident for manual admin review
> - All other features (clustering, dispatch, offline queue, map) function normally

---

### Step 4: Start the Development Server

```bash
npm run dev
```

The development server starts on **[http://localhost:5173](http://localhost:5173)** by default.

```
  VITE v6.0.7  ready in 312 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

---

### Step 5: Explore the Platform

| URL | Role | What You'll See |
|---|---|---|
| `http://localhost:5173` | Login Page | Role selector — Citizen or Admin |
| Citizen → Form Tab | Citizen | Incident report form with live Gemini MCQs |
| Citizen → Voice Tab | Citizen | Full hands-free voice reporting card |
| Admin → Dashboard | Admin | Priority-sorted incident cards, team panel, map |

**Demo Data:** On first load, 3 seed incidents are bootstrapped into localStorage automatically:
1. **Structural Collapse Alert** — Critical, 14 casualties (Tambaram area)
2. **Highway Multi-Car Crash** — High, cluster of 3 callers, multi-unit fleet demo
3. **Flash Flood Warning** — High severity

---

### Step 6: Build for Production

```bash
npm run build
```

Output: `dist/` folder. Expected output:
```
✓ 2093 modules transformed
dist/index.html                     0.91 kB │ gzip:  0.57 kB
dist/assets/index-*.css            47.97 kB │ gzip:  8.29 kB
dist/assets/leaflet-src-*.js      150.05 kB │ gzip: 43.58 kB
dist/assets/index-*.js            355.04 kB │ gzip: 99.79 kB
✓ built in ~31s
```

Preview the production build locally:
```bash
npm run preview
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Description | Default |
|---|---|---|---|
| `VITE_GEMINI_API_KEY` | Recommended | Google Gemini 2.5 Flash API key (`import.meta.env.VITE_GEMINI_API_KEY`) | `''` (empty — fallback mode) |

> All `VITE_` prefixed variables are safely injected at build time by Vite and accessible in-browser via `import.meta.env`. Never commit `.env` — only `.env.example` is tracked by git.

---

## 🔒 Security & Git Hygiene

| File | Git Status | Purpose |
|---|---|---|
| `.env` | ❌ **Gitignored** | Contains live API key — never committed |
| `.env.example` | ✅ Tracked | Placeholder template for new contributors |
| `.env.local` | ❌ **Gitignored** | Local override (Vite convention) |
| `.env.production` | ❌ **Gitignored** | Production secrets |
| `node_modules/` | ❌ **Gitignored** | npm packages |
| `dist/` | ❌ **Gitignored** | Build output |

### Client-Side Security Notes
- API key is a **client-side Vite env var** — it is bundled into the JavaScript output. For production deployment, restrict your Gemini API key to your domain in the Google Cloud Console.
- Role isolation is **client-side only** (hackathon scope) — not a backend authentication system.
- All `target="_blank"` links include `rel="noopener noreferrer"`.
- Photo proof-of-completion compressed client-side to ≤ 150KB to prevent localStorage bloat.
- Voice audio stored as Base64 is bounded by the browser's localStorage limit (~5–10MB).

---

## 🌟 Novelty & Competitive Analysis

| Capability | DISASTER-OPS | Generic Dispatch Systems | Static Government Portals |
|---|---|---|---|
| **AI Triage** | ✅ Gemini 2.5 Flash dynamic MCQs + voice extraction | ❌ Manual forms | ❌ Phone call only |
| **Auto Dispatch** | ✅ Instant on High/Critical (Priority Score ≥ 35) | ⚠️ Manual always | ❌ No dispatch |
| **Spatial Clustering** | ✅ 300m Haversine merge + surge protocol | ❌ Duplicates stack | ❌ No dedup |
| **Voice Input** | ✅ MediaRecorder + Web Speech (Tamil + English) | ❌ Text only | ❌ Phone only |
| **Offline Resilience** | ✅ localStorage queue + auto-flush | ❌ Online only | ❌ Online only |
| **Tactical Map** | ✅ Leaflet + OpenStreetMap (keyless) | ❌ Or expensive GIS | ❌ No map |
| **Priority Scoring** | ✅ Dynamic formula (severity + casualties + time + cluster) | ❌ Manual triage | ❌ FIFO only |
| **Proof of Completion** | ✅ Enforced photo upload before Resolved status | ❌ No enforcement | ❌ No tracking |

---

## ⚠️ Known Limitations & Hackathon Scope Notes

- **No Backend Server:** All state is in `localStorage` — data does not persist across different devices or browsers. A production version would need a REST API + database.
- **Client-Side Role Auth:** Login role selection is not cryptographically secured — suitable for demo/hackathon purposes only.
- **Gemini API Rate Limits:** Free-tier Gemini API may rate-limit under heavy simultaneous use. Static MCQ fallbacks activate automatically.
- **SpeechRecognition Browser Support:** `window.SpeechRecognition` is fully supported in Chrome/Edge; limited in Firefox and Safari.
- **MediaRecorder Codec Varies:** `audio/webm` is supported in Chrome/Edge; Firefox may use `audio/ogg`. Both are handled gracefully.
- **LocalStorage Quota:** Storing many Base64 voice/photo blobs may approach the browser's ~5–10MB localStorage limit. For production, blobs should be uploaded to object storage (e.g., Firebase Storage, S3).

---

## 📄 License

MIT License — Built for Hackathon purposes.

```
Copyright 2026 DISASTER-OPS Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🧩 Team

**DISASTER-OPS Hackathon Build**

- **Repository:** [https://github.com/viswajith060606/Disaster-Ops](https://github.com/your-username/disaster-ops)
- **Issue Tracker:** [https://github.com/Viswajith060606/Disaster-Ops/issues](https://github.com/your-username/disaster-ops/issues)
- **Built With:** React 18 + Vite + Tailwind + Leaflet + Gemini 2.5 Flash
- **Operational Region:** Chennai / Tambaram Metropolitan Emergency Corridor (Demo Data)

> _"When every second counts, the platform should think faster than the disaster."_
