import React, { useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";

export interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  className = "",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full h-10 px-4 flex items-center justify-between rounded-full border border-gray-200 bg-white text-sm hover:bg-gray-50 focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm transition-all disabled:bg-gray-50 disabled:cursor-wait ${className}`}
      >
        <span className={value && value !== "all" ? "text-gray-700 font-medium truncate" : "text-gray-500 truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
          <div className="absolute left-0 mt-1.5 w-full min-w-[200px] overflow-hidden bg-white border border-gray-200 rounded-xl shadow-lg z-50 flex flex-col animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="p-2 border-b border-gray-150 bg-slate-50/50 relative flex items-center">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-gray-255 rounded-lg outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 transition placeholder:text-gray-400"
                autoFocus
              />
              <Search className="absolute left-4 w-3.5 h-3.5 text-gray-400" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-4 text-gray-400 hover:text-gray-650"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="overflow-y-auto divide-y divide-gray-100 flex-1 max-h-48 bg-white">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-xs text-gray-400 font-medium text-center">
                  Tidak ditemukan.
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left p-3 text-xs transition hover:bg-slate-50 ${
                      value === opt.value ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
