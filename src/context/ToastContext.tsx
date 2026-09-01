import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, title, message, duration: 4000 };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div id="toast-container" className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 text-sm ${
                toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-800/80 text-rose-100 shadow-rose-950/50'
                  : toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-800/80 text-emerald-100 shadow-emerald-950/50'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-100 shadow-indigo-950/50'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                ) : toast.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Info className="w-5 h-5 text-indigo-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {toast.title && <h4 className="font-semibold text-xs uppercase tracking-wider mb-0.5 opacity-90">{toast.title}</h4>}
                <p className="text-xs leading-relaxed opacity-95">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
