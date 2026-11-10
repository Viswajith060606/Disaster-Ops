import React, { useState, useEffect } from 'react';
import {
  Siren, Shield, Clock,
  LogOut, User, ShieldAlert, AlertTriangle, Radio, Zap, WifiOff
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, stats, role, onLogout, onSOSPanic, isOnline, queuedCount }) {
  const [time, setTime] = useState(new Date());
  const [sosConfirm, setSosConfirm] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isCitizen = role === 'citizen';
  const isAdmin = role === 'admin';

  const handleSOSClick = () => {
    if (sosTriggered) return; // prevent double-tap
    if (!sosConfirm) {
      setSosConfirm(true);
      // Auto-cancel confirmation after 5 seconds
      setTimeout(() => setSosConfirm(false), 5000);
      return;
    }
    // Second tap = confirmed
    setSosConfirm(false);
    setSosTriggered(true);
    if (onSOSPanic) onSOSPanic();
    // Reset after 15 seconds
    setTimeout(() => setSosTriggered(false), 15000);
  };

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">

          {/* Logo & Platform Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-default">
              <div className="relative p-2 rounded-xl bg-red-600 shadow-md shadow-red-200">
                <Siren className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-black tracking-wider text-slate-900 font-mono">
                    DISASTER<span className="text-red-600">-OPS</span>
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    MVP
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {isAdmin ? 'Emergency Operations & Dispatch Command' : 'Citizen Emergency Reporting & Response'}
                </p>
              </div>
            </div>

            {/* Mobile: time + logout */}
            <div className="md:hidden flex items-center gap-2">
              <div className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {time.toLocaleTimeString()}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center: Role Identity + SOS Button (Citizen only) */}
          <div className="flex items-center self-stretch md:self-auto justify-center gap-3">
            {isCitizen && (
              <>
                <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black shadow-sm tracking-wide">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span>🏠 Citizen Incident Portal</span>
                </div>

                {/* ⚡ 1-Tap SOS Panic Button */}
                <button
                  type="button"
                  onClick={handleSOSClick}
                  disabled={sosTriggered}
                  className={`relative px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 ${
                    sosTriggered
                      ? 'bg-emerald-600 text-white border border-emerald-700 cursor-not-allowed'
                      : sosConfirm
                      ? 'bg-red-700 text-white border border-red-800 animate-pulse ring-2 ring-red-400 ring-offset-1'
                      : 'bg-red-600 hover:bg-red-700 text-white border border-red-700 hover:shadow-lg hover:shadow-red-200'
                  }`}
                  title={sosConfirm ? 'Tap again to confirm SOS!' : 'Silent Emergency SOS — auto-dispatches nearest police/medical unit'}
                >
                  <Zap className={`w-4 h-4 ${sosConfirm ? 'animate-bounce' : ''}`} />
                  {sosTriggered ? (
                    <span>✅ SOS Transmitted</span>
                  ) : sosConfirm ? (
                    <span>⚠️ Tap Again to Confirm SOS!</span>
                  ) : (
                    <span>⚡ 1-Tap SOS</span>
                  )}
                  {!sosTriggered && !sosConfirm && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </button>
              </>
            )}

            {isAdmin && (
              <div className="flex items-center space-x-2.5 px-4 py-2 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-black shadow-sm tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
                <span>🛡️ Admin Command Center</span>
                {stats.critical > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full bg-red-600 text-white animate-pulse shadow-sm">
                    {stats.critical} CRITICAL
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Desktop: clock + network indicator + role badge + logout */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>{time.toLocaleTimeString([], { hour12: false })}</span>
              <span className="text-slate-300">|</span>
              {isOnline !== false ? (
                <span className="text-emerald-600 flex items-center gap-1 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  ONLINE
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1 text-[10px] font-bold">
                  <WifiOff className="w-3 h-3" />
                  OFFLINE
                  {queuedCount > 0 && <span className="text-amber-700">({queuedCount}Q)</span>}
                </span>
              )}
            </div>

            {/* Strict User Badge by Role */}
            {isCitizen && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>Viswa (Citizen)</span>
              </div>
            )}

            {isAdmin && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                <span>Admin (Command)</span>
              </div>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 text-xs font-semibold transition-colors shadow-sm"
              title="Sign out of portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
