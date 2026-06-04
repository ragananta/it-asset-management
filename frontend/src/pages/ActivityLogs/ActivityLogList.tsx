import { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { Search, ActivitySquare, Monitor, Globe, X, Filter } from "lucide-react";
import TablePagination from "../../components/pagination/TablePagination";
import { useRowsPerPage } from "../../hooks/useRowsPerPage";

interface User {
  id: number;
  name: string;
  email: string;
}

interface ActivityLog {
  id: number;
  user_id: number;
  activity: string;
  description: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user?: User;
}

interface Filters {
  activity: string;
  date_from: string;
  date_to: string;
}

const activityLabel: Record<string, string> = {
  login:       "Login",
  logout:      "Logout",
  register:    "Register",
  create_data: "Tambah Data",
  update_data: "Ubah Data",
  delete_data: "Hapus Data",
};

const activityColor: Record<string, string> = {
  login:       "text-teal-700 bg-teal-50",
  logout:      "text-gray-600 bg-gray-100",
  register:    "text-blue-700 bg-blue-50",
  create_data: "text-green-700 bg-green-50",
  update_data: "text-yellow-700 bg-yellow-50",
  delete_data: "text-red-700 bg-red-50",
};

const activityIcon: Record<string, string> = {
  login:       "→",
  logout:      "←",
  register:    "✦",
  create_data: "+",
  update_data: "✎",
  delete_data: "✕",
};

export default function ActivityLogList() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({ activity: "", date_from: "", date_to: "" });
  const filterRef = useRef<HTMLDivElement>(null);

  const [detailLog, setDetailLog] = useState<ActivityLog | null>(null);
  const [detailClosing, setDetailClosing] = useState(false);

  // ── expand deskripsi per row ─────────────────────────────────────────────
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeFilterCount = [filters.activity, filters.date_from, filters.date_to].filter(Boolean).length;

  // ── Debounce search ───────────────────────────────────────────────────────
  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 400);
  };

  // ── Close filter on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resetFilters = () => {
    setFilters({ activity: "", date_from: "", date_to: "" });
    setCurrentPage(1);
    setFilterOpen(false);
  };

  const openDetail = (log: ActivityLog) => {
    setDetailClosing(false);
    setDetailLog(log);
  };

  const closeDetail = () => {
    setDetailLog(null);
    setDetailClosing(false);
  };

  const requestCloseDetail = () => {
    if (detailClosing) return;
    setDetailClosing(true);
    window.setTimeout(() => closeDetail(), 200);
  };

  useEffect(() => {
    if (!detailLog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestCloseDetail();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailLog, detailClosing]);

  // ── Fetch logs ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(rowsPerPage),
        });
        if (search) params.append("search", search);
        if (filters.activity) params.append("activity", filters.activity);
        if (filters.date_from) params.append("date_from", filters.date_from);
        if (filters.date_to) params.append("date_to", filters.date_to);

        const res = await api.get(`/logs?${params}`);
        if (cancelled) return;

        const payload = res?.data?.data;
        if (payload?.data) {
          setLogs(payload.data);
          setTotalData(payload.total);
          setTotalPages(payload.last_page);
        } else {
          const data = Array.isArray(payload) ? payload : [];
          setLogs(data);
          setTotalData(data.length);
          setTotalPages(1);
        }
      } catch (err) {
        if (!cancelled) console.error("ERROR fetch logs:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [currentPage, rowsPerPage, search, filters]);

  const startIndex = (currentPage - 1) * rowsPerPage;

  const formatDate = (val: string) => {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const getLabel = (val: string) => activityLabel[val] || val;

  const getBrowser = (ua: string) => {
    if (!ua) return "-";
    if (ua.includes("PostmanRuntime")) return "Postman";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Browser lain";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* HEADER INFO */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <ActivitySquare className="w-4 h-4 text-indigo-600" />
        </div>
        <p className="text-xs text-gray-400">Dicatat otomatis oleh sistem · Read only</p>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex justify-end items-center gap-3 mb-5">

        {/* Search */}
        <div className="relative w-96" ref={filterRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Cari user, IP..."
            className="w-full pl-9 pr-20 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => { setSearchInput(""); setSearch(""); setCurrentPage(1); }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full shadow transition ${
              activeFilterCount > 0 ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-indigo-500 text-white hover:bg-indigo-600"
            }`}
          >
            <Filter className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Filter Log</p>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Reset semua
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Aktivitas</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={filters.activity}
                  onChange={(e) => { setFilters((f) => ({ ...f, activity: e.target.value })); setCurrentPage(1); }}
                >
                  <option value="">Semua Aktivitas</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="register">Register</option>
                  <option value="create_data">Tambah Data</option>
                  <option value="update_data">Ubah Data</option>
                  <option value="delete_data">Hapus Data</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal Dari</label>
                <input type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={filters.date_from}
                  onChange={(e) => { setFilters((f) => ({ ...f, date_from: e.target.value })); setCurrentPage(1); }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal Sampai</label>
                <input type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={filters.date_to}
                  onChange={(e) => { setFilters((f) => ({ ...f, date_to: e.target.value })); setCurrentPage(1); }}
                />
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
              >
                Terapkan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ACTIVE FILTER CHIPS */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-400">Filter aktif:</span>
          {filters.activity && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full flex items-center gap-1">
              {activityLabel[filters.activity] || filters.activity}
              <button onClick={() => { setFilters((f) => ({ ...f, activity: "" })); setCurrentPage(1); }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.date_from && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full flex items-center gap-1">
              Dari: {filters.date_from}
              <button onClick={() => { setFilters((f) => ({ ...f, date_from: "" })); setCurrentPage(1); }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.date_to && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full flex items-center gap-1">
              Sampai: {filters.date_to}
              <button onClick={() => { setFilters((f) => ({ ...f, date_to: "" })); setCurrentPage(1); }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ROW CONTROL */}
      <TablePagination
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        totalData={totalData}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12">NO</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[220px]">User</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[150px]">Aktivitas</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Deskripsi</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[130px]">IP Address</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[110px]">Browser</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[160px]">Waktu</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[100px]">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="py-16 text-center text-gray-400">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center text-gray-300">
                {search || activeFilterCount > 0 ? "Tidak ada data yang cocok" : "Data aktivitas belum tersedia"}
              </td></tr>
            ) : (
              logs.map((log, idx) => {
                const isExpanded = expandedRows.has(log.id);
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-blue-50/30 transition cursor-pointer"
                    onClick={() => toggleRow(log.id)}
                  >
                    <td className="px-5 py-4 text-gray-400 text-xs">{startIndex + idx + 1}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold uppercase shrink-0">
                          {(log.user?.name || "?").charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-800 text-sm font-medium truncate">{log.user?.name || "-"}</p>
                          <p className="text-gray-400 text-xs truncate">{log.user?.email || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[110px] text-xs px-2 py-1 rounded-full font-medium ${activityColor[log.activity] || "text-gray-600 bg-gray-100"}`}>
                        <span className="mr-1">{activityIcon[log.activity] || "•"}</span>
                        {getLabel(log.activity)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {/* ── Expand/collapse deskripsi ── */}
                      <p className={isExpanded ? "whitespace-pre-wrap leading-relaxed" : "line-clamp-2 leading-relaxed"}>
                        {log.description || "-"}
                      </p>
                      {log.description && log.description.length > 80 && (
                        <span className="text-indigo-400 text-xs mt-0.5 block">
                          {isExpanded ? "↑ Tutup" : "↓ Selengkapnya"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                        <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{log.ip_address || "-"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                        <Monitor className="w-3 h-3 text-gray-400 shrink-0" />
                        {getBrowser(log.user_agent)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs whitespace-nowrap text-center">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => openDetail(log)}
                          className="text-indigo-600 text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full transition"
                        >
                          Lihat
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DETAIL */}
      {detailLog && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-6 transition-opacity duration-200 ${detailClosing ? "opacity-0" : "opacity-100"}`}
          style={{
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) requestCloseDetail();
          }}
        >
          <style>{`
            @keyframes activityDetailModalIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes activityDetailModalOut {
              from { opacity: 1; transform: scale(1); }
              to { opacity: 0; transform: scale(0.95); }
            }
          `}</style>
          <div
            className="bg-white w-full max-w-[560px] max-h-[90vh] rounded-[20px] shadow-[0_25px_50px_rgba(0,0,0,.15)] overflow-hidden"
            style={{ animation: `${detailClosing ? "activityDetailModalOut" : "activityDetailModalIn"} 200ms ease-out forwards` }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-detail-title"
          >
            <div className="flex items-center justify-between px-7 py-6 border-b border-[#eef2f7] bg-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ActivitySquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="activity-detail-title" className="font-semibold text-lg text-gray-900 leading-tight">Detail Aktivitas</h2>
                  <p className="text-sm text-gray-500 mt-1">Informasi aktivitas yang dicatat otomatis</p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestCloseDetail}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-7 py-6 space-y-5 overflow-y-auto max-h-[calc(90vh-191px)]">
              <div className="flex items-center gap-4 bg-indigo-50 rounded-2xl p-4">
                <div className="w-12 h-12 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-sm font-bold uppercase shrink-0">
                  {(detailLog.user?.name || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{detailLog.user?.name || "-"}</p>
                  <p className="text-sm text-gray-500 truncate">{detailLog.user?.email || "-"}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Aktivitas</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${activityColor[detailLog.activity] || "text-gray-600 bg-gray-100"}`}>
                    {getLabel(detailLog.activity)}
                  </span>
                </div>
                <div className="flex justify-between items-start text-sm gap-4">
                  <span className="text-gray-400 shrink-0">Deskripsi</span>
                  <span className="text-gray-700 text-right text-sm leading-relaxed">{detailLog.description || "-"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">IP Address</span>
                  <span className="text-gray-700 font-mono text-xs">{detailLog.ip_address || "-"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Browser</span>
                  <span className="text-gray-700 text-xs">{getBrowser(detailLog.user_agent)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Waktu</span>
                  <span className="text-gray-700 text-xs">{formatDate(detailLog.created_at)}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">User Agent</p>
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-4 break-all leading-relaxed">
                  {detailLog.user_agent || "-"}
                </p>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-7 py-5 border-t border-[#eef2f7] flex justify-end">
              <button
                onClick={requestCloseDetail}
                className="h-11 px-5 text-sm font-medium text-gray-700 bg-[#f8fafc] hover:bg-[#e2e8f0] rounded-[10px] transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
