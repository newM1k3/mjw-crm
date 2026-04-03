import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = toast.duration ?? (toast.type === 'error' ? 6000 : 4000);
    setToasts(prev => [...prev.slice(-4), { ...toast, id, duration }]); // cap at 5 visible
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) =>
    addToast({ type: 'success', title, message }), [addToast]);
  const error = useCallback((title: string, message?: string) =>
    addToast({ type: 'error', title, message }), [addToast]);
  const warning = useCallback((title: string, message?: string) =>
    addToast({ type: 'warning', title, message }), [addToast]);
  const info = useCallback((title: string, message?: string) =>
    addToast({ type: 'info', title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const toastConfig: Record<ToastType, {
  icon: React.FC<{ className?: string }>;
  bg: string;
  border: string;
  iconColor: string;
  titleColor: string;
  msgColor: string;
}> = {
  success: {
    icon: CheckCircle,
    bg: 'bg-white',
    border: 'border-l-4 border-l-green-500',
    iconColor: 'text-green-500',
    titleColor: 'text-gray-900',
    msgColor: 'text-gray-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-white',
    border: 'border-l-4 border-l-red-500',
    iconColor: 'text-red-500',
    titleColor: 'text-gray-900',
    msgColor: 'text-gray-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-white',
    border: 'border-l-4 border-l-amber-500',
    iconColor: 'text-amber-500',
    titleColor: 'text-gray-900',
    msgColor: 'text-gray-500',
  },
  info: {
    icon: Info,
    bg: 'bg-white',
    border: 'border-l-4 border-l-blue-500',
    iconColor: 'text-blue-500',
    titleColor: 'text-gray-900',
    msgColor: 'text-gray-500',
  },
};

// ─── ToastItem ────────────────────────────────────────────────────────────────

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const cfg = toastConfig[toast.type];
  const Icon = cfg.icon;
  return (
    <div
      className={`
        flex items-start gap-3 w-80 p-4 rounded-lg shadow-lg border border-gray-200
        ${cfg.bg} ${cfg.border}
        animate-in slide-in-from-right-full duration-300
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${cfg.titleColor}`}>{toast.title}</p>
        {toast.message && (
          <p className={`text-xs mt-0.5 leading-snug ${cfg.msgColor}`}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─── ToastContainer ───────────────────────────────────────────────────────────

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
};
