import { useCallback, useState } from "react";

const STORAGE_KEY = "rowsPerPage";
const DEFAULT_ROWS_PER_PAGE = 10;
const MIN_ROWS_PER_PAGE = 1;
const MAX_ROWS_PER_PAGE = 500;

const normalizeRowsPerPage = (value: unknown) => {
  const nextValue = Number(value);

  if (!Number.isFinite(nextValue) || nextValue < MIN_ROWS_PER_PAGE) {
    return DEFAULT_ROWS_PER_PAGE;
  }

  return Math.min(Math.trunc(nextValue), MAX_ROWS_PER_PAGE);
};

const readStoredRowsPerPage = () => {
  if (typeof window === "undefined") return DEFAULT_ROWS_PER_PAGE;
  return normalizeRowsPerPage(window.localStorage.getItem(STORAGE_KEY));
};

export function useRowsPerPage() {
  const [rowsPerPage, setRowsPerPageState] = useState(readStoredRowsPerPage);

  const setRowsPerPage = useCallback((value: unknown) => {
    const nextValue = normalizeRowsPerPage(value);
    setRowsPerPageState(nextValue);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(nextValue));
    }
  }, []);

  return [rowsPerPage, setRowsPerPage] as const;
}

