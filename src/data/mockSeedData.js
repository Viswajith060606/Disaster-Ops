// Mock Seed Data for Bootstrapping LocalStorage if empty

export const MOCK_SEED_INCIDENTS = [
  {
    id: "INC-1731215400000",
    title: "Structural Collapse Alert",
    description: "Partial roof and 2nd-floor beam collapse at commercial plaza near Tambaram bus terminus. Multiple individuals trapped under concrete debris. Emergency extrication teams required immediately.",
    category: "Building Collapse",
    people_affected: 14,
    contact_info: "+919876543210",
    severity: "Critical",
    status: "Reported",
    latitude: 12.8900,
    longitude: 80.0800,
    photo_url: "https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=600&q=80",
    ai_summary: "Major structural failure with 14 trapped victims; urgent heavy extrication and trauma response dispatched.",
    recommended_units: ["NDRF Search & Rescue", "Heavy Crane Extrication Crew", "108 Mobile Trauma Unit"],
    created_at_ms: Date.now() - 1000 * 60 * 18,
    created_at: new Date(Date.now() - 1000 * 60 * 18).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  },
  {
    id: "INC-1731211800000",
    title: "Highway Multi-Car Crash",
    description: "Multi-vehicle pileup involving an oil tanker and 3 passenger cars on GST Road bypass near Kilambakkam. Fuel leakage detected, 6 passengers injured.",
    category: "Road Accident",
    people_affected: 6,
    contact_info: "+919876543211",
    severity: "High",
    status: "Assigned",
    assigned_team_id: "POLICE-104",
    assigned_team_name: "Sector Patrol (POLICE-104) + Kilambakkam Ambulance (MED-108)",
    dispatched_units: ["Sector Patrol (POLICE-104)", "Kilambakkam Ambulance (MED-108)", "Tambaram Foam Tender"],
    multi_unit_fleet: true,
    high_density_cluster: true,
    clusterCount: 3,
    is_cluster_group: true,
    voiceAudioUrl: "https://actions.google.com/sounds/v1/emergency/police_siren.ogg",
    clusterReports: [
      {
        id: "INC-1731211800000-R1",
        caller_name: "Caller #1 (Primary Highway Driver)",
        contact_info: "+919876543211",
        title: "Highway Multi-Car Crash",
        description: "Multi-vehicle pileup involving an oil tanker and 3 passenger cars on GST Road bypass near Kilambakkam. Fuel leakage detected, 6 passengers injured.",
        photo_url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80",
        voiceAudioUrl: "https://actions.google.com/sounds/v1/emergency/police_siren.ogg",
        audio_url: "https://actions.google.com/sounds/v1/emergency/police_siren.ogg",
        timestamp: "10 mins ago",
        people_affected: 3
      },
      {
        id: "INC-1731211800000-R2",
        caller_name: "Caller #2 (Bystander Shopkeeper)",
        contact_info: "+919840123456",
        title: "Tanker Fuel Spill & Trapped Victims",
        description: "Heavy fuel leaking onto south-bound lanes. 2 passengers trapped in crumpled sedan. Smoke rising from under engine bay.",
        photo_url: "https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=600&q=80",
        voiceAudioUrl: "https://actions.google.com/sounds/v1/emergency/ambulance_siren.ogg",
        audio_url: "https://actions.google.com/sounds/v1/emergency/ambulance_siren.ogg",
        timestamp: "6 mins ago",
        people_affected: 2
      },
      {
        id: "INC-1731211800000-R3",
        caller_name: "Caller #3 (Bus Passenger / Voice Report)",
        contact_info: "+919710987654",
        title: "GST Road Complete Gridlock",
        description: "Massive pileup blocking ambulance approach. Need traffic diversion immediately at Kilambakkam toll gate.",
        photo_url: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80",
        voiceAudioUrl: "https://actions.google.com/sounds/v1/emergency/fire_truck_siren.ogg",
        audio_url: "https://actions.google.com/sounds/v1/emergency/fire_truck_siren.ogg",
        timestamp: "2 mins ago",
        people_affected: 1
      }
    ],
    assigned_at: new Date(Date.now() - 1000 * 60 * 25).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    latitude: 12.9010,
    longitude: 80.0750,
    photo_url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80",
    ai_summary: "Multi-lane collision with active fuel hazard; highway patrol assigned with foam tender support.",
    recommended_units: ["Kilambakkam Highway Patrol", "Tambaram Foam Tender", "Ambulance 108"],
    created_at_ms: Date.now() - 1000 * 60 * 35,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  },
  {
    id: "INC-1731213600000",
    title: "Chemical Factory Toxic Gas Flare",
    description: "Acrid dense sulfur emissions spreading from storage valve failure at small industrial workshop. 4 workers experiencing acute respiratory distress.",
    category: "Fire Emergency",
    people_affected: 4,
    contact_info: "+919876543213",
    severity: "High",
    status: "In Progress",
    assigned_team_id: "FIRE-1",
    assigned_team_name: "Tambaram Fire Squad (FIRE-1)",
    dispatched_units: ["Tambaram Fire Squad (FIRE-1)", "108 ALS Ambulance"],
    assigned_at: new Date(Date.now() - 1000 * 60 * 40).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    in_progress_at: new Date(Date.now() - 1000 * 60 * 20).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    latitude: 12.9150,
    longitude: 80.1100,
    photo_url: "https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=600&q=80",
    ai_summary: "Active chemical vapor release; fire hazmat team on-site with SCBA neutralizing source valve.",
    recommended_units: ["Tambaram Fire Squad (FIRE-1)", "108 Ambulance"],
    created_at_ms: Date.now() - 1000 * 60 * 50,
    created_at: new Date(Date.now() - 1000 * 60 * 50).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  },
  {
    id: "INC-1731208200000",
    title: "Submerged Street Alert",
    description: "Flash urban waterlogging rising above 3.5 feet following canal overflow. Ground-floor residences flooded, power lines cut. 3 elderly residents awaiting boat evacuation.",
    category: "Flood",
    people_affected: 3,
    contact_info: "+919876543212",
    severity: "Medium",
    status: "Resolved",
    assigned_team_id: "NDRF-1",
    assigned_team_name: "Heavy Rescue Platoon (NDRF-1)",
    dispatched_units: ["Heavy Rescue Platoon (NDRF-1)", "Civil Defense Flood Raft Unit"],
    assigned_at: new Date(Date.now() - 1000 * 60 * 95).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    resolved_at: new Date(Date.now() - 1000 * 60 * 15).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    resolution_notes: "Flood waters receded. All 3 elderly residents safely evacuated to dry municipal shelter. Power lines cordoned.",
    resolution_proof_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
    latitude: 12.8850,
    longitude: 80.0900,
    photo_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
    ai_summary: "Local street submergence requiring shallow-draft inflatable rafts for elderly residential evacuation.",
    recommended_units: ["Civil Defense Flood Raft Unit", "Heavy Rescue Platoon"],
    created_at_ms: Date.now() - 1000 * 60 * 110,
    created_at: new Date(Date.now() - 1000 * 60 * 110).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }
];

export const INCIDENT_CATEGORIES = [
  "Fire Emergency",
  "Road Accident",
  "Medical Emergency",
  "Flood",
  "Building Collapse",
  "Other Emergencies"
];

// Enforced 4-Stage Incident Lifecycle
export const INCIDENT_STATUSES = [
  "Reported",
  "Assigned",
  "In Progress",
  "Resolved"
];

export const SEVERITY_LEVELS = [
  "Critical",
  "High",
  "Medium",
  "Low"
];
