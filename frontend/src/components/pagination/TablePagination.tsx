import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

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
  const startIndex = (currentPage - 1) * rowsPerPage;

  useEffect(() => {
    setInputValue(String(rowsPerPage));
  }, [rowsPerPage]);

  const commitRowsPerPage = (value: string | number) => {
    const nextRowsPerPage = normalizeRowsPerPage(value);
    setInputValue(String(nextRowsPerPage));
    onRowsPerPageChange(nextRowsPerPage);
    onPageChange(1);
  };

  const changeRowsPerPageBy = (amount: number) => {
    commitRowsPerPage(rowsPerPage + amount);
  };

  return (
    <div className={`flex flex-wrap justify-between items-center gap-3 text-sm text-gray-500 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">Rows per page</span>
          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => changeRowsPerPageBy(-1)}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
              disabled={rowsPerPage <= MIN_ROWS_PER_PAGE}
              aria-label="Kurangi rows per page"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
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
              className="h-9 w-14 border-x border-gray-200 text-center text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => changeRowsPerPageBy(1)}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
              disabled={rowsPerPage >= MAX_ROWS_PER_PAGE}
              aria-label="Tambah rows per page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
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
