import { useEffect, useRef } from "react";

/**
 * Hook untuk auto-refresh data setiap X detik (polling)
 *
 * @param onRefresh  callback yang dipanggil tiap interval — biasanya trigger re-fetch
 * @param interval   interval dalam milidetik (default: 30000 = 30 detik)
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

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshRef.current();
      }
    }, Math.max(interval, 120000));

    return () => clearInterval(timer);
  }, [enabled, interval]);
}
