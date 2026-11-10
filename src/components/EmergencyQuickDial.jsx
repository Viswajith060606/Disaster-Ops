import React, { useState } from 'react';
import {
  Phone, MapPin, ChevronDown, ChevronUp, ShieldAlert,
  Siren, Flame, HeartPulse, Radio,
} from 'lucide-react';

export default function EmergencyQuickDial() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">

        {/* Top strip */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <Siren className="w-4 h-4 text-red-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              Emergency Speed Dial Hub
            </span>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              Live Gateway Active
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200"
            aria-label="Toggle Quick Dial Bar"
          >
            <span>{isExpanded ? 'Collapse' : 'Speed Dial'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expanded dial content */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">

            {/* National lines */}
            <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1 mr-1">
                <Radio className="w-3.5 h-3.5 text-red-500" /> National:
              </span>

              <a href="tel:100"
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg font-bold transition-all hover:shadow-sm active:scale-95">
                <ShieldAlert className="w-3.5 h-3.5" /> Police (100)
              </a>

              <a href="tel:108"
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg font-bold transition-all hover:shadow-sm active:scale-95">
                <HeartPulse className="w-3.5 h-3.5" /> Ambulance (108)
              </a>

              <a href="tel:101"
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-lg font-bold transition-all hover:shadow-sm active:scale-95">
                <Flame className="w-3.5 h-3.5" /> Fire (101)
              </a>

              <a href="tel:1070"
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-lg font-bold transition-all hover:shadow-sm active:scale-95">
                <Siren className="w-3.5 h-3.5" /> Disaster (1070)
              </a>
            </div>

            {/* Local responders */}
            <div className="lg:col-span-7 flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1 mr-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Nearest:
              </span>

              {/* Kilambakkam Police */}
              <div className="inline-flex items-center rounded-lg bg-white border border-slate-200 overflow-hidden shadow-sm">
                <span className="px-2 py-1 text-slate-700 font-medium text-[11px]">🚓 Kilambakkam Police</span>
                <a href="tel:100"
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors border-l border-slate-200 flex items-center gap-0.5 text-[11px]">
                  <Phone className="w-3 h-3" /> Call
                </a>
                <a href="https://www.google.com/maps/search/?api=1&query=Kilambakkam+police+station"
                  target="_blank" rel="noopener noreferrer"
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors border-l border-slate-200 flex items-center gap-0.5 text-[11px]">
                  <MapPin className="w-3 h-3 text-red-500" /> Map
                </a>
              </div>

              {/* Hindu Mission Hospital */}
              <div className="inline-flex items-center rounded-lg bg-white border border-slate-200 overflow-hidden shadow-sm">
                <span className="px-2 py-1 text-slate-700 font-medium text-[11px]">🏥 Hindu Mission Hosp</span>
                <a href="tel:04422262244"
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors border-l border-slate-200 flex items-center gap-0.5 text-[11px]">
                  <Phone className="w-3 h-3" /> 044-22262244
                </a>
                <a href="https://www.google.com/maps/search/?api=1&query=Hindu+Mission+Hospital+Tambaram"
                  target="_blank" rel="noopener noreferrer"
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors border-l border-slate-200 flex items-center gap-0.5 text-[11px]">
                  <MapPin className="w-3 h-3 text-red-500" /> Map
                </a>
              </div>

              {/* Tambaram Fire */}
              <div className="inline-flex items-center rounded-lg bg-white border border-slate-200 overflow-hidden shadow-sm">
                <span className="px-2 py-1 text-slate-700 font-medium text-[11px]">🚒 Tambaram Fire</span>
                <a href="tel:09445086053"
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold transition-colors border-l border-slate-200 flex items-center gap-0.5 text-[11px]">
                  <Phone className="w-3 h-3" /> 09445086053
                </a>
                <a href="https://www.google.com/maps/search/?api=1&query=Tambaram+Fire+Rescue+Station"
                  target="_blank" rel="noopener noreferrer"
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors border-l border-slate-200 flex items-center gap-0.5 text-[11px]">
                  <MapPin className="w-3 h-3 text-red-500" /> Map
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
