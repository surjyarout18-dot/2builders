import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastListener = (toast: ToastItem) => void;
const listeners: Set<ToastListener> = new Set();

export const toast = {
  success: (message: string, duration = 4000) => {
    emit({ id: Math.random().toString(36).substring(2, 9), message, type: 'success', duration });
  },
  error: (message: string, duration = 5000) => {
    emit({ id: Math.random().toString(36).substring(2, 9), message, type: 'error', duration });
  },
  info: (message: string, duration = 4000) => {
    emit({ id: Math.random().toString(36).substring(2, 9), message, type: 'info', duration });
  },
  warning: (message: string, duration = 4500) => {
    emit({ id: Math.random().toString(36).substring(2, 9), message, type: 'warning', duration });
  }
};

function emit(toastItem: ToastItem) {
  listeners.forEach((listener) => listener(toastItem));
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast: ToastListener = (newToast) => {
      setToasts((prev) => [...prev, newToast]);
      if (newToast.duration) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    };

    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all animate-in slide-in-from-bottom-3 duration-200 text-xs font-medium ${
              isSuccess
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/30'
                : isError
                ? 'bg-slate-900/95 border-rose-500/40 text-rose-200 shadow-rose-950/30'
                : isWarning
                ? 'bg-slate-900/95 border-amber-500/40 text-amber-200 shadow-amber-950/30'
                : 'bg-slate-900/95 border-sky-500/40 text-sky-200 shadow-sky-950/30'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 size={17} className="text-emerald-400" />}
              {isError && <AlertCircle size={17} className="text-rose-400" />}
              {isWarning && <AlertTriangle size={17} className="text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info size={17} className="text-sky-400" />}
            </div>

            <div className="flex-1 leading-relaxed text-slate-100">{t.message}</div>

            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
