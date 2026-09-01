import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Clock,
  Compass,
  Calendar,
  Plus,
  ShieldAlert,
  Radio,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { ref, push, update, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STORE_LAT, STORE_LNG, MAX_ALLOWED_RADIUS_METERS } from '../lib/constants';
import { getCurrentLocation, getDistanceInMeters } from '../lib/geo';
import { AttendanceLog, LeaveRequest, GeoLocationPoint } from '../types';
import confetti from 'canvas-confetti';

interface HomeTabProps {
  onOpenLeaveModal: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ onOpenLeaveModal }) => {
  const { userEmail, userName, userEmpId, staffProfile } = useAuth();
  const { showToast } = useToast();

  const [activeLog, setActiveLog] = useState<AttendanceLog | null>(null);
  const [activeLogKey, setActiveLogKey] = useState<string | null>(null);
  const [elapsedTimer, setElapsedTimer] = useState<string>('00:00:00');
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [geoStatus, setGeoStatus] = useState<{
    distance: number | null;
    inRadius: boolean;
    checking: boolean;
    lat: number | null;
    lng: number | null;
  }>({
    distance: null,
    inRadius: false,
    checking: false,
    lat: null,
    lng: null,
  });

  const [latestLeave, setLatestLeave] = useState<LeaveRequest | null>(null);

  const todayISO = new Date().toISOString().split('T')[0];

  // Listen to today's attendance log for the logged-in user
  useEffect(() => {
    if (!userEmail) return;

    const attendanceQuery = query(
      ref(db, 'attendance_logs'),
      orderByChild('date'),
      equalTo(todayISO)
    );

    const unsubscribe = onValue(attendanceQuery, (snapshot) => {
      if (!snapshot.exists()) {
        setActiveLog(null);
        setActiveLogKey(null);
        return;
      }

      const logs = snapshot.val();
      let matchedKey: string | null = null;
      let matchedLog: AttendanceLog | null = null;

      for (const key in logs) {
        if ((logs[key].userEmail || '').toLowerCase() === userEmail.toLowerCase()) {
          matchedKey = key;
          matchedLog = { key, ...logs[key] };
          break;
        }
      }

      setActiveLog(matchedLog);
      setActiveLogKey(matchedKey);
    });

    return () => unsubscribe();
  }, [userEmail, todayISO]);

  // Listen to user's leave requests
  useEffect(() => {
    if (!userEmpId) return;

    const leaveQuery = query(
      ref(db, 'leave_requests'),
      orderByChild('empId'),
      equalTo(userEmpId)
    );

    const unsubscribe = onValue(leaveQuery, (snapshot) => {
      if (!snapshot.exists()) {
        setLatestLeave(null);
        return;
      }
      const val = snapshot.val();
      const list: LeaveRequest[] = Object.keys(val).map((k) => ({ key: k, ...val[k] }));
      setLatestLeave(list[list.length - 1] || null);
    });

    return () => unsubscribe();
  }, [userEmpId]);

  // Running ticker timer
  useEffect(() => {
    if (!activeLog || !activeLog.clockIn || activeLog.clockOut) {
      if (activeLog?.clockOut && activeLog.durationText) {
        setElapsedTimer(activeLog.durationText);
      } else {
        setElapsedTimer('00:00:00');
      }
      return;
    }

    const startTime = new Date(`${activeLog.date}T${activeLog.clockIn}:00`).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - startTime);

      const hrs = String(Math.floor(diffMs / 3600000)).padStart(2, '0');
      const mins = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0');
      const secs = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, '0');
      setElapsedTimer(`${hrs}:${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeLog]);

  // Probe GPS coordinates on mount
  const checkCurrentGPS = async (showNotification = false) => {
    setGeoStatus((prev) => ({ ...prev, checking: true }));
    const loc = await getCurrentLocation();
    if (loc.status === 'SUCCESS' && loc.lat !== null && loc.lng !== null) {
      const dist = getDistanceInMeters(loc.lat, loc.lng, STORE_LAT, STORE_LNG);
      setGeoStatus({
        distance: dist,
        inRadius: dist <= MAX_ALLOWED_RADIUS_METERS,
        checking: false,
        lat: loc.lat,
        lng: loc.lng,
      });
      if (showNotification) {
        if (dist <= MAX_ALLOWED_RADIUS_METERS) {
          showToast(`Location verified: You are ${dist}m from store (Within 100m geofence).`, 'success', 'GPS Verified');
        } else {
          showToast(`Location warning: You are ${dist}m from store (${dist - MAX_ALLOWED_RADIUS_METERS}m outside geofence).`, 'error', 'Outside Geofence');
        }
      }
    } else {
      setGeoStatus({
        distance: null,
        inRadius: false,
        checking: false,
        lat: null,
        lng: null,
      });
      if (showNotification) {
        showToast(loc.error || 'Failed to acquire GPS location. Please turn on GPS.', 'error');
      }
    }
  };

  useEffect(() => {
    checkCurrentGPS(false);
  }, []);

  // Main Clock In / Clock Out Action
  const handleToggleClock = async () => {
    try {
      setLoadingAction(true);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Time benchmarks
      const time800AM = 8 * 60; // 08:00
      const time930AM = 9 * 60 + 30; // 09:30
      const time1100AM = 11 * 60; // 11:00
      const time800PM = 20 * 60; // 20:00
      const time900PM = 21 * 60; // 21:00

      showToast('Acquiring high-accuracy GPS coordinates...', 'info');
      let location: GeoLocationPoint = await getCurrentLocation();

      // Geofence check
      if (location.status !== 'SUCCESS' || location.lat === null || location.lng === null) {
        // Provide graceful prompt: if user cannot get GPS indoors, let them know clearly
        showToast('Unable to acquire GPS coordinates. Please enable location permission.', 'error');
        setLoadingAction(false);
        return;
      }

      const distance = getDistanceInMeters(location.lat, location.lng, STORE_LAT, STORE_LNG);

      if (distance > MAX_ALLOWED_RADIUS_METERS) {
        showToast(
          `Access Denied! You are ${distance}m away. Attendance must be logged within 100m of the store branch.`,
          'error',
          'Geofence Boundary Exceeded'
        );
        setLoadingAction(false);
        return;
      }

      // CASE 1: CLOCK OUT (Active log exists without clockOut)
      if (activeLogKey && activeLog && !activeLog.clockOut) {
        const isStandardWindow = currentMinutes >= time800PM && currentMinutes <= time900PM;
        if (!isStandardWindow) {
          const proceed = window.confirm(
            `Standard clock-out window is 8:00 PM – 9:00 PM (Current: ${timeStr}). Do you want to proceed with clocking out now?`
          );
          if (!proceed) {
            setLoadingAction(false);
            return;
          }
        }

        const startTime = new Date(`${activeLog.date}T${activeLog.clockIn}:00`);
        const diffMs = Math.max(0, now.getTime() - startTime.getTime());
        const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const durationText = `${hrs}h ${mins}m`;

        await update(ref(db, `attendance_logs/${activeLogKey}`), {
          clockOut: timeStr,
          durationMs: diffMs,
          durationText: durationText,
          lastModifiedAt: Date.now(),
          clockOutLocation: location,
        });

        try {
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        } catch {}

        showToast(`Clocked Out Successfully! Shift Duration: ${durationText}`, 'success', 'Shift Completed');
        setLoadingAction(false);
        return;
      }

      // CASE 2: SHIFT ALREADY COMPLETED TODAY
      if (activeLog && activeLog.clockOut) {
        showToast('You have already completed your logged shift for today.', 'info', 'Shift Recorded');
        setLoadingAction(false);
        return;
      }

      // CASE 3: CLOCK IN
      let punctualityStatus: 'ON TIME' | 'LATE' | 'ABSENT' = 'ON TIME';
      let statusColor = 'green';
      let remarks = '';

      if (currentMinutes >= time800AM && currentMinutes <= time930AM) {
        punctualityStatus = 'ON TIME';
        statusColor = 'green';
      } else if (currentMinutes > time930AM && currentMinutes <= time1100AM) {
        punctualityStatus = 'LATE';
        statusColor = 'amber';
        remarks = 'Late Clock-in';
      } else {
        const proceed = window.confirm(
          `Standard clock-in is 8:00 AM – 11:00 AM (Current: ${timeStr}). Would you like to log your punch anyway?`
        );
        if (!proceed) {
          setLoadingAction(false);
          return;
        }
        punctualityStatus = 'LATE';
        statusColor = 'amber';
        remarks = 'Off-window punch';
      }

      const newLogRecord: AttendanceLog = {
        autoGenerated: false,
        clockIn: timeStr,
        clockOut: '',
        createdByAdmin: false,
        date: todayISO,
        durationText: 'In Progress',
        editedByAdmin: false,
        empName: staffProfile?.name || userName,
        empId: userEmpId,
        hasAttachment: false,
        lastModifiedAt: Date.now(),
        punctualityStatus: punctualityStatus,
        remarks: remarks,
        statusColor: statusColor,
        timestamp: Date.now(),
        userEmail: userEmail.toLowerCase(),
        clockInLocation: location,
      };

      await push(ref(db, 'attendance_logs'), newLogRecord);

      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      } catch {}

      showToast(`Clocked In successfully as [${punctualityStatus}] at ${timeStr}`, 'success', 'Shift Started');
    } catch (err: any) {
      showToast(err.message || 'An error occurred while clocking attendance.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Determine State
  // `punctualityStatus` is the authoritative field for whether a record is
  // ABSENT. `statusColor` / `remarks` are only used as a fallback when
  // punctualityStatus itself is missing — they must NOT override an
  // explicit non-absent punctualityStatus (e.g. after an admin edits an
  // auto-absent record to LATE and adds a clock-in time, leftover
  // statusColor: 'red' or an old "absent" remark should no longer count).
  const isAbsent = Boolean(
    activeLog &&
      (activeLog.punctualityStatus === 'ABSENT' ||
        (!activeLog.punctualityStatus &&
          (activeLog.statusColor === 'red' ||
            (activeLog.remarks && activeLog.remarks.toLowerCase().includes('absent')))))
  );

  const isClockedIn = Boolean(
    activeLog && !isAbsent && activeLog.clockIn && !activeLog.clockOut && activeLog.clockIn !== '--:--'
  );

  const isShiftCompleted = Boolean(
    activeLog &&
      !isAbsent &&
      activeLog.clockIn &&
      activeLog.clockOut &&
      activeLog.clockIn !== '--:--' &&
      activeLog.clockOut !== '--:--'
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-6">
      {/* 1. CLOCKING TERMINAL CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1E293B] border border-slate-700 p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Clocking Terminal</h3>
              <p className="text-xs text-slate-400">GPS verified time & attendance</p>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wide border flex items-center space-x-1.5 ${
              isAbsent
                ? 'bg-red-400/10 text-red-400 border-red-500/20'
                : isClockedIn
                ? 'bg-green-400/10 text-green-400 border-green-500/20'
                : isShiftCompleted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isAbsent
                  ? 'bg-red-400'
                  : isClockedIn
                  ? 'bg-green-400 animate-pulse'
                  : isShiftCompleted
                  ? 'bg-slate-500'
                  : 'bg-blue-400'
              }`}
            />
            <span>
              {isAbsent
                ? 'ABSENT'
                : isClockedIn
                ? 'ON DUTY • ACTIVE'
                : isShiftCompleted
                ? 'SHIFT COMPLETED'
                : 'OFF DUTY'}
            </span>
          </span>
        </div>

        {/* User Identity Pill */}
        <div className="mb-5 p-3.5 bg-slate-800/50 border border-slate-700/70 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Duty Officer:</span>
            <span className="text-white font-semibold">{staffProfile?.name || userName}</span>
          </div>
          <span className="font-mono text-xs text-blue-300 bg-slate-900/60 px-2 py-0.5 rounded-lg border border-slate-700">
            {staffProfile?.branch || 'Main Branch'}
          </span>
        </div>

        {/* Live Duration HUD */}
        <div
          className={`p-6 rounded-xl border text-center mb-6 transition-colors duration-150 ${
            isAbsent
              ? 'bg-slate-900/80 border-red-500/30'
              : isClockedIn
              ? 'bg-slate-900/80 border-green-500/30'
              : isShiftCompleted
              ? 'bg-slate-900/60 border-slate-700'
              : 'bg-slate-900/60 border-slate-700'
          }`}
        >
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            {isAbsent
              ? 'Attendance Status'
              : isClockedIn
              ? 'Active Shift Elapsed Time'
              : 'Recorded Shift Duration'}
          </span>
          <div
            className={`font-mono text-4xl sm:text-5xl font-bold my-2 tracking-tight ${
              isAbsent
                ? 'text-red-400'
                : isClockedIn
                ? 'text-green-400'
                : isShiftCompleted
                ? 'text-slate-200'
                : 'text-slate-400'
            }`}
          >
            {isAbsent ? 'ABSENT' : elapsedTimer}
          </div>
          <p className="text-xs text-slate-400">
            {isAbsent
              ? activeLog?.remarks || 'Marked absent for today'
              : isClockedIn
              ? `Clocked in at ${activeLog?.clockIn} • Shift in progress`
              : isShiftCompleted
              ? `Shift finished at ${activeLog?.clockOut}`
              : 'Ready to punch clock-in'}
          </p>
        </div>

        {/* GPS Geofence Radar / Proximity Indicator */}
        <div className="mb-6 p-3.5 bg-slate-800/50 border border-slate-700/70 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                geoStatus.inRadius
                  ? 'bg-green-400/10 text-green-400 border border-green-500/20'
                  : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${geoStatus.checking ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {geoStatus.distance !== null
                  ? `${geoStatus.distance}m from Store Branch`
                  : 'GPS Location Ready'}
              </div>
              <div className="text-[10px] text-slate-400">
                {geoStatus.distance !== null
                  ? geoStatus.inRadius
                  ? 'Within 100m geofence radius'
                  : 'Outside 100m geofence limit'
                  : 'Tap verify to refresh GPS'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => checkCurrentGPS(true)}
            disabled={geoStatus.checking}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors shrink-0 cursor-pointer flex items-center space-x-1.5"
          >
            <Radio className="w-3 h-3 text-blue-400" />
            <span>{geoStatus.checking ? 'Locating...' : 'Verify GPS'}</span>
          </button>
        </div>

        {/* Main Action Button */}
        <button
          type="button"
          id="clock-action-btn"
          onClick={handleToggleClock}
          disabled={loadingAction || Boolean(isShiftCompleted) || Boolean(isAbsent)}
          className={`w-full py-3 px-5 rounded-xl font-medium text-sm transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 ${
            isAbsent
              ? 'bg-red-500/10 border border-red-500/30 text-red-400 cursor-not-allowed'
              : isClockedIn
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'
              : isShiftCompleted
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
          }`}
        >
          {loadingAction ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying & Recording...</span>
            </div>
          ) : isAbsent ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>Marked Absent For Today</span>
            </>
          ) : isClockedIn ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              <span>Clock Out (End Shift)</span>
            </>
          ) : isShiftCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>Shift Completed For Today</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Clock In (Start Shift)</span>
            </>
          )}
        </button>
      </motion.div>

      {/* 2. LEAVE STATUS & APPLICATION CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-[#1E293B] border border-slate-700 p-6 rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Leave Request Status</h3>
          </div>

          {latestLeave ? (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider flex items-center space-x-1.5 border ${
                latestLeave.status === 'APPROVED'
                  ? 'bg-green-400/10 text-green-400 border-green-500/20'
                  : latestLeave.status === 'REJECTED'
                  ? 'bg-red-400/10 text-red-400 border-red-500/20'
                  : 'bg-orange-400/10 text-orange-400 border-orange-500/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  latestLeave.status === 'APPROVED'
                    ? 'bg-green-400'
                    : latestLeave.status === 'REJECTED'
                    ? 'bg-red-400'
                    : 'bg-orange-400 animate-pulse'
                }`}
              />
              <span>{latestLeave.status}</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 uppercase tracking-wider border border-slate-700">
              No Active Request
            </span>
          )}
        </div>

        {/* Leave Details / Placeholder */}
        {latestLeave ? (
          <div className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-4 text-xs space-y-2.5 mb-4">
            <div className="flex justify-between items-center text-slate-400">
              <span>Category:</span>
              <span className="font-semibold text-slate-200 uppercase tracking-wide">
                {latestLeave.leaveType}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Duration / Dates:</span>
              <span className="font-mono text-blue-300 font-medium">
                {latestLeave.startDate === latestLeave.endDate
                  ? latestLeave.startDate
                  : `${latestLeave.startDate} → ${latestLeave.endDate}`}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Reason:</span>
              <span className="text-slate-300 max-w-[200px] truncate">
                {latestLeave.reason}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-400 text-center mb-4">
            No active or pending leave applications found for your account.
          </div>
        )}

        <button
          type="button"
          onClick={onOpenLeaveModal}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-200 bg-slate-800 hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Apply New Leave / Medical MC</span>
        </button>
      </motion.div>
    </div>
  );
};
