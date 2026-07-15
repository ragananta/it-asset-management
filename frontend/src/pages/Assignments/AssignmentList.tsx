import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import axios from "axios";
import { useAssets } from "../../context/AssetsContext";
import { useKaryawan } from "../../context/KaryawanContext";
import { usePolling } from "../../hooks/usePolling";
import { Search, Plus, Pencil, Trash2, X, Check, UserCheck, Download, Save, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import TablePagination from "../../components/pagination/TablePagination";
import { useRowsPerPage } from "../../hooks/useRowsPerPage";
import { isListEqual } from "../../utils/equality";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import ExportConfirmationModal from "../../components/ExportConfirmationModal";
import { DatePicker } from "../../components/ui/date-picker";

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
  const { assets, ensureAssets, refetchAssets, loadingAssets } = useAssets();
  const { karyawanList, loadingKaryawan, ensureKaryawan } = useKaryawan();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get("status") || "");
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(searchParams.get("page") || "1", 10);
  });

  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "created_at");
  const [sortOrder, setSortOrder] = useState(() => searchParams.get("order") || "desc");

  useEffect(() => {
    const params: Record<string, string> = {};
    if (currentPage > 1) params.page = String(currentPage);
    if (search) params.search = search;
    if (filterStatus) params.status = filterStatus;
    if (sortBy && sortBy !== "created_at") params.sort = sortBy;
    if (sortOrder && sortOrder !== "desc") params.order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [currentPage, search, filterStatus, rowsPerPage, sortBy, sortOrder, setSearchParams]);

  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);
  const isSilentRef = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const assetSelectRef = useRef<HTMLButtonElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const [karyawanInput, setKaryawanInput] = useState("");
  const [karyawanDropdown, setKaryawanDropdown] = useState<typeof karyawanList>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Custom asset select dropdown states
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const assetDropdownRef = useRef<HTMLDivElement>(null);

  const filteredAssetOptions = useMemo(() => {
    const available = assets.filter((a) => {
      const isBorrowed = a.status === "borrowed";
      const isCurrentAsset = editTarget && String(editTarget.asset_id) === String(a.id);
      return !isBorrowed || isCurrentAsset;
    });

    const q = assetSearch.toLowerCase().trim();
    if (!q) return available;
    return available.filter(
      (a) =>
        a.asset_code?.toLowerCase().includes(q) ||
        a.asset_name?.toLowerCase().includes(q)
    );
  }, [assets, assetSearch, editTarget]);

  const triggerRefresh = () => {
    isSilentRef.current = false;
    setRefreshKey((k) => k + 1);
  };

  const triggerSilentRefresh = () => {
    isSilentRef.current = true;
    setRefreshKey((k) => k + 1);
  };

  usePolling(triggerSilentRefresh, 30000, !modalOpen && !deleteTarget);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setCurrentPage(1); }, 400);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(e.target as Node)) setShowAssetDropdown(false);
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
      if (e.key === "Escape" && !saving) requestCloseModal();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen, saving]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      if (isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        if (!isSilentRef.current) {
          setLoading(true);
        }
        const params = new URLSearchParams({ page: String(currentPage), per_page: String(rowsPerPage) });
        if (search) params.append("search", search);
        if (filterStatus === "active") params.append("is_active", "1");
        if (filterStatus === "returned") params.append("is_active", "0");
        if (sortBy) params.append("sort_by", sortBy);
        if (sortOrder) params.append("sort_order", sortOrder);

        const res = await api.get(`/asset-assignments?${params}`, {
          signal: controller.signal
        });
        const payload = res?.data?.data;
        if (payload?.data) {
          if (isSilentRef.current && isListEqual(assignments, payload.data, ['id', 'updated_at', 'status'])) {
            isSilentRef.current = false;
            return;
          }
          setAssignments(payload.data); setTotalData(payload.total); setTotalPages(payload.last_page);
        } else {
          const data = Array.isArray(payload) ? payload : [];
          if (isSilentRef.current && isListEqual(assignments, data, ['id', 'updated_at', 'status'])) {
            isSilentRef.current = false;
            return;
          }
          setAssignments(data); setTotalData(data.length); setTotalPages(1);
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("ERROR fetch assignments:", err);
        }
      } finally {
        isFetchingRef.current = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          if (!isSilentRef.current) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          isSilentRef.current = false;
        }
      }
    };
    fetchData();
    return () => {
      controller.abort();
      isFetchingRef.current = false;
    };
  }, [currentPage, rowsPerPage, search, filterStatus, sortBy, sortOrder, refreshKey]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const isActive = (item: Assignment) => !item.return_date;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const dipinjamCount = assignments.filter(isActive).length;

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterStatus === "active") params.append("is_active", "1");
      if (filterStatus === "returned") params.append("is_active", "0");
      if (sortBy) params.append("sort_by", sortBy);
      if (sortOrder) params.append("sort_order", sortOrder);
      const res = await api.get(`/asset-assignments/export?${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `data-peminjaman-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast("Data berhasil diekspor.");
    } catch (err) {
      console.error("ERROR export:", err);
      setToast("Gagal export data");
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
    setShowAssetDropdown(false); setAssetSearch("");
  };

  const requestCloseModal = () => {
    if (saving || modalClosing) return;
    setModalClosing(true);
    window.setTimeout(() => closeModal(), 200);
  };

  const selectKaryawan = (k: typeof karyawanList[0]) => {
    setForm((f) => ({ ...f, user_name: k.name, phone: k.phone || "" }));
    setKaryawanInput(k.name); setShowDropdown(false);
  };

  const handleSave = async () => {
    if (saving) return;
    try {
      setErrors({});
      setSaving(true);
      const payload = {
        asset_id: Number(form.asset_id), user_name: form.user_name, phone: form.phone,
        assign_date: form.assign_date, return_date: form.return_date || null, note: form.note || null,
      };

      if (editTarget) {
        const res = await api.put(`/asset-assignments/${editTarget.id}`, payload);
        const updated: Assignment = res?.data?.data || { ...editTarget, ...payload };
        setAssignments((prev) => prev.map((item) => item.id === editTarget.id ? { ...item, ...updated } : item));
        setToast("Data peminjaman berhasil diperbarui");
      } else {
        await api.post("/asset-assignments", payload);
        setCurrentPage(1); triggerRefresh();
        setToast("Data peminjaman berhasil ditambahkan");
      }
      refetchAssets();
      closeModal();
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val);
        });
        setErrors(apiErrors);
      } else if (err?.response?.data?.message) {
        setErrors({ asset_id: err.response.data.message });
      }
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    const prevAssignments = assignments; const prevTotal = totalData;
    try {
      setDeleting(true);
      const updated = assignments.filter((item) => item.id !== deleteTarget.id);
      setAssignments(updated); setTotalData((t) => t - 1);
      const newPage = updated.length === 0 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
      await api.delete(`/asset-assignments/${deleteTarget.id}`);
      setDeleteTarget(null);
      setToast("Data peminjaman berhasil dihapus");
    } catch (err: any) {
      setAssignments(prevAssignments); setTotalData(prevTotal);
      setToast(err?.response?.data?.message || "Gagal menghapus data peminjaman");
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
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
            onClick={() => setShowExportConfirm(true)} disabled={exporting}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 h-10 px-4 rounded-full text-sm font-medium shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50 w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Mengekspor..." : "Export"}
          </button>

          <button onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 transition text-white h-10 px-4 rounded-full text-sm font-medium shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto">
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
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[4%]">No</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[22%]">Aset</th>
                <th 
                  onClick={() => handleSort("user_name")} 
                  className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[15%] cursor-pointer hover:bg-gray-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    Dipinjam Oleh
                    {sortBy === "user_name" && (
                      sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("phone")} 
                  className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[10%] cursor-pointer hover:bg-gray-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    No. WA
                    {sortBy === "phone" && (
                      sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("assign_date")} 
                  className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[9%] cursor-pointer hover:bg-gray-100 transition select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    Tgl Pinjam
                    {sortBy === "assign_date" && (
                      sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("return_date")} 
                  className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[9%] cursor-pointer hover:bg-gray-100 transition select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    Tgl Kembali
                    {sortBy === "return_date" && (
                      sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                    )}
                  </div>
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[10%]">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[10%]">Catatan</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap w-[11%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <TableSkeleton columns={9} rows={rowsPerPage} />
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <EmptyState
                      variant="table"
                      title={search ? "Tidak ada data yang cocok" : "Data peminjaman belum tersedia"}
                      description={search ? "Coba ubah kata kunci pencarian Anda." : "Data peminjaman akan tampil di sini."}
                      icon={<UserCheck className="w-8 h-8 text-slate-400" />}
                    />
                  </td>
                </tr>
              ) : (
                assignments.map((item, idx) => (
                  <tr key={item.id} className={`hover:bg-blue-50/20 transition ${!isActive(item) ? "opacity-60" : ""}`}>
                    <td className="px-5 py-4 text-gray-400 text-xs align-middle">{startIndex + idx + 1}</td>
                    <td className="px-5 py-4 align-middle">
                      {item.asset ? (
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm leading-tight truncate">{item.asset.asset_name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{item.asset.asset_code}</p>
                        </div>
                      ) : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold uppercase shrink-0">
                          {(item.user_name || "?").charAt(0)}
                        </div>
                        <span className="text-gray-700 text-sm truncate min-w-0">{item.user_name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle">
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
                    <td className="px-5 py-4 text-gray-600 text-xs whitespace-nowrap text-center align-middle">{formatDate(item.assign_date)}</td>
                    <td className="px-5 py-4 text-gray-600 text-xs whitespace-nowrap text-center align-middle">{formatDate(item.return_date)}</td>
                    <td className="px-5 py-4 text-center align-middle">
                      <span className={`inline-flex items-center justify-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap w-24 ${
                        isActive(item) ? "text-blue-700 bg-blue-50" : "text-gray-500 bg-gray-100"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive(item) ? "bg-blue-500" : "bg-gray-400"}`} />
                        {isActive(item) ? "Dipinjam" : "Dikembalikan"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs align-middle">
                      <p className="line-clamp-2 leading-relaxed">{item.note || "-"}</p>
                    </td>
                    <td className="px-5 py-4 align-middle">
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
                disabled={saving}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
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
                    <div className={`relative ${showAssetDropdown ? "z-30" : "z-10"}`} ref={assetDropdownRef}>
                      <button
                        ref={assetSelectRef}
                        type="button"
                        disabled={saving || loadingAssets}
                        onClick={() => {
                          setShowAssetDropdown(!showAssetDropdown);
                          setAssetSearch("");
                        }}
                        className={`w-full h-12 border rounded-lg px-3 text-sm bg-white text-left flex items-center justify-between transition-all focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 ${errors.asset_id ? "border-red-400" : "border-gray-200"} disabled:bg-gray-50 disabled:cursor-wait`}
                      >
                        <span className={form.asset_id || loadingAssets ? "text-slate-800 font-semibold" : "text-gray-400"}>
                          {loadingAssets
                            ? "Memuat data..."
                            : form.asset_id
                            ? (() => {
                                const selected = assets.find((a) => String(a.id) === String(form.asset_id));
                                return selected ? `${selected.asset_code} — ${selected.asset_name}` : "-- Pilih Aset --";
                              })()
                            : "-- Pilih Aset --"}
                        </span>
                        {showAssetDropdown ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {showAssetDropdown && (
                        <div className="absolute left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50 flex flex-col divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-100">
                          {/* Search Input inside dropdown */}
                          <div className="p-2.5 bg-slate-50 sticky top-0 z-10">
                            <input
                              type="text"
                              className="w-full h-9 border border-gray-200 rounded-lg px-3 text-xs focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15"
                              placeholder="Cari kode aset atau nama..."
                              value={assetSearch}
                              onChange={(e) => setAssetSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div className="flex flex-col max-h-60 overflow-y-auto divide-y divide-gray-100 no-scrollbar">
                            {filteredAssetOptions.length === 0 ? (
                              <div className="px-4 py-3 text-xs text-gray-400 text-center">
                                Aset tidak ditemukan
                              </div>
                            ) : (
                              filteredAssetOptions.map((a) => {
                                const isBorrowed = a.status === "borrowed";
                                const isCurrentAsset = editTarget && String(editTarget.asset_id) === String(a.id);
                                const disabled = isBorrowed && !isCurrentAsset;
                                return (
                                  <button
                                    key={a.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                      setForm({ ...form, asset_id: String(a.id) });
                                      setShowAssetDropdown(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-xs transition flex justify-between items-center ${
                                      disabled
                                        ? "bg-gray-50/50 text-gray-400 cursor-not-allowed"
                                        : String(form.asset_id) === String(a.id)
                                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70"
                                        : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <span className={`font-semibold ${disabled ? "text-gray-400" : String(form.asset_id) === String(a.id) ? "text-emerald-800" : "text-slate-800"}`}>
                                        {a.asset_code}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-semibold">{a.asset_name}</span>
                                    </div>
                                    {disabled && (
                                      <span className="text-[9px] font-bold px-2 py-0.5 bg-red-50 text-red-500 rounded-full border border-red-100">
                                        Sedang Dipinjam
                                      </span>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.asset_id && <p className="text-red-500 text-xs mt-1">{errors.asset_id}</p>}
                  </div>

                  {/* Field: Nama Peminjam */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Peminjam <span className="text-red-500">*</span></label>
                    <div className={`relative ${showDropdown ? "z-30" : "z-10"}`} ref={dropdownRef}>
                      <input type="text"
                        className={`w-full h-12 border rounded-lg px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 ${errors.user_name ? "border-red-400" : "border-gray-200"} disabled:bg-gray-50 disabled:cursor-not-allowed`}
                        placeholder={loadingKaryawan ? "Memuat data karyawan..." : "Ketik nama karyawan..."}
                        value={karyawanInput} disabled={saving || loadingKaryawan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setKaryawanInput(val);
                          setForm((f) => ({ ...f, user_name: val, phone: val === "" ? "" : f.phone }));
                        }}
                        onFocus={() => { if (karyawanDropdown.length > 0) setShowDropdown(true); }}
                      />
                      {showDropdown && karyawanDropdown.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50 flex flex-col divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-100">
                          {karyawanDropdown.map((k) => (
                            <button
                              key={k.username}
                              type="button"
                              onClick={() => selectKaryawan(k)}
                              className="w-full text-left px-4 py-3 text-xs transition hover:bg-slate-50 flex flex-col gap-0.5 text-slate-700"
                            >
                              <span className="font-semibold text-slate-800">{k.name}</span>
                              <span className="text-[10px] text-gray-400 font-semibold">{k.departemen} • {k.pos}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.user_name && <p className="text-red-500 text-xs mt-1">{errors.user_name}</p>}
                  </div>

                  {/* Field: No. WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">No. WhatsApp <span className="text-red-500">*</span></label>
                    <input type="tel"
                      disabled={saving}
                      className={`w-full h-12 border rounded-lg px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 ${errors.phone ? "border-red-400" : "border-[#dbe2ea]"} disabled:bg-gray-50 disabled:cursor-not-allowed`}
                      placeholder="628123456789" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    <p className="text-xs text-gray-400 mt-1">Format: 628xxx (tanpa + atau spasi)</p>
                  </div>

                  {/* Field: Tgl Pinjam */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tgl Pinjam <span className="text-red-500">*</span></label>
                    <DatePicker
                      value={form.assign_date}
                      onChange={(val) => setForm({ ...form, assign_date: val })}
                      placeholder="Pilih Tanggal Pinjam..."
                      error={!!errors.assign_date}
                    />
                    {errors.assign_date && <p className="text-red-500 text-xs mt-1">{errors.assign_date}</p>}
                  </div>

                  {/* Field: Tgl Kembali */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tgl Kembali <span className="text-gray-400 font-normal">(opsional)</span></label>
                    <DatePicker
                      value={form.return_date || ""}
                      onChange={(val) => setForm({ ...form, return_date: val })}
                      placeholder="Pilih Tanggal Kembali..."
                    />
                  </div>

                  {/* Field: Catatan */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catatan <span className="text-gray-400 font-normal">(opsional)</span></label>
                    <textarea
                      disabled={saving}
                      className="w-full min-h-[100px] border border-[#dbe2ea] rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 resize-y disabled:bg-gray-50 disabled:cursor-not-allowed"
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
                disabled={saving}
                className="h-10 px-6 text-sm font-semibold text-white bg-red-500 hover:bg-red-650 rounded-full transition shadow-sm disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-10 px-6 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !deleting) setDeleteTarget(null); }}
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
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >Batal</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-11 text-sm font-medium text-white bg-red-650 hover:bg-red-700 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <ExportConfirmationModal
        isOpen={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        onConfirm={handleExport}
      />
    </div>
  );
} 
