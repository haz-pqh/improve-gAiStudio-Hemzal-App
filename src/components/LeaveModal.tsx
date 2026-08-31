import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Upload, FileCheck, AlertCircle, FileText, Send } from 'lucide-react';
import { ref, push } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaveModal: React.FC<LeaveModalProps> = ({ isOpen, onClose }) => {
  const { userEmail, userName, userEmpId } = useAuth();
  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const [leaveType, setLeaveType] = useState<string>('annual');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [reason, setReason] = useState<string>('');
  const [mcFile, setMcFile] = useState<{ name: string; base64: string; size: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size too large! Maximum limit is 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMcFile({
        name: file.name,
        base64: reader.result as string,
        size: file.size,
      });
      showToast(`Selected document: ${file.name}`, 'info');
    };
    reader.onerror = () => {
      showToast('Failed to read file document.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please provide a reason for the leave request.', 'error');
      return;
    }

    if (leaveType === 'medical' && !mcFile) {
      showToast('Please attach your Medical Certificate (MC).', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const leaveRef = ref(db, 'leave_requests');
      const newLeaveRecord = {
        empId: userEmpId,
        empName: userName,
        userEmail: userEmail.toLowerCase(),
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        hasAttachment: leaveType === 'medical' && Boolean(mcFile),
        mcBase64: mcFile ? mcFile.base64 : null,
        mcFileName: mcFile ? mcFile.name : null,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        appliedAt: Date.now(),
      };

      await push(leaveRef, newLeaveRecord);

      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      } catch {
        // Confetti fallback
      }

      showToast('Leave request submitted successfully!', 'success', 'Request Pending');
      onClose();
      // Reset form
      setReason('');
      setMcFile(null);
      setLeaveType('annual');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit leave request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1E293B] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-left my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Apply For Leave</h3>
                <p className="text-xs text-slate-400">Submit time-off or medical certificate</p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Leave Type */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Leave Category</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                required
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="annual">Annual Leave</option>
                <option value="medical">Medical Leave (MC)</option>
                <option value="emergency">Emergency Leave</option>
                <option value="off">Off Day Request</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  required
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Reason & Description</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain the reason for your leave..."
                required
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none placeholder:text-slate-500"
              />
            </div>

            {/* Medical Certificate Upload */}
            {leaveType === 'medical' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Medical Certificate (MC) Document <span className="text-red-400">*</span>
                </label>
                <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer bg-slate-800/40 transition-colors block">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    required={leaveType === 'medical' && !mcFile}
                  />
                  {mcFile ? (
                    <div className="flex items-center justify-center space-x-2 text-green-400 font-medium text-xs">
                      <FileCheck className="w-5 h-5 shrink-0" />
                      <span className="truncate max-w-[240px]">{mcFile.name}</span>
                      <span className="text-[11px] text-slate-400">
                        ({(mcFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1.5" />
                      <span className="text-xs text-slate-300 font-medium block">
                        Click to browse or drop MC file
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        JPG, PNG, or PDF up to 5MB
                      </span>
                    </>
                  )}
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center space-x-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
