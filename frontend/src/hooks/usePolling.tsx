import { useEffect, useRef, useState } from "react";
import { isAuthenticated } from "../utils/auth";

/**
 * Hook untuk auto-refresh data setiap X detik (polling)
 *
 * @param onRefresh  callback yang dipanggil tiap interval — biasanya trigger re-fetch
 * @param interval   interval dalam milidetik (default: 120000 = 120 detik)
 * @param enabled    aktif atau tidak (default: true) — set false kalau modal sedang terbuka
 *
 * @example
 * // Refresh setiap 30 detik
 * usePolling(() => setCurrentPage((p) => p));
 *
 * // Refresh setiap 10 detik, pause saat modal terbuka
 * usePolling(() => setCurrentPage((p) => p), 10000, !modalOpen);
 */
export function usePolling(
  onRefresh: () => void,
  interval: number = 120000,
  enabled: boolean = true
) {
  const refreshRef = useRef(onRefresh);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  // Trigger refetch directly when browser tab becomes active/focused, and reset timer
  useEffect(() => {
    if (!enabled || !isAuthenticated()) return;

    const handleFocus = () => {
      // Ignore initial browser focus event that occurs immediately after mounting (within 1 second)
      if (Date.now() - mountTimeRef.current < 1000) {
        return;
      }
      if (!document.hidden && isAuthenticated()) {
        refreshRef.current();
        setFocusTrigger((t) => t + 1);
      }
    };

    document.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled]);

  // Interval Timer
  useEffect(() => {
    if (!enabled || !isAuthenticated()) return;

    const timer = setInterval(() => {
      if (!document.hidden && isAuthenticated()) {
        refreshRef.current();
      }
    }, Math.max(interval, 1000));

    return () => clearInterval(timer);
  }, [enabled, interval, focusTrigger]);
}
