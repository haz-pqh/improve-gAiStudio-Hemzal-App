import React, { useState, useEffect } from 'react';
import { Flame, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { userName, userEmail, staffProfile, logout } = useAuth();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-700 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Staff Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/30 shrink-0">
            <Flame className="w-5 h-5 fill-white/20 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-white font-semibold text-sm sm:text-base tracking-tight truncate max-w-[140px] sm:max-w-[220px]">
                {staffProfile?.name || userName}
              </h2>
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-400/10 text-green-400 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span>ONLINE</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[180px] sm:max-w-[260px] font-mono">
              {userEmail}
            </p>
          </div>
        </div>

        {/* Right: Live Clock & Quick Sign Out */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center space-x-1.5 font-mono text-sm font-semibold text-blue-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeStr || '00:00:00 AM'}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              {dateStr || 'Loading date...'}
            </span>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors text-xs flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline font-medium">Exit</span>
          </button>
        </div>
      </div>
    </header>
  );
};
