import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Sparkles, UserCheck, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ALLOWED_EMAILS } from '../lib/constants';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, loginDemoStaff } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0F172A]">
      {/* Subtle ambient gradient highlights */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md bg-[#1E293B] border border-slate-700 p-8 rounded-2xl shadow-xl relative z-10 text-center"
      >
        {/* Brand Logo & Header */}
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl text-white mb-4 shadow-lg shadow-blue-900/40">
          <Flame className="w-7 h-7 text-white fill-white/20" />
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight">Hemzal Staff Portal</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Attendance, GPS clocking, daily sales & payslips
        </p>

        {/* Security / Whitelist Info Box */}
        <div className="mt-6 p-3.5 bg-slate-800/50 border border-slate-700/70 rounded-xl flex items-center space-x-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Whitelisted Access Only</div>
            <div className="text-[10px] text-slate-400">Strictly for authorized branch personnel</div>
          </div>
        </div>

        {/* Primary Google Login Button */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            id="google-login-btn"
            onClick={loginWithGoogle}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-900/20 transition-all duration-150 active:scale-[0.98] flex items-center justify-center space-x-3 text-sm cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Quick Sandbox / Preview Whitelist Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <div className="flex items-center justify-center space-x-1.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Authorized Staff Accounts</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALLOWED_EMAILS.map((email) => {
              const shortName = email.split('@')[0];
              return (
                <button
                  key={email}
                  type="button"
                  onClick={() => loginDemoStaff(email, shortName.toUpperCase())}
                  className="px-3 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/80 hover:border-blue-500/50 rounded-xl text-left transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 truncate">
                      {shortName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{email}</div>
                  </div>
                  <UserCheck className="w-3.5 h-3.5 text-slate-500 group-hover:text-green-400 shrink-0" />
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Select an authorized staff account or use Google Sign-in to start.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
