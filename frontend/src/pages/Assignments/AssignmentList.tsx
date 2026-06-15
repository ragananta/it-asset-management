import { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { useAssets } from "../../context/AssetsContext";
import { useKaryawan } from "../../context/KaryawanContext";
import { usePolling } from "../../hooks/usePolling";
import { Search, Plus, Pencil, Trash2, X, Check, UserCheck, Download, Save } from "lucide-react";
import TablePagination from "../../components/pagination/TablePagination";
import { useRowsPerPage } from "../../hooks/useRowsPerPage";

interface Assignment {
  id: number;
  asset_id: number;
  user_name: string;
  phone?: string;
  assign_date: string;


  return_date: string | null;
  note?: string;
  deleted_at?: string | null;
  asset?: { id: number; asset_name: string; asset_code: string };
}

interface AssignmentForm {
  asset_id: string;
  user_name: string;
  phone: string;
  assign_date: string;
  return_date: string;
  note: string;
}

const emptyForm: AssignmentForm = {
  asset_id: "", user_name: "", phone: "", assign_date: "", return_date: "", note: "",
};

const STATUS_OPTIONS = [
  { value: "",         label: "Semua" },
  { value: "active",   label: "Dipinjam",     activeClass: "bg-blue-600 text-white border-blue-600" },
  { value: "returned", label: "Dikembalikan", activeClass: "bg-gray-500 text-white border-gray-500" },
];

export default function AssignmentList() {
  const { assets, ensureAssets, refetchAssets } = useAssets();
  const { karyawanList, loadingKaryawan, ensureKaryawan } = useKaryawan();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const assetSelectRef = useRef<HTMLSelectElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [karyawanInput, setKaryawanInput] = useState("");
  const [karyawanDropdown, setKaryawanDropdown] = useState<typeof karyawanList>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  usePolling(triggerRefresh, 30000, !modalOpen && !deleteTarget);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setCurrentPage(1); }, 400);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!karyawanInput.trim()) { setKaryawanDropdown([]); setShowDropdown(false); return; }
    const keyword = karyawanInput.toLowerCase();
    const filtered = karyawanList
      .filter((k) => k.name.toLowerCase().includes(keyword) || k.departemen.toLowerCase().includes(keyword))
      .slice(0, 8);
    setKaryawanDropdown(filtered);
    setShowDropdown(filtered.length > 0);
  }, [karyawanInput, karyawanList]);

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => assetSelectRef.current?.focus(), 80);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestCloseModal();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: String(currentPage), per_page: String(rowsPerPage) });
        if (search) params.append("search", search);
        if (filterStatus === "active") params.append("is_active", "1");
        if (filterStatus === "returned") params.append("is_active", "0");
        const res = await api.get(`/asset-assignments?${params}`);
        if (cancelled) return;
        const payload = res?.data?.data;
        if (payload?.data) {
          setAssignments(payload.data); setTotalData(payload.total); setTotalPages(payload.last_page);
        } else {
          const data = Array.isArray(payload) ? payload : [];
          setAssignments(data); setTotalData(data.length); setTotalPages(1);
        }
      } catch (err) {
        if (!cancelled) console.error("ERROR fetch assignments:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [currentPage, rowsPerPage, search, filterStatus, refreshKey]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const isActive = (item: Assignment) => !item.return_date;
  const dipinjamCount = assignments.filter(isActive).length;

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterStatus === "active") params.append("is_active", "1");
      if (filterStatus === "returned") params.append("is_active", "0");
      const res = await api.get(`/asset-assignments/export?${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `data-peminjaman-${Date.now()}.xlsx`);
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
    ensureAssets(); ensureKaryawan();
    setModalClosing(false);
    setEditTarget(null); setForm(emptyForm); setKaryawanInput(""); setErrors({}); setModalOpen(true);
  };

  const openEdit = (item: Assignment) => {
    ensureAssets(); ensureKaryawan();
    setModalClosing(false);
    setEditTarget(item);
    setForm({
      asset_id: String(item.asset_id), user_name: item.user_name || "",
      phone: item.phone || "", assign_date: item.assign_date?.slice(0, 10) || "",
      return_date: item.return_date?.slice(0, 10) || "", note: item.note || "",
    });
    setKaryawanInput(item.user_name || ""); setErrors({}); setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false); setEditTarget(null); setForm(emptyForm);
    setModalClosing(false);
    setKaryawanInput(""); setShowDropdown(false); setErrors({});
  };

  const requestCloseModal = () => {
    if (modalClosing) return;
    setModalClosing(true);
    window.setTimeout(() => closeModal(), 200);
  };

  const selectKaryawan = (k: typeof karyawanList[0]) => {
    setForm((f) => ({ ...f, user_name: k.name }));
    setKaryawanInput(k.name); setShowDropdown(false);
  };

  const handleSave = async () => {
  try {
    setErrors({});
    const payload = {
      asset_id: Number(form.asset_id), user_name: form.user_name, phone: form.phone,
      assign_date: form.assign_date, return_date: form.return_date || null, note: form.note || null,
    };

    closeModal(); 

    if (editTarget) {
      const res = await api.put(`/asset-assignments/${editTarget.id}`, payload);
      const updated: Assignment = res?.data?.data || { ...editTarget, ...payload };
      setAssignments((prev) => prev.map((item) => item.id === editTarget.id ? { ...item, ...updated } : item));
    } else {
      await api.post("/asset-assignments", payload);
      setCurrentPage(1); triggerRefresh();
    }
    refetchAssets();
  } catch (err: any) {
    setModalOpen(true);
    if (err?.response?.data?.errors) {
      const apiErrors: Record<string, string> = {};
      Object.entries(err.response.data.errors).forEach(([key, val]) => {
        apiErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val);
      });
      setErrors(apiErrors);
    } else if (err?.response?.data?.message) {
      setErrors({ asset_id: err.response.data.message });
    }
  }
};
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const prevAssignments = assignments; const prevTotal = totalData;
    try {
      setDeleting(true);
      const updated = assignments.filter((item) => item.id !== deleteTarget.id);
      setAssignments(updated); setTotalData((t) => t - 1);
      const newPage = updated.length === 0 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
      await api.delete(`/asset-assignments/${deleteTarget.id}`);
      setDeleteTarget(null);
    } catch (err: any) {
      setAssignments(prevAssignments); setTotalData(prevTotal);
      alert(err?.response?.data?.message || "Gagal menghapus data peminjaman");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (val: string | null) => {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* TOOLBAR */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilterStatus(opt.value); setCurrentPage(1); }}
              className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition border ${
                filterStatus === opt.value
                  ? (opt.activeClass || "bg-brand-600 text-white border-brand-600")
                  : "bg-transparent text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {opt.label}
              {opt.value === "active" && dipinjamCount > 0 && filterStatus !== "active" && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {dipinjamCount > 9 ? "9+" : dipinjamCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              placeholder="Cari peminjaman..."
              className="w-full h-10 pl-9 pr-9 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
                onClick={() => { setSearchInput(""); setSearch(""); setCurrentPage(1); }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleExport} disabled={exporting}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 h-10 px-4 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 transition disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            {exporting ? "..." : "Export"}
          </button>

          <button onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 transition text-white h-10 px-4 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap">
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
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[4%]">No</th>
                <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[18%]">Aset</th>
                <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[19%]">Dipinjam Oleh</th>
                <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[12%]">No. WA</th>
                <th className="px-3 py-4 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[8.5%]">Tgl Pinjam</th>
                <th className="px-3 py-4 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[8.5%]">Tgl Kembali</th>
                <th className="px-3 py-4 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[9.5%]">Status</th>
                <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[7.5%]">Catatan</th>
                <th className="px-3 py-4 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[13%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center text-gray-400">Loading...</td></tr>
              ) : assignments.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-gray-300">
                  {search ? "Tidak ada data yang cocok" : "Data peminjaman belum tersedia"}
                </td></tr>
              ) : (
                assignments.map((item, idx) => (
                  <tr key={item.id} className={`hover:bg-blue-50/20 transition ${!isActive(item) ? "opacity-60" : ""}`}>
                    <td className="px-3 py-4 text-gray-400 text-xs align-middle">{startIndex + idx + 1}</td>
                    <td className="px-3 py-4 align-middle">
                      {item.asset ? (
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm leading-tight truncate">{item.asset.asset_name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{item.asset.asset_code}</p>
                        </div>
                      ) : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-3 py-4 align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold uppercase shrink-0">
                          {(item.user_name || "?").charAt(0)}
                        </div>
                        <span className="text-gray-700 text-sm truncate min-w-0">{item.user_name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 align-middle">
                      {item.phone ? (
                        <a
                          href={`https://wa.me/${item.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex max-w-full items-center gap-1.5 text-xs text-green-600 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-full transition font-mono whitespace-nowrap"
                        >
                          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          <span className="truncate">{item.phone}</span>
                        </a>
                      ) : (
                        <span className="text-gray-700 text-sm truncate block max-w-[120px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-gray-600 text-xs whitespace-nowrap text-center align-middle">{formatDate(item.assign_date)}</td>
                    <td className="px-3 py-4 text-gray-600 text-xs whitespace-nowrap text-center align-middle">{formatDate(item.return_date)}</td>
                    <td className="px-3 py-4 text-center align-middle">
                      <span className={`inline-flex items-center justify-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap w-28 ${
                        isActive(item) ? "text-blue-700 bg-blue-50" : "text-gray-500 bg-gray-100"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive(item) ? "bg-blue-500" : "bg-gray-400"}`} />
                        {isActive(item) ? "Dipinjam" : "Dikembalikan"}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-gray-500 text-xs align-middle">
                      <p className="line-clamp-2 leading-relaxed">{item.note || "-"}</p>
                    </td>
                    <td className="px-3 py-4 align-middle">
                      <div className="flex items-center justify-center gap-1.5 min-w-0">
                        {isActive(item) ? (
                          <button onClick={() => openEdit(item)}
                            className="text-purple-600 text-xs bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-full flex items-center gap-1 transition whitespace-nowrap"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        ) : (
                          <button
                            disabled
                            className="text-purple-600 text-xs bg-purple-50 px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap invisible pointer-events-none select-none"
                            tabIndex={-1}
                            aria-hidden="true"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(item)}
                          className="text-red-500 text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded-full flex items-center gap-1 transition whitespace-nowrap">
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
        </table>
      </div>

      {/* MODAL CREATE/EDIT */}
      {modalOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 py-6 transition-opacity duration-200 ${modalClosing ? "opacity-0" : "opacity-100"}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) requestCloseModal();
          }}
        >
          <style>{`
            @keyframes assignmentModalIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes assignmentModalOut {
              from { opacity: 1; transform: scale(1); }
              to { opacity: 0; transform: scale(0.95); }
            }
          `}</style>
          <div
            className="bg-white w-full max-w-[760px] max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col"
            style={{ animation: `${modalClosing ? "assignmentModalOut" : "assignmentModalIn"} 200ms ease-out forwards` }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  {editTarget ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h2 id="assignment-modal-title" className="font-semibold text-lg text-gray-900 leading-tight">
                  {editTarget ? "Edit Data" : "Tambah Data"}
                </h2>
              </div>
              <button
                type="button"
                onClick={requestCloseModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="px-7 py-6 overflow-y-auto flex-1 bg-slate-50/20">
              {/* Inner Card Container */}
              <div className="border border-slate-100 rounded-2xl p-6 bg-white shadow-sm">
                {/* Card Section Header */}
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-slate-800 text-sm">
                    {editTarget ? "Edit Detail Peminjaman" : "Tambah Peminjaman Aset"}
                  </span>
                </div>

                {/* Form fields in responsive grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Field: Aset */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Aset <span className="text-red-500">*</span></label>
                    <select
                      ref={assetSelectRef}
                      className={`w-full h-12 border rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 ${errors.asset_id ? "border-red-400" : "border-gray-200"}`}
                      value={form.asset_id}
                      onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                    >
                      <option value="">-- Pilih Aset --</option>
                      {assets.map((a) => {
                        const isBorrowed = a.status === "borrowed";
                        const isCurrentAsset = editTarget && String(editTarget.asset_id) === String(a.id);
                        const disabled = isBorrowed && !isCurrentAsset;
                        return (
                          <option
                            key={a.id}
                            value={a.id}
                            disabled={disabled}
                            style={disabled ? { color: "#9ca3af", backgroundColor: "#f9fafb" } : {}}
                          >
                            {a.asset_code} — {a.asset_name}{disabled ? " (Sedang Dipinjam)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    {errors.asset_id && <p className="text-red-500 text-xs mt-1">{errors.asset_id}</p>}
                  </div>

                  {/* Field: Nama Peminjam */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Peminjam <span className="text-red-500">*</span></label>
                    <div className="relative" ref={dropdownRef}>
                      <input type="text"
                        className={`w-full h-12 border rounded-lg px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 ${errors.user_name ? "border-red-400" : "border-gray-200"}`}
                        placeholder={loadingKaryawan ? "Memuat data karyawan..." : "Ketik nama karyawan..."}
                        value={karyawanInput} disabled={loadingKaryawan}
                        onChange={(e) => { setKaryawanInput(e.target.value); setForm((f) => ({ ...f, user_name: e.target.value })); }}
                      />
                    </div>
                    {errors.user_name && <p className="text-red-500 text-xs mt-1">{errors.user_name}</p>}
                  </div>

                  {/* Field: No. WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">No. WhatsApp <span className="text-red-500">*</span></label>
                    <input type="tel"
                      className={`w-full h-12 border rounded-lg px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 ${errors.phone ? "border-red-400" : "border-[#dbe2ea]"}`}
                      placeholder="628123456789" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    <p className="text-xs text-gray-400 mt-1">Format: 628xxx (tanpa + atau spasi)</p>
                  </div>

                  {/* Field: Tgl Pinjam */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tgl Pinjam <span className="text-red-500">*</span></label>
                    <input type="date"
                      className={`w-full h-12 border rounded-lg px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 ${errors.assign_date ? "border-red-400" : "border-[#dbe2ea]"}`}
                      value={form.assign_date} onChange={(e) => setForm({ ...form, assign_date: e.target.value })} />
                    {errors.assign_date && <p className="text-red-500 text-xs mt-1">{errors.assign_date}</p>}
                  </div>

                  {/* Field: Tgl Kembali */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tgl Kembali <span className="text-gray-400 font-normal">(opsional)</span></label>
                    <input type="date"
                      className="w-full h-12 border border-[#dbe2ea] rounded-lg px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15"
                      value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} />
                  </div>

                  {/* Field: Catatan */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catatan <span className="text-gray-400 font-normal">(opsional)</span></label>
                    <textarea className="w-full min-h-[100px] border border-[#dbe2ea] rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 resize-y"
                      placeholder="Keterangan tambahan..." rows={3} value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white px-7 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={requestCloseModal}
                className="h-10 px-6 text-sm font-semibold text-white bg-red-500 hover:bg-red-650 rounded-full transition shadow-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="h-10 px-6 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full transition flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <style>{`@keyframes deleteModalIn { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }`}</style>
          <div
            className="bg-white rounded-xl shadow-[0_25px_50px_rgba(0,0,0,0.15)] w-full max-w-sm"
            style={{ animation: "deleteModalIn 200ms ease-out forwards" }}
            role="dialog" aria-modal="true"
          >
            <div className="px-6 py-6 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 text-base mb-1">Hapus Peminjaman?</h3>
              <p className="text-sm text-gray-500">
                Data peminjaman oleh{" "}
                <span className="font-medium text-gray-700">"{deleteTarget.user_name}"</span>{" "}
                akan dihapus permanen.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-11 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition">Batal</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 h-11 text-sm font-medium text-white bg-red-650 hover:bg-red-700 rounded-lg transition disabled:opacity-50">
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
