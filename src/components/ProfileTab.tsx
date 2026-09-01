import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Phone,
  Briefcase,
  Store,
  ShieldCheck,
  LogOut,
  MapPin,
  Compass,
  CheckCircle,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { STORE_LAT, STORE_LNG, MAX_ALLOWED_RADIUS_METERS } from '../lib/constants';
import { getCurrentLocation, getDistanceInMeters } from '../lib/geo';
import { useToast } from '../context/ToastContext';

export const ProfileTab: React.FC = () => {
  const { userEmail, userName, staffProfile, logout } = useAuth();
  const { showToast } = useToast();

  const [testingGPS, setTestingGPS] = useState(false);
  const [gpsDiag, setGpsDiag] = useState<string | null>(null);

  const testLocation = async () => {
    setTestingGPS(true);
    setGpsDiag(null);
    const res = await getCurrentLocation();
    if (res.status === 'SUCCESS' && res.lat !== null && res.lng !== null) {
      const dist = getDistanceInMeters(res.lat, res.lng, STORE_LAT, STORE_LNG);
      setGpsDiag(
        `Acquired Coordinates: ${res.lat.toFixed(6)}, ${res.lng.toFixed(6)} (${dist}m from store — ${
          dist <= MAX_ALLOWED_RADIUS_METERS ? 'Within 100m Geofence ✅' : 'Outside 100m Geofence ⚠️'
        })`
      );
      showToast('GPS diagnostics check complete.', 'info');
    } else {
      setGpsDiag(`Error: ${res.error || 'Failed to get location'}`);
      showToast(res.error || 'GPS test failed.', 'error');
    }
    setTestingGPS(false);
  };

  const isActive = (staffProfile?.status || 'ACTIVE').toUpperCase() === 'ACTIVE';

  return (
    <div className="space-y-6 max-w-md mx-auto pb-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1E293B] border border-slate-700 p-6 sm:p-8 rounded-2xl shadow-xl text-center"
      >
        {/* Avatar */}
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 mx-auto mb-4 shadow-lg">
          <User className="w-9 h-9 text-slate-300" />
        </div>

        <h3 className="text-xl font-semibold text-white tracking-tight">
          {staffProfile?.name || userName}
        </h3>
        <p className="text-xs text-blue-400 font-mono font-medium mt-0.5">{userEmail}</p>

        {/* Status Badge */}
        <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-green-500/10 text-green-400 border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span>{staffProfile?.status || 'ACTIVE DUTY'}</span>
        </div>

        {/* Profile Info Items */}
        <div className="mt-6 border-t border-slate-700/80 pt-5 space-y-3 text-left text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-700/50">
            <span className="text-slate-400 flex items-center space-x-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Contact Phone</span>
            </span>
            <span className="font-medium text-slate-200 font-mono">
              {staffProfile?.phone || 'Not configured'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-700/50">
            <span className="text-slate-400 flex items-center space-x-2">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>Position / Role</span>
            </span>
            <span className="font-medium text-slate-200 uppercase tracking-wide">
              {staffProfile?.position ? staffProfile.position.replace(/_/g, ' ') : 'Branch Crew'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-700/50">
            <span className="text-slate-400 flex items-center space-x-2">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Branch</span>
            </span>
            <span className="font-medium text-slate-200">
              {staffProfile?.branch || 'Cawangan Cheras Utama'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-700/50">
            <span className="text-slate-400 flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Portal Access</span>
            </span>
            <span className="font-medium text-green-400">Authorized Personnel</span>
          </div>
        </div>

        {/* GPS Geofence Diagnostics */}
        <div className="mt-6 p-4 bg-slate-800/40 border border-slate-700 rounded-xl text-left space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>GPS Geofence Config</span>
            </div>
            <button
              type="button"
              onClick={testLocation}
              disabled={testingGPS}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer transition-colors"
            >
              {testingGPS ? 'Testing...' : 'Test Location'}
            </button>
          </div>
          <div className="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Store Target: {STORE_LAT.toFixed(5)}, {STORE_LNG.toFixed(5)}</div>
            <div>Max Allowed Radius: {MAX_ALLOWED_RADIUS_METERS} meters</div>
          </div>
          {gpsDiag && (
            <div className="text-[11px] text-slate-300 pt-1.5 border-t border-slate-700 font-mono">
              {gpsDiag}
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={logout}
          className="w-full mt-6 py-3 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 font-medium rounded-xl transition-colors flex items-center justify-center space-x-2 text-xs cursor-pointer active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Staff Portal</span>
        </button>
      </motion.div>
    </div>
  );
};
