import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type, removing: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error', dur),
    info:    (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

const ICON_MAP = {
  success: <CheckCircle size={18} />,
  error:   <AlertTriangle size={18} />,
  info:    <Info size={18} />,
};

const COLOR_MAP = {
  success: { bg: '#22c55e', border: '#15803d', text: '#ffffff' },
  error:   { bg: '#ef4444', border: '#b91c1c', text: '#ffffff' },
  info:    { bg: 'var(--primary)', border: 'var(--text)', text: '#ffffff' },
};

const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'clamp(12px, 2vw, 20px)',
        right: 'clamp(12px, 2vw, 20px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: 'min(400px, calc(100vw - 24px))',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onClose }) => {
  const colors = COLOR_MAP[toast.type] || COLOR_MAP.info;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        background: colors.bg,
        color: colors.text,
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        boxShadow: '3px 3px 0 var(--text, #0F172A)',
        fontWeight: 700,
        fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
        fontFamily: 'Inter, sans-serif',
        pointerEvents: 'auto',
        animation: toast.removing
          ? 'toastSlideOut 0.3s ease-in forwards'
          : 'toastSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        willChange: 'transform, opacity',
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{ICON_MAP[toast.type]}</span>
      <span style={{ flex: 1, lineHeight: 1.4, wordBreak: 'break-word' }}>{toast.message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', color: 'inherit',
          cursor: 'pointer', padding: '2px', flexShrink: 0,
          opacity: 0.7, display: 'flex',
        }}
      >
        <X size={16} />
      </button>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(100%) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastSlideOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(100%) scale(0.9); }
        }
      `}</style>
    </div>
  );
};

export default ToastProvider;
