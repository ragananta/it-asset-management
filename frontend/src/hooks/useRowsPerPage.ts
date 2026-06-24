import { useCallback, useState } from "react";

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

export function useRowsPerPage(initialValue?: number) {
  const [rowsPerPage, setRowsPerPageState] = useState(() =>
    normalizeRowsPerPage(initialValue ?? DEFAULT_ROWS_PER_PAGE)
  );

  const setRowsPerPage = useCallback((value: unknown) => {
    const nextValue = normalizeRowsPerPage(value);
    setRowsPerPageState(nextValue);
  }, []);

  return [rowsPerPage, setRowsPerPage] as const;
}
