"use client";

import { CircleAlert } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastApi {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((msg: string) => {
    window.clearTimeout(timer.current);
    setMessage(msg);
    setKey((k) => k + 1);
    timer.current = window.setTimeout(() => setMessage(null), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
      >
        {message && (
          <div
            key={key}
            className="flex max-w-md items-start gap-3 rounded-[var(--radius-field)] bg-text px-4 py-3 text-body text-ground shadow-[var(--shadow)] [animation:toast-in_240ms_var(--ease-out-expo)]"
          >
            <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast poza ToastProvider");
  return ctx;
}
