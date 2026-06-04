import { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { useAssets } from "../../context/AssetsContext";
import { usePolling } from "../../hooks/usePolling";
import { Search, Plus, Pencil, Trash2, X, Check, Wrench, Download, Filter, LockKeyhole } from "lucide-react";
import TablePagination from "../../components/pagination/TablePagination";
import { useRowsPerPage } from "../../hooks/useRowsPerPage";

interface Asset {
  id: number;
  asset_name: string;
  asset_code: string;
}

interface MaintenanceLog {
  id: number;
  asset_id: number;
  date: string;
  description: string;
  cost: number;
  pic: string;
  status: "ongoing" | "completed";
  asset?: Asset;
  created_at?: string;
  deleted_at?: string | null;
}

interface MaintenanceForm {
  asset_id: string;
  date: string;
  description: string;
  cost: string;
  pic: string;
  status: string;
}

const emptyForm: MaintenanceForm = {
  asset_id: "", date: "", description: "", cost: "", pic: "", status: "ongoing",
};

const STATUS_OPTIONS = [
  { value: "",          label: "Semua",       activeClass: "bg-blue-600 text-white border-blue-600" },
  { value: "ongoing",   label: "Berlangsung", activeClass: "bg-amber-500 text-white border-amber-500" },
  { value: "completed", label: "Selesai",     activeClass: "bg-teal-500 text-white border-teal-500" },
];

const sortNewestFirst = (items: MaintenanceLog[]) =>
  [...items].sort((a, b) => {
    const dateA = new Date(a.date || a.created_at || 0).getTime();
    const dateB = new Date(b.date || b.created_at || 0).getTime();
    if (dateA !== dateB) return dateB - dateA;

    const createdA = new Date(a.created_at || 0).getTime();
    const createdB = new Date(b.created_at || 0).getTime();
    if (createdA !== createdB) return createdB - createdA;

    return b.id - a.id;
  });

export default function MaintenanceList() {
  const { assets, ensureAssets } = useAssets();

  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [rowsPerPage, setRowsPerPage] = useRowsPerPage();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MaintenanceLog | null>(null);
  const [form, setForm] = useState<MaintenanceForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [deleteTarget, setDeleteTarget] = useState<MaintenanceLog | null>(null);
  const [exporting, setExporting] = useState(false);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  usePolling(triggerRefresh, 30000, !modalOpen && !deleteTarget);

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

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setCurrentPage(1); }, 400);
  };

  const activeFilterCount = [filterDateFrom, filterDateTo].filter(Boolean).length;

  const resetDateFilter = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setCurrentPage(1);
    setFilterOpen(false);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: String(currentPage), per_page: String(rowsPerPage) });
        if (search) params.append("search", search);
        if (filterStatus) params.append("status", filterStatus);
        if (filterDateFrom) params.append("date_from", filterDateFrom);
        if (filterDateTo) params.append("date_to", filterDateTo);

        const res = await api.get(`/maintenance-logs?${params}`);
        if (cancelled) return;

        const payload = res?.data?.data;

        // Handle response baru yang include total_cost
        if (payload?.logs) {
          const logsData = payload.logs;
          if (logsData?.data) {
            setLogs(sortNewestFirst(logsData.data));
            setTotalData(logsData.total);
            setTotalPages(logsData.last_page);
          } else {
            setLogs(sortNewestFirst(Array.isArray(logsData) ? logsData : []));
            setTotalData(logsData?.length || 0);
            setTotalPages(1);
          }
          setTotalCost(payload.total_cost || 0);
        } else if (payload?.data) {
          // Fallback struktur lama
          setLogs(sortNewestFirst(payload.data));
          setTotalData(payload.total);
          setTotalPages(payload.last_page);
          setTotalCost(0);
        } else {
          const data = Array.isArray(payload) ? payload : [];
          setLogs(sortNewestFirst(data)); setTotalData(data.length); setTotalPages(1);
          setTotalCost(0);
        }
      } catch (err) {
        if (!cancelled) console.error("ERROR fetch maintenance:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [currentPage, rowsPerPage, search, filterStatus, filterDateFrom, filterDateTo, refreshKey]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const ongoingCount = logs.filter((l) => l.status === "ongoing").length;

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterStatus) params.append("status", filterStatus);
      if (filterDateFrom) params.append("date_from", filterDateFrom);
      if (filterDateTo) params.append("date_to", filterDateTo);

      const res = await api.get(`/maintenance-logs/export?${params}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `maintenance-log-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ERROR export:", err);
      alert("Gagal export data");
    } finally {
      setExporting(false);
    }
  };

  const openCreate = () => {
    ensureAssets();
    setEditTarget(null); setForm(emptyForm); setErrors({}); setModalOpen(true);
  };

  const openEdit = (log: MaintenanceLog) => {
    if (log.status === "completed") return;
    ensureAssets();
    setEditTarget(log);
    setForm({
      asset_id: String(log.asset_id), date: log.date?.slice(0, 10) || "",
      description: log.description || "", cost: String(log.cost || ""),
      pic: log.pic || "", status: log.status || "ongoing",
    });
    setErrors({}); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditTarget(null); setForm(emptyForm); setErrors({}); };

  const handleSave = async () => {
    if (editTarget?.status === "completed") {
      setErrors({ status: "Maintenance yang sudah selesai tidak dapat diedit." });
      return;
    }

    const target = editTarget;

    try {
      setErrors({});
      const payload = { ...form, asset_id: Number(form.asset_id), cost: Number(form.cost) };

      closeModal(); // ← tutup modal langsung

      if (target) {
        const res = await api.put(`/maintenance-logs/${target.id}`, payload);
        const updated: MaintenanceLog = res?.data?.data || { ...target, ...payload };
        setLogs((prev) => sortNewestFirst(prev.map((item) => item.id === target.id ? { ...item, ...updated } : item)));
      } else {
        await api.post("/maintenance-logs", payload);
        setCurrentPage(1); triggerRefresh();
      }
    } catch (err: any) {
      setModalOpen(true); // buka modal lagi kalau error
      setEditTarget(target);
      if (err?.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val);
        });
        setErrors(apiErrors);
      } else {
        setErrors({ form: err?.response?.data?.message || "Gagal menyimpan maintenance" });
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const prevLogs = logs;
    const prevTotal = totalData;

    const updated = logs.filter((item) => item.id !== deleteTarget.id);
    setLogs(updated);
    setTotalData((t) => t - 1);
    const newPage = updated.length === 0 && currentPage > 1 ? currentPage - 1 : currentPage;
    setCurrentPage(newPage);
    setDeleteTarget(null); // tutup modal langsung

    api.delete(`/maintenance-logs/${deleteTarget.id}`).catch((err) => {
      setLogs(prevLogs);
      setTotalData(prevTotal);
      alert(err?.response?.data?.message || "Gagal menghapus log maintenance");
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const formatDate = (val: string) => {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* TOOLBAR */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">

        {/* Kiri: Filter status pill tabs */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
          {STATUS_OPTIONS.map((s) => (
            <button key={s.value}
              onClick={() => { setFilterStatus(s.value); setCurrentPage(1); }}
              className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                filterStatus === s.value ? s.activeClass : "bg-transparent text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {s.label}
              {s.value === "ongoing" && ongoingCount > 0 && filterStatus !== "ongoing" && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {ongoingCount > 9 ? "9+" : ongoingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Kanan: Filter tanggal + Search + Export + Tambah */}
        <div className="flex items-center gap-2">

          {/* Search + Filter tanggal */}
          <div className="relative w-80" ref={filterRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              placeholder="Cari maintenance..."
              className="w-full pl-9 pr-20 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => { setSearchInput(""); setSearch(""); setCurrentPage(1); }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full shadow transition ${
                activeFilterCount > 0 ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-teal-500 text-white hover:bg-teal-600"
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
              <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Filter Tanggal</p>
                  {activeFilterCount > 0 && (
                    <button onClick={resetDateFilter} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                      <X className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Dari</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sampai</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <button onClick={() => setFilterOpen(false)}
                  className="w-full py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                  Terapkan
                </button>
              </div>
            )}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 transition disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            {exporting ? "..." : "Export"}
          </button>

          {/* Tambah */}
          <button onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-2.5 rounded-full text-sm font-medium shadow flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[4%]">No</th>
              <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[16%]">Aset</th>
              <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[9%]">Tanggal</th>
              <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[23%]">Deskripsi</th>
              <th className="px-3 py-4 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[12%]">Biaya</th>
              <th className="px-3 py-4 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[8%]">PIC</th>
              <th className="px-3 py-4 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[11%]">Status</th>
              <th className="px-3 py-4 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[17%]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="py-16 text-center text-gray-400">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center text-gray-300">
                {search ? "Tidak ada data yang cocok" : "Data maintenance belum tersedia"}
              </td></tr>
            ) : (
              logs.map((log, idx) => (
                <tr key={log.id} className={`transition ${log.status === "completed" ? "bg-gray-50/60 hover:bg-gray-50" : "hover:bg-blue-50/20"}`}>
                  <td className="px-3 py-4 text-gray-400 text-xs align-middle">{startIndex + idx + 1}</td>
                  <td className="px-3 py-4 align-middle">
                    {log.asset ? (
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm leading-tight truncate">{log.asset.asset_name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{log.asset.asset_code}</p>
                      </div>
                    ) : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-3 py-4 text-gray-600 text-xs whitespace-nowrap align-middle">{formatDate(log.date)}</td>
                  <td className="px-3 py-4 text-gray-600 text-xs align-middle">
                    <p className="line-clamp-2 leading-relaxed">{log.description || "-"}</p>
                  </td>
                  <td className="px-3 py-4 text-gray-700 text-xs font-medium whitespace-nowrap text-right align-middle">
                    {log.cost ? formatCurrency(log.cost) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-4 text-center align-middle">
                    <span className="inline-flex max-w-full items-center justify-center text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-full truncate">
                      {log.pic || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center align-middle">
                    <span className={`inline-flex items-center justify-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                      log.status === "completed" ? "text-teal-700 bg-teal-50" : "text-amber-700 bg-amber-50"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${log.status === "completed" ? "bg-teal-500" : "bg-amber-500"}`} />
                      {log.status === "completed" ? "Selesai" : "Berlangsung"}
                    </span>
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <div className="grid grid-cols-[74px_66px] items-center justify-center gap-2">
                      {log.status === "completed" ? (
                        <button
                          disabled
                          title="Maintenance yang sudah selesai tidak dapat diedit"
                          className="w-full text-gray-400 text-xs bg-gray-100 px-2 py-1 rounded-full flex items-center justify-center gap-1 cursor-not-allowed whitespace-nowrap"
                        >
                          <LockKeyhole className="w-3 h-3" /> Terkunci
                        </button>
                      ) : (
                        <button onClick={() => openEdit(log)}
                          className="w-full text-yellow-600 text-xs bg-yellow-50 hover:bg-yellow-100 px-2 py-1 rounded-full flex items-center justify-center gap-1 transition whitespace-nowrap">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(log)}
                        className="w-full text-red-500 text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded-full flex items-center justify-center gap-1 transition whitespace-nowrap">
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* TOTAL BIAYA */}
          {!loading && logs.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-100 bg-gray-50">
                <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-500 text-right">
                  Total Biaya ({totalData} log):
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-800 text-right whitespace-nowrap">
                  {formatCurrency(totalCost)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* MODAL CREATE/EDIT */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center z-50 px-4 py-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden border border-white/80">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {editTarget ? "Edit Maintenance" : "Tambah Maintenance"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editTarget ? "Perbarui detail maintenance yang masih berlangsung" : "Catat maintenance aset baru"}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[calc(92vh-145px)]">
              {errors.form && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {errors.form}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Aset <span className="text-red-500">*</span></label>
                <select
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.asset_id ? "border-red-400" : "border-gray-200"}`}
                  value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })}>
                  <option value="">-- Pilih Aset --</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</option>)}
                </select>
                {errors.asset_id && <p className="text-red-500 text-xs mt-1">{errors.asset_id}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal <span className="text-red-500">*</span></label>
                <input type="date"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.date ? "border-red-400" : "border-gray-200"}`}
                  value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi <span className="text-red-500">*</span></label>
                <textarea
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none ${errors.description ? "border-red-400" : "border-gray-200"}`}
                  placeholder="Jelaskan kerusakan atau tindakan maintenance..."
                  rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Biaya (Rp)</label>
                  <input type="number"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.cost ? "border-red-400" : "border-gray-200"}`}
                    placeholder="0" value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                  {errors.cost && <p className="text-red-500 text-xs mt-1">{errors.cost}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PIC / Teknisi <span className="text-red-500">*</span></label>
                  <input type="text"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.pic ? "border-red-400" : "border-gray-200"}`}
                    placeholder="Nama teknisi" value={form.pic}
                    onChange={(e) => setForm({ ...form, pic: e.target.value })} />
                  {errors.pic && <p className="text-red-500 text-xs mt-1">{errors.pic}</p>}
                </div>
              </div>

              {editTarget && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                  <div className="flex gap-2">
                    {[
                      { val: "ongoing",   label: "Berlangsung", cls: "bg-amber-500 text-white border-amber-500" },
                      { val: "completed", label: "Selesai",     cls: "bg-teal-500 text-white border-teal-500" },
                    ].map((s) => (
                      <button key={s.val} type="button"
                        onClick={() => setForm({ ...form, status: s.val })}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition border ${
                          form.status === s.val ? s.cls : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Batal</button>
              <button onClick={handleSave}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2 shadow-sm">
                <Check className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Hapus Log Maintenance?</h3>
              <p className="text-sm text-gray-500">
                Apakah anda yakin ingin menghapus Data maintenance aset{" "}
                <span className="font-medium text-gray-700">"{deleteTarget.asset?.asset_name || `ID ${deleteTarget.asset_id}`}"</span>{" "}
              </p>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Batal</button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
