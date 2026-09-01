import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Download,
  Eye,
  X,
  DollarSign,
  Calendar,
  Layers,
  Filter,
  Receipt,
  FileCheck2,
} from 'lucide-react';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PayslipRecord } from '../types';

export const PayslipsTab: React.FC = () => {
  const { userEmail } = useAuth();
  const { showToast } = useToast();

  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [activeViewingPayslip, setActiveViewingPayslip] = useState<PayslipRecord | null>(null);

  // Listen to payslips for user email
  useEffect(() => {
    if (!userEmail) return;

    const payslipQuery = query(
      ref(db, 'payslips'),
      orderByChild('staffEmail'),
      equalTo(userEmail.toLowerCase())
    );

    const unsubscribe = onValue(payslipQuery, (snapshot) => {
      if (!snapshot.exists()) {
        setPayslips([]);
        return;
      }
      const data = snapshot.val();
      const list: PayslipRecord[] = Object.keys(data)
        .map((k) => ({ key: k, ...data[k] }))
        .sort((a, b) => (b.period || '').localeCompare(a.period || ''));
      setPayslips(list);
    });

    return () => unsubscribe();
  }, [userEmail]);

  // Extract distinct years
  const availableYears = useMemo(() => {
    const years: string[] = Array.from(
      new Set(payslips.map((p) => (p.period || '').split('-')[0]).filter(Boolean))
    );
    return years.sort((a, b) => b.localeCompare(a));
  }, [payslips]);

  // Filtered payslips
  const filteredPayslips = useMemo(() => {
    if (!selectedYear) return payslips;
    return payslips.filter((p) => (p.period || '').startsWith(selectedYear));
  }, [payslips, selectedYear]);

  // Format YYYY-MM to Month YYYY
  const formatPeriod = (period: string) => {
    if (!period) return '--';
    const [y, m] = period.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return isNaN(date.getTime())
      ? period
      : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Convert Base64 to Blob & download
  const handleDownload = (p: PayslipRecord) => {
    if (!p.fileData) {
      showToast('Payslip document data is not available.', 'error');
      return;
    }

    try {
      const byteChars = atob(p.fileData);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: p.contentType || 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = p.fileName || `Payslip_${p.period}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Downloaded payslip for ${formatPeriod(p.period)}!`, 'success', 'Download Complete');
    } catch {
      showToast('Failed to download payslip file.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Payslip Hub Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1E293B] border border-slate-700 p-6 sm:p-8 rounded-2xl shadow-xl"
      >
        {/* Header Icon */}
        <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl mx-auto flex items-center justify-center mb-4">
          <Receipt className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-1 text-center">My Payslip Statements</h3>
        <p className="text-xs text-slate-400 mb-6 text-center max-w-sm mx-auto">
          Statements published by management will appear here for secure viewing and download.
        </p>

        {/* Year Filter */}
        <div className="flex items-center justify-between gap-3 mb-6 p-3 bg-slate-800/50 border border-slate-700/70 rounded-xl">
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-300">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Filter Statement Year</span>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Payslip List */}
        {filteredPayslips.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-700 rounded-xl text-center text-slate-400 space-y-2">
            <FileCheck2 className="w-8 h-8 mx-auto text-slate-500 mb-1" />
            <p className="text-xs font-medium">No payslips available for this period.</p>
            <p className="text-[11px] text-slate-500">
              When administration uploads your pay statement, it will sync automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayslips.map((p) => {
              const amountNum = parseFloat(String(p.amount || 0));
              const amountText = !isNaN(amountNum) && amountNum > 0 ? `RM ${amountNum.toFixed(2)}` : '--';

              return (
                <motion.div
                  key={p.key}
                  whileHover={{ scale: 1.005 }}
                  className="bg-slate-800/40 border border-slate-700 hover:border-slate-600 p-4 rounded-xl flex items-center justify-between gap-3 shadow-md transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-white block truncate">
                      {formatPeriod(p.period)}
                    </span>
                    <span className="text-xs text-slate-400 block truncate">
                      {p.position ? p.position.replace(/_/g, ' ') : 'Branch Crew'}
                    </span>
                    <span className="text-xs font-mono font-bold text-green-400 block mt-0.5">
                      {amountText}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveViewingPayslip(p)}
                      className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(p)}
                      title="Download Document"
                      className="p-2 rounded-xl bg-green-500/10 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/20 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Payslip Viewer Modal */}
      <AnimatePresence>
        {activeViewingPayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1E293B] border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative text-left my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Payslip — {formatPeriod(activeViewingPayslip.period)}
                    </h3>
                    <p className="text-xs text-slate-400">Statement Preview</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveViewingPayslip(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Document Container */}
              <div className="max-h-[65vh] overflow-auto flex items-center justify-center bg-slate-900 rounded-xl border border-slate-700 p-2 min-h-[260px]">
                {activeViewingPayslip.fileData ? (
                  activeViewingPayslip.contentType?.startsWith('image/') ? (
                    <img
                      src={`data:${activeViewingPayslip.contentType};base64,${activeViewingPayslip.fileData}`}
                      alt="Payslip preview"
                      className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    />
                  ) : (
                    <iframe
                      src={`data:${activeViewingPayslip.contentType || 'application/pdf'};base64,${
                        activeViewingPayslip.fileData
                      }`}
                      title="Payslip PDF"
                      className="w-full h-[55vh] rounded-lg border-none"
                    />
                  )
                ) : (
                  <p className="text-xs text-slate-400">File preview is unavailable.</p>
                )}
              </div>

              <div className="flex justify-end space-x-2.5 pt-4 mt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => handleDownload(activeViewingPayslip)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center space-x-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewingPayslip(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
