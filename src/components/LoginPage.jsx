import React, { useState } from 'react';
import {
  ShieldAlert, User, Lock, Eye, EyeOff, Siren,
  AlertTriangle, Shield, Phone,
} from 'lucide-react';

const CREDENTIALS = {
  citizen: { username: 'Viswa', password: 'Viswa', role: 'citizen' },
  admin:   { username: 'Admin', password: 'Admin', role: 'admin'   },
};

export default function LoginPage({ onLogin }) {
  const [mode, setMode]         = useState('citizen');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [shaking, setShaking]   = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const cred = CREDENTIALS[mode];
    if (username === cred.username && password === cred.password) {
      onLogin(cred.role);
    } else {
      setError(
        `Invalid credentials. Hint: ${
          mode === 'citizen' ? '"Viswa" / "Viswa"' : '"Admin" / "Admin"'
        }`
      );
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
  };

  const isCitizen = mode === 'citizen';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Platform branding */}
      <div className="mb-8 text-center z-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="relative p-3 rounded-2xl bg-red-600 shadow-lg shadow-red-200">
            <Siren className="w-8 h-8 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black tracking-widest text-slate-900 font-mono">
              DISASTER<span className="text-red-600">-OPS</span>
            </h1>
            <p className="text-xs text-slate-500 tracking-widest uppercase font-semibold">
              Emergency Response & Dispatch Command
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Secure portal — select your access role to continue
        </p>
      </div>

      {/* Role Switcher */}
      <div className="z-10 flex items-center bg-white border border-slate-200 shadow-sm p-1 rounded-2xl mb-6 w-full max-w-sm">
        <button
          type="button"
          onClick={() => { setMode('citizen'); setError(''); setUsername(''); setPassword(''); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            isCitizen
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          🏠 Citizen Portal
        </button>
        <button
          type="button"
          onClick={() => { setMode('admin'); setError(''); setUsername(''); setPassword(''); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            !isCitizen
              ? 'bg-red-600 text-white shadow-md shadow-red-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          🛡️ Admin Command
        </button>
      </div>

      {/* Login Card */}
      <div
        className={`z-10 w-full max-w-sm bg-white border rounded-2xl shadow-xl overflow-hidden ${
          isCitizen ? 'border-emerald-200' : 'border-red-200'
        } ${shaking ? 'shake' : ''}`}
      >
        {/* Card banner */}
        <div className={`px-6 py-4 flex items-center gap-3 border-b ${
          isCitizen
            ? 'bg-emerald-50 border-emerald-100'
            : 'bg-red-50 border-red-100'
        }`}>
          <div className={`p-2 rounded-xl ${
            isCitizen
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-red-100 text-red-600'
          }`}>
            {isCitizen ? <User className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800">
              {isCitizen ? 'Citizen Emergency Portal' : 'Admin Dispatch Command'}
            </h2>
            <p className="text-xs text-slate-500">
              {isCitizen
                ? 'Report incidents & view nearby emergency services'
                : 'Full situational awareness & dispatch control'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Username */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isCitizen ? 'Viswa' : 'Admin'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick-fill hint */}
          <p className="text-[11px] text-slate-400">
            Credentials:{' '}
            <button
              type="button"
              onClick={() => {
                setUsername(isCitizen ? 'Viswa' : 'Admin');
                setPassword(isCitizen ? 'Viswa' : 'Admin');
              }}
              className="text-blue-600 underline hover:text-blue-800 transition-colors"
            >
              {isCitizen ? '"Viswa" / "Viswa"' : '"Admin" / "Admin"'} (auto-fill)
            </button>
          </p>

          {/* Submit */}
          <button
            type="submit"
            className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-md flex items-center justify-center gap-2 text-white ${
              isCitizen
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                : 'bg-red-600 hover:bg-red-700 shadow-red-200'
            }`}
          >
            {isCitizen ? <User className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {isCitizen ? 'Enter Citizen Portal' : 'Access Command Center'}
          </button>
        </form>

        <div className="px-6 pb-4 text-center text-[11px] text-slate-400">
          Zero-backend · 100% client-side · LocalStorage persisted
        </div>
      </div>

      {/* Quick-dial strip */}
      <div className="mt-8 z-10 flex flex-wrap items-center justify-center gap-2 text-[11px]">
        {[
          { label: '👮 Police',    num: '100',  color: 'text-blue-700 border-blue-200 bg-blue-50'    },
          { label: '🚑 Ambulance', num: '108',  color: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
          { label: '🚒 Fire',      num: '101',  color: 'text-red-700 border-red-200 bg-red-50'       },
          { label: '🆘 Disaster',  num: '1070', color: 'text-amber-700 border-amber-200 bg-amber-50' },
        ].map(({ label, num, color }) => (
          <a
            key={num}
            href={`tel:${num}`}
            className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg font-bold ${color} hover:shadow-sm transition-shadow`}
          >
            {label} <span className="font-mono">{num}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
