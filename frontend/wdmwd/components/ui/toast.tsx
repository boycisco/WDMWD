'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertCircle } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0E1426] text-[#F0F4FF] border border-[#1E2945] shadow-[0_8px_30px_rgba(0,0,0,0.6)] text-xs font-medium"
            >
              {toast.type === 'success' && <Check className="w-3.5 h-3.5 text-[#4ADE80]" />}
              {toast.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-[#F87171]" />}
              {toast.type === 'info' && <span className="w-2 h-2 rounded-full bg-[#0052FF] shadow-[0_0_6px_#0052FF]" />}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg: string) => {
        // Fallback if provider not mounted
        if (typeof window !== 'undefined') {
          console.log('[Toast]', msg);
        }
      },
    };
  }
  return context;
}
