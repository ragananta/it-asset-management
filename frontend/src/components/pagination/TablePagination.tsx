import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  rowsPerPage: number;
  totalData: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  className?: string;
}

const DEFAULT_ROWS_PER_PAGE = 10;
const MIN_ROWS_PER_PAGE = 1;
const MAX_ROWS_PER_PAGE = 500;
const ROWS_PER_PAGE_OPTIONS = [5, 10, 15, 20, 25, 50, 100, 200];

const normalizeRowsPerPage = (value: string | number) => {
  if (value === "") return DEFAULT_ROWS_PER_PAGE;

  const nextValue = Number(value);
  if (!Number.isFinite(nextValue) || nextValue < MIN_ROWS_PER_PAGE) {
    return DEFAULT_ROWS_PER_PAGE;
  }

  return Math.min(Math.trunc(nextValue), MAX_ROWS_PER_PAGE);
};

export default function TablePagination({
  currentPage,
  rowsPerPage,
  totalData,
  totalPages,
  onPageChange,
  onRowsPerPageChange,
  className = "mb-4",
}: TablePaginationProps) {
  const [inputValue, setInputValue] = useState(String(rowsPerPage));
  const [optionsOpen, setOptionsOpen] = useState(false);
  const startIndex = (currentPage - 1) * rowsPerPage;

  useEffect(() => {
    setInputValue(String(rowsPerPage));
  }, [rowsPerPage]);

  const commitRowsPerPage = (value: string | number) => {
    const nextRowsPerPage = normalizeRowsPerPage(value);
    setInputValue(String(nextRowsPerPage));
    setOptionsOpen(false);
    onRowsPerPageChange(nextRowsPerPage);
    onPageChange(1);
  };

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-x-5">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">Rows per page</span>
          <div className="relative">
            <input
              type="number"
              min={MIN_ROWS_PER_PAGE}
              max={MAX_ROWS_PER_PAGE}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={() => commitRowsPerPage(inputValue)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className="h-8 w-16 rounded-md border border-gray-200 bg-white pl-3 pr-7 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOptionsOpen((open) => !open)}
              className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition"
              aria-label="Pilih rows per page"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${optionsOpen ? "rotate-180" : ""}`} />
            </button>
            {optionsOpen && (
              <div className="absolute left-0 top-10 z-40 w-20 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
                {ROWS_PER_PAGE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitRowsPerPage(option)}
                    className={`w-full px-3 py-2 text-left text-sm transition ${
                      option === rowsPerPage ? "bg-brand-50 font-semibold text-brand-600" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <span className="whitespace-nowrap">Page {currentPage} of {totalPages}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-gray-400 text-sm whitespace-nowrap">
          {totalData === 0 ? "0" : `${startIndex + 1}\u2013${Math.min(startIndex + rowsPerPage, totalData)} of ${totalData}`}
        </span>
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={currentPage === totalPages || totalData === 0}
          onClick={() => onPageChange(currentPage + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
