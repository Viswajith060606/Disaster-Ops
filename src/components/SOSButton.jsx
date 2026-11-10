// src/components/SOSButton.jsx
/**
 * Responsive SOS Panic Button component.
 *
 * Props
 * -----
 * @param {function} onClick   Click handler that triggers the SOS flow.
 * @param {boolean}  disabled  Whether the button is disabled (after trigger).
 * @param {boolean}  confirm   Indicates the first‑tap confirmation state.
 * @param {boolean}  triggered Indicates the SOS has been sent (second tap).
 */
import React from 'react';
import { Zap } from 'lucide-react';

export default function SOSButton({ onClick, disabled, confirm, triggered }) {
  const baseClasses =
    'flex items-center gap-2 font-black uppercase tracking-wider shadow-md transition-all active:scale-95';
  const desktopClasses = `md:static md:ml-4 md:px-4 md:py-2 md:rounded-lg ${
    triggered
      ? 'bg-emerald-600 text-white border border-emerald-700 cursor-not-allowed'
      : confirm
      ? 'bg-red-700 text-white border border-red-800 animate-pulse ring-2 ring-red-400 ring-offset-1'
      : 'bg-red-600 hover:bg-red-700 text-white border border-red-700 hover:shadow-lg hover:shadow-red-200'
  }`;
  const mobileClasses = `fixed bottom-6 right-6 rounded-full w-14 h-14 z-40 text-xl ${
    triggered
      ? 'bg-emerald-600 text-white border border-emerald-700 cursor-not-allowed'
      : confirm
      ? 'bg-red-700 text-white border border-red-800 animate-pulse ring-2 ring-red-400 ring-offset-1'
      : 'bg-red-600 hover:bg-red-700 text-white border border-red-700 hover:shadow-lg hover:shadow-red-200'
  }`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${desktopClasses} ${mobileClasses}`}
      title={confirm ? 'Tap again to confirm SOS!' : 'Silent Emergency SOS — auto-dispatches nearest police/medical unit'}
      aria-label="Emergency SOS"
    >
      <Zap className={`w-4 h-4 ${confirm ? 'animate-bounce' : ''}`} />
      {triggered ? (
        <span>✅ SOS Transmitted</span>
      ) : confirm ? (
        <span>⚠️ Tap Again to Confirm SOS!</span>
      ) : (
        <span>⚡ 1‑Tap SOS</span>
      )}
      {!triggered && !confirm && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      )}
    </button>
  );
}

