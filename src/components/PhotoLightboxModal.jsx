import React, { useState } from 'react';
import { X, MapPin, Phone, Navigation, AlertCircle, Sparkles, CheckCircle2, Camera } from 'lucide-react';
import { SEVERITY_CONFIG, STATUS_CONFIG } from '../utils/severityCalculator';

export default function PhotoLightboxModal({ incident, initialView = 'scene', onClose }) {
  if (!incident) return null;
  const severityStyle = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.Low;
  const statusStyle = STATUS_CONFIG[incident.status] || STATUS_CONFIG.Reported;

  const [activePhoto, setActivePhoto] = useState(
    initialView === 'proof' && incident.resolution_proof_url ? 'proof' : (incident.photo_url ? 'scene' : (incident.resolution_proof_url ? 'proof' : 'scene'))
  );

  const displayedImage = activePhoto === 'proof' ? incident.resolution_proof_url : incident.photo_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 shadow-sm transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image pane */}
        <div className="md:w-3/5 bg-slate-100 flex flex-col items-center justify-center min-h-[300px] p-4 border-b md:border-b-0 md:border-r border-slate-200 relative">
          
          {/* Photo Switcher Tabs if both photos exist */}
          {(incident.photo_url && incident.resolution_proof_url) && (
            <div className="absolute top-3 left-3 z-10 flex items-center bg-white/90 backdrop-blur-sm p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setActivePhoto('scene')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activePhoto === 'scene'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" /> Scene Photo
              </button>
              <button
                type="button"
                onClick={() => setActivePhoto('proof')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activePhoto === 'proof'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Proof of Resolution
              </button>
            </div>
          )}

          {displayedImage ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <img
                src={displayedImage}
                alt={activePhoto === 'proof' ? 'Proof of completion photo' : incident.title}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-sm"
              />
              <span className="mt-2 text-[11px] font-semibold text-slate-500 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200">
                {activePhoto === 'proof' ? '✅ Attached Proof of Completion' : '📸 Initial Reported Scene Photo'}
              </span>
            </div>
          ) : (
            <div className="text-slate-400 flex flex-col items-center p-8 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-medium">No photo uploaded</p>
            </div>
          )}
        </div>

        {/* Detail sidebar */}
        <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto bg-white">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${severityStyle.badgeClass}`}>
                {incident.severity}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusStyle.badgeClass}`}>
                {incident.status}
              </span>
              <span className="text-xs font-mono text-slate-400">{incident.id}</span>
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight">{incident.title}</h3>

            <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
              {incident.description}
            </p>

            {/* AI Summary Badge in Modal */}
            {incident.ai_summary && (
              <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                <div className="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  AI Situational Analysis:
                </div>
                <p className="text-slate-700 leading-relaxed">{incident.ai_summary}</p>
                {incident.recommended_units?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-100 flex flex-wrap gap-1">
                    {incident.recommended_units.map((u, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-white border border-blue-200 text-blue-800 text-[10px] font-semibold">
                        {u}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Resolution Details if Resolved */}
            {incident.status === 'Resolved' && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Resolution Log:
                </div>
                {incident.resolved_at && (
                  <div className="text-slate-600 text-[11px]">
                    <strong>Completed At:</strong> {incident.resolved_at}
                  </div>
                )}
                {incident.resolution_notes && (
                  <div className="text-slate-700 text-[11px] bg-white p-2 rounded-lg border border-emerald-100">
                    "{incident.resolution_notes}"
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium w-24">Category:</span>
                <span className="font-semibold text-slate-800">{incident.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium w-24">Casualties:</span>
                <span className="font-semibold text-amber-700">{incident.people_affected} person(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium w-24">Reported:</span>
                <span className="text-slate-500">{incident.created_at}</span>
              </div>
              {incident.dispatched_at && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium w-24">Dispatched:</span>
                  <span className="text-blue-700 font-semibold">{incident.dispatched_at}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium w-24">Coordinates:</span>
                <span className="font-mono text-blue-600">{incident.latitude}, {incident.longitude}</span>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100 mt-5 space-y-2">
            <a
              href={`tel:${incident.contact_info}`}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Phone className="w-4 h-4" /> Call Reporter ({incident.contact_info})
            </a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 transition-colors"
            >
              <Navigation className="w-4 h-4 text-emerald-600" /> Open Fastest Route in Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
