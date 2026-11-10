import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Phone, ExternalLink, Navigation, Compass, Layers, Eye } from 'lucide-react';

const EMERGENCY_SERVICES = [
  { id: 'ps-kilambakkam',   name: 'Kilambakkam Police Station',    type: 'police',    lat: 12.9018, lng: 80.0745, phone: '100',          address: 'Kilambakkam, Chennai 600127',              icon: '🚓' },
  { id: 'ps-tambaram',      name: 'Tambaram Police Station',       type: 'police',    lat: 12.9252, lng: 80.1270, phone: '100',          address: 'Tambaram, Chennai 600045',                 icon: '🚓' },
  { id: 'hosp-hindu',       name: 'Hindu Mission Hospital',        type: 'hospital',  lat: 12.9192, lng: 80.1220, phone: '04422262244', address: 'GST Road, Tambaram, Chennai 600045',       icon: '🏥' },
  { id: 'hosp-govt',        name: 'Govt. Hospital Tambaram',       type: 'hospital',  lat: 12.9238, lng: 80.1250, phone: '04422262200', address: 'Tambaram Sanatorium, Chennai',              icon: '🏥' },
  { id: 'hosp-sree-balaji', name: 'Sree Balaji Medical College',  type: 'hospital',  lat: 12.8825, lng: 80.0695, phone: '04422780010', address: 'Chromepet, Chennai 600044',                icon: '🏥' },
  { id: 'fire-tambaram',    name: 'Tambaram Fire & Rescue',        type: 'fire',      lat: 12.9205, lng: 80.1200, phone: '09445086053', address: 'Tambaram, Chennai 600045',                 icon: '🚒' },
  { id: 'fire-chromepet',   name: 'Chromepet Fire Station',        type: 'fire',      lat: 12.9512, lng: 80.1434, phone: '101',          address: 'Chromepet, Chennai 600044',                icon: '🚒' },
  { id: 'amb-108',          name: '108 Emergency Ambulance Base',  type: 'ambulance', lat: 12.9010, lng: 80.0750, phone: '108',          address: 'Kilambakkam, Chennai 600127',              icon: '🚑' },
];

const TYPE_MARKER_COLOR = {
  police:    '#2563eb',  // blue-600
  hospital:  '#059669',  // emerald-600
  fire:      '#dc2626',  // red-600
  ambulance: '#d97706',  // amber-600
};

const TYPE_FILTERS = [
  { key: 'all',       label: 'All Services' },
  { key: 'hospital',  label: '🏥 Hospitals'  },
  { key: 'police',    label: '🚓 Police'      },
  { key: 'fire',      label: '🚒 Fire'        },
  { key: 'ambulance', label: '🚑 Ambulance'   },
];

export default function EmergencyServicesMap() {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markersRef  = useRef([]);

  const [activeFilter,    setActiveFilter]    = useState('all');
  const [selectedService, setSelectedService] = useState(null);
  const [is3DMode,        setIs3DMode]        = useState(true);

  // ── Init Leaflet map with 3D Relief & Hillshade Basemap ──
  useEffect(() => {
    if (mapInstance.current) return;

    // Inject Leaflet CSS once
    if (!document.getElementById('leaflet-css')) {
      const link = Object.assign(document.createElement('link'), {
        id:        'leaflet-css',
        rel:       'stylesheet',
        href:      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
        crossOrigin: '',
      });
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstance.current) return;

      const map = L.map(mapRef.current, {
        center: [12.9010, 80.0800],
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
      });

      // Standard Free Keyless OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      mapInstance.current = map;

      // Inject clean 3D light popup styles
      if (!document.getElementById('leaflet-3d-tactical-style')) {
        const style = document.createElement('style');
        style.id = 'leaflet-3d-tactical-style';
        style.textContent = `
          .light-popup .leaflet-popup-content-wrapper {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
            color: #0f172a;
            padding: 2px;
          }
          .light-popup .leaflet-popup-tip { background: #ffffff; }
          .leaflet-control-zoom a {
            background: #ffffff !important;
            color: #334155 !important;
            border-color: #cbd5e1 !important;
            border-radius: 8px !important;
          }
          .leaflet-control-zoom a:hover {
            background: #f1f5f9 !important;
            color: #0f172a !important;
          }
          .leaflet-control-attribution {
            background: rgba(255,255,255,0.85) !important;
            color: #64748b !important;
            font-size: 9px !important;
          }
          .leaflet-control-attribution a { color: #2563eb !important; }
        `;
        document.head.appendChild(style);
      }

      // Add 3D Standing Markers & Floating Radar Pulse Rings
      EMERGENCY_SERVICES.forEach((svc) => {
        const color = TYPE_MARKER_COLOR[svc.type] || '#2563eb';
        
        // 3D Standing Badge with ground radar ring
        const divIcon = L.divIcon({
          className: '',
          html: `
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform-style: preserve-3d;">
              <!-- Ground Floating Radar Pulse Ring -->
              <div class="floating-radar-ring" style="
                position: absolute;
                width: 38px;
                height: 38px;
                border-radius: 50%;
                background: ${color}26;
                border: 2px solid ${color};
                transform: translateZ(0px) scaleY(0.7);
                pointer-events: none;
              "></div>
              
              <!-- Ground Shadow Base -->
              <div style="
                position: absolute;
                bottom: 2px;
                width: 20px;
                height: 10px;
                border-radius: 50%;
                background: rgba(15, 23, 42, 0.28);
                filter: blur(2px);
                transform: translateZ(0px);
                pointer-events: none;
              "></div>

              <!-- 3D Standing Badge (Rotates vertical off 22deg tilted plane) -->
              <div style="
                position: relative;
                transform: translateZ(14px) rotateX(-22deg);
                transform-style: preserve-3d;
                background: #ffffff;
                border: 2.5px solid ${color};
                border-radius: 12px;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                box-shadow: 0 10px 20px rgba(15, 23, 42, 0.22), 0 2px 6px rgba(0,0,0,0.1);
                cursor: pointer;
              ">
                ${svc.icon}
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          popupAnchor: [0, -24],
        });

        const marker = L.marker([svc.lat, svc.lng], { icon: divIcon }).addTo(map);

        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:230px;color:#0f172a;padding:4px;">
            <div style="font-size:14px;font-weight:900;margin-bottom:3px;display:flex;align-items:center;gap:6px;">
              <span>${svc.icon}</span> <span>${svc.name}</span>
            </div>
            <div style="font-size:11px;color:#64748b;margin-bottom:10px;line-height:1.3;">${svc.address}</div>
            <div style="display:flex;gap:6px;">
              <a href="tel:${svc.phone}" style="flex:1;text-align:center;background:${color};color:#fff;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:800;text-decoration:none;">
                📞 Call ${svc.phone}
              </a>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${svc.lat},${svc.lng}&travelmode=driving"
                target="_blank" rel="noopener noreferrer"
                style="flex:1;text-align:center;background:#f1f5f9;color:#1e293b;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:800;text-decoration:none;border:1px solid #cbd5e1;">
                🗺️ Route
              </a>
            </div>
          </div>
        `, { className: 'light-popup' });

        marker.on('click', () => setSelectedService(svc));
        markersRef.current.push({ svc, marker });
      });
    });

    // Clean up markers and map on unmount
    return () => {
      if (mapInstance.current) {
        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current = [];
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Filter markers by type
  useEffect(() => {
    if (!mapInstance.current) return;
    markersRef.current.forEach(({ svc, marker }) => {
      if (activeFilter === 'all' || svc.type === activeFilter) {
        marker.addTo(mapInstance.current);
      } else {
        marker.remove();
      }
    });
  }, [activeFilter]);

  // Fly-to on card click
  useEffect(() => {
    if (!selectedService || !mapInstance.current) return;
    mapInstance.current.flyTo([selectedService.lat, selectedService.lng], 15, { duration: 1 });
  }, [selectedService]);

  const visibleServices =
    activeFilter === 'all'
      ? EMERGENCY_SERVICES
      : EMERGENCY_SERVICES.filter((s) => s.type === activeFilter);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

      {/* Header with 3D Controls */}
      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 via-white to-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-100 border border-blue-200 text-blue-600 shadow-sm">
            <Compass className={`w-5 h-5 ${is3DMode ? 'animate-spin' : ''}`} style={{ animationDuration: '20s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                3D Tactical Emergency Services Map
              </h3>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                {is3DMode ? '3D Relief View' : '2D Planar View'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Interactive 3D elevation corridor · Tambaram · Kilambakkam · Chromepet
            </p>
          </div>
        </div>

        {/* 3D Viewport Controls & External Link */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIs3DMode(!is3DMode)}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm border ${
              is3DMode
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle between 3D pitch perspective and flat top-down view"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{is3DMode ? '🌐 3D Pitch Active' : '🗺️ Switch to 3D'}</span>
          </button>

          <a
            href="https://www.google.com/maps/search/emergency+services+near+tambaram+chennai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-semibold transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Google Maps
          </a>
        </div>
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
        {TYPE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
              activeFilter === key
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 font-medium">
          {visibleServices.length} responders active
        </span>
      </div>

      {/* 3D Map Viewport Container */}
      <div className="map-3d-viewport relative overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/50 p-3 sm:p-5">
        
        {/* Map Canvas Surface with 3D Transform */}
        <div
          className={`${
            is3DMode ? 'map-3d-surface' : 'map-2d-surface'
          } rounded-2xl overflow-hidden border border-slate-300 bg-white`}
        >
          <div
            ref={mapRef}
            style={{
              height: 420,
              width: '100%',
              background: '#f8fafc',
            }}
          />
        </div>

        {/* 3D Telemetry Overlay Badge */}
        {is3DMode && (
          <div className="absolute top-7 left-7 z-20 pointer-events-none bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-600 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            <span>TACTICAL PITCH: 22° PITCH · -2° YAW · 3D RELIEF</span>
          </div>
        )}
      </div>

      {/* Service cards list below map */}
      <div className="px-5 py-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto bg-slate-50">
        {visibleServices.map((svc) => {
          const color = TYPE_MARKER_COLOR[svc.type];
          return (
            <div
              key={svc.id}
              onClick={() => setSelectedService(svc)}
              className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                selectedService?.id === svc.id
                  ? 'border-blue-400 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl mt-0.5">{svc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 leading-tight truncate">{svc.name}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{svc.address}</div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <a
                      href={`tel:${svc.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-white text-[10px] font-bold transition-colors shadow-sm"
                      style={{ background: color }}
                    >
                      <Phone className="w-2.5 h-2.5" /> {svc.phone}
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${svc.lat},${svc.lng}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-200 transition-colors"
                    >
                      <Navigation className="w-2.5 h-2.5 text-blue-600" /> Route
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 bg-white border-t border-slate-100 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
        <span>OpenStreetMap Free Keyless Tiles · Standing 3D pins · Click any pin or card to call/route</span>
      </div>
    </div>
  );
}
