import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AttendanceLog } from '../types';

interface AttendanceTabProps {
  onOpenLeaveModal: () => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ onOpenLeaveModal }) => {
  const { userEmail } = useAuth();
  const { showToast } = useToast();

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [currentViewDate, setCurrentViewDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Real-time listener for attendance logs
  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'attendance_logs'), (snapshot) => {
      if (!snapshot.exists()) {
        setAttendanceLogs([]);
        return;
      }
      const data = snapshot.val();
      const list: AttendanceLog[] = Object.keys(data).map((k) => ({
        key: k,
        ...data[k],
      }));
      setAttendanceLogs(list.reverse());
    });

    return () => unsubscribe();
  }, []);

  // Filter logs for the active user
  const userLogs = useMemo(() => {
    if (!userEmail) return [];
    return attendanceLogs.filter(
      (log) => (log.userEmail || '').toLowerCase() === userEmail.toLowerCase()
    );
  }, [attendanceLogs, userEmail]);

  // Helper date parsing
  const parseLogDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  const handleMonthChange = (offset: number) => {
    const next = new Date(year, month + offset, 1);
    setCurrentViewDate(next);
  };

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const monthLogs = userLogs.filter((l) => {
      const d = parseLogDate(l.date);
      return d && d.getFullYear() === year && d.getMonth() === month;
    });

    const attended = monthLogs.filter((l) => l.clockIn && l.punctualityStatus !== 'ABSENT');
    const onTime = attended.filter((l) => l.punctualityStatus === 'ON TIME');
    const onTimeRate = attended.length > 0 ? Math.round((onTime.length / attended.length) * 100) : 100;

    return {
      shiftsCount: attended.length,
      onTimeRate,
      totalLogs: monthLogs.length,
    };
  }, [userLogs, year, month]);

  // Filtered list for inspect pane
  const filteredLogs = useMemo(() => {
    if (!selectedDateStr) return userLogs;
    const sel = new Date(selectedDateStr);
    const selY = sel.getFullYear();
    const selM = sel.getMonth();
    const selD = sel.getDate();

    return userLogs.filter((l) => {
      const p = parseLogDate(l.date);
      return p && p.getFullYear() === selY && p.getMonth() === selM && p.getDate() === selD;
    });
  }, [userLogs, selectedDateStr]);

  // CSV Export
  const exportCSV = () => {
    if (userLogs.length === 0) {
      showToast('No attendance logs found to export.', 'error');
      return;
    }
    let csv = 'Date,Clock In,Clock Out,Duration,Status,Remarks\n';
    userLogs.forEach((l) => {
      csv += `"${l.date}","${l.clockIn || '--'}","${l.clockOut || '--'}","${l.durationText || '--'}","${
        l.punctualityStatus || 'ATTENDED'
      }","${l.remarks || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hemzal_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Attendance report exported as CSV!', 'success', 'Export Complete');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-6">
      {/* 1. MONTHLY OVERVIEW METRIC CARDS */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#1E293B] border border-slate-700 p-4 sm:p-5 rounded-2xl text-center shadow-xl">
          <span className="text-[10px] sm:text-xs uppercase font-semibold text-slate-400 block mb-1">Shifts (Month)</span>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-white">{monthlyStats.shiftsCount}</div>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 p-4 sm:p-5 rounded-2xl text-center shadow-xl">
          <span className="text-[10px] sm:text-xs uppercase font-semibold text-slate-400 block mb-1">On-Time Rate</span>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-green-400">{monthlyStats.onTimeRate}%</div>
        </div>
        <div className="bg-[#1E293B] border border-slate-700 p-4 sm:p-5 rounded-2xl text-center shadow-xl">
          <span className="text-[10px] sm:text-xs uppercase font-semibold text-slate-400 block mb-1">Total Records</span>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-blue-400">{userLogs.length}</div>
        </div>
      </div>

      {/* 2. INTERACTIVE CALENDAR CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-blue-400" />
              <span>Attendance Calendar</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Select any day to inspect duty logs & coordinates</p>
          </div>
          <button
            type="button"
            onClick={exportCSV}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between my-3 px-1">
          <button
            type="button"
            onClick={() => handleMonthChange(-1)}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h4 className="text-sm font-semibold text-white tracking-wide">
            {currentViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          <button
            type="button"
            onClick={() => handleMonthChange(1)}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => (
            <span key={d} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {d}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {/* Previous month padding days */}
          {Array.from({ length: firstDayIndex }).map((_, i) => {
            const dayNum = prevMonthDays - firstDayIndex + i + 1;
            return (
              <div
                key={`prev-${i}`}
                className="h-9 w-9 mx-auto flex items-center justify-center text-xs text-slate-600 pointer-events-none font-medium"
              >
                {dayNum}
              </div>
            );
          })}

          {/* Current month days */}
          {Array.from({ length: totalDaysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateObj = new Date(year, month, day);
            dateObj.setHours(0, 0, 0, 0);

            const log = userLogs.find((l) => {
              const p = parseLogDate(l.date);
              return p && p.getFullYear() === year && p.getMonth() === month && p.getDate() === day;
            });

            const isSelected =
              selectedDateStr &&
              new Date(selectedDateStr).getFullYear() === year &&
              new Date(selectedDateStr).getMonth() === month &&
              new Date(selectedDateStr).getDate() === day;

            let statusStyle = 'hover:bg-slate-800 text-slate-300 font-medium';
            let dotColor = '';

            if (log) {
              const st = (log.punctualityStatus || '').toLowerCase();
              if (st === 'absent' || log.statusColor === 'red') {
                statusStyle = 'bg-red-400/10 text-red-400 border border-red-500/30 font-semibold';
                dotColor = 'bg-red-400';
              } else if (st === 'mc' || st === 'off' || st === 'leave') {
                statusStyle = 'bg-orange-400/10 text-orange-400 border border-orange-500/30 font-semibold';
                dotColor = 'bg-orange-400';
              } else {
                statusStyle = 'bg-green-400/10 text-green-400 border border-green-500/30 font-semibold';
                dotColor = 'bg-green-400';
              }
            } else if (dateObj < today) {
              statusStyle = 'bg-slate-800/40 text-slate-500 border border-slate-700/50 font-normal';
              dotColor = '';
            }

            return (
              <button
                key={`curr-${day}`}
                type="button"
                onClick={() => setSelectedDateStr(dateObj.toISOString())}
                className={`h-9 w-9 mx-auto rounded-xl text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${statusStyle} ${
                  isSelected ? 'ring-2 ring-blue-500 bg-slate-700/60 text-white z-10' : ''
                }`}
              >
                <span>{day}</span>
                {dotColor && !isSelected && (
                  <span className={`w-1 h-1 rounded-full ${dotColor} mt-0.5`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-5 pt-4 border-t border-slate-700 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span>Attended</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span>Late / Leave</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>Absent</span>
          </div>
        </div>
      </motion.div>

      {/* 3. SELECTED DATE INSPECTION LOGS */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            {selectedDateStr
              ? `Logs for ${new Date(selectedDateStr).toLocaleDateString('en-GB')}`
              : `All Shift Logs (${userLogs.length})`}
          </h4>
          {selectedDateStr && (
            <button
              type="button"
              onClick={() => setSelectedDateStr(null)}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>

        {filteredLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No duty records found for the selected date.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log, idx) => {
              const isLate = log.punctualityStatus === 'LATE';
              const isAbsent = log.punctualityStatus === 'ABSENT' || log.statusColor === 'red';

              return (
                <div
                  key={log.key || idx}
                  className="p-4 border rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/60 transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-semibold text-sm">{log.date}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border ${
                          isAbsent
                            ? 'bg-red-400/10 text-red-400 border-red-500/20'
                            : isLate
                            ? 'bg-orange-400/10 text-orange-400 border-orange-500/20'
                            : 'bg-green-400/10 text-green-400 border-green-500/20'
                        }`}
                      >
                        {log.punctualityStatus || 'ON TIME'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 mt-1 text-slate-400 text-xs">
                      <span>Duration: {log.durationText || 'N/A'}</span>
                      {log.clockInLocation?.lat && (
                        <a
                          href={`https://maps.google.com/?q=${log.clockInLocation.lat},${log.clockInLocation.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline inline-flex items-center space-x-1"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>In Map</span>
                        </a>
                      )}
                      {log.clockOutLocation?.lat && (
                        <a
                          href={`https://maps.google.com/?q=${log.clockOutLocation.lat},${log.clockOutLocation.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline inline-flex items-center space-x-1"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>Out Map</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 font-mono self-end sm:self-auto">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-slate-200 border border-slate-700 font-semibold text-xs">
                      {log.clockIn || '--:--'}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-slate-200 border border-slate-700 font-semibold text-xs">
                      {log.clockOut || '--:--'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
