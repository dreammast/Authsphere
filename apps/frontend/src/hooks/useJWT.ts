import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../context/authStore';

// ── JWT live countdown ────────────────────────────────────
export function useJWTCountdown() {
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const refresh   = useAuthStore((s) => s.refresh);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const now  = Math.floor(Date.now() / 1000);
      const left = expiresAt - now;
      setSecondsLeft(Math.max(left, 0));

      // Auto-refresh when 5 min remain
      if (left === 300) refresh().catch(console.error);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, refresh]);

  const m   = Math.floor(secondsLeft / 60);
  const s   = secondsLeft % 60;
  const str = `${m}:${String(s).padStart(2, '0')}`;
  const pct = expiresAt ? Math.min((secondsLeft / 1800) * 100, 100) : 0;

  return { secondsLeft, str, pct, isExpiringSoon: secondsLeft < 300 };
}

// ── Toast notifications ───────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id:    string;
  type:  ToastType;
  title: string;
  msg?:  string;
}

let _setToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  _setToasts = setToasts;

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, remove };
}

export function showToast(type: ToastType, title: string, msg?: string) {
  const id = Math.random().toString(36).slice(2);
  _setToasts?.((prev) => [...prev.slice(-4), { id, type, title, msg }]);
  setTimeout(() => {
    _setToasts?.((prev) => prev.filter((t) => t.id !== id));
  }, 3800);
}
