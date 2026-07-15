import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import api from "../../api/axios";
import axios from "axios";
import { Search, Filter, X, Trash2, Download, ChevronUp, ChevronDown, Package } from "lucide-react";
import AssetModal from "../../components/AssetModal";
import TablePagination from "../../components/pagination/TablePagination";
import { usePolling } from "@/hooks/usePolling";
import { useRowsPerPage } from "../../hooks/useRowsPerPage";
import { isListEqual } from "../../utils/equality";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import ExportConfirmationModal from "../../components/ExportConfirmationModal";
import { SearchableSelect } from "../../components/ui/searchable-select";

interface Category { id: number; name: string; code: string; }
interface Asset {
  id: number;
  asset_name?: string;
  asset_code?: string;
  brand?: string;
  serial_number?: string;
  vendor?: string;
  model?: string;
  purchase_date?: string;
  purchase_price?: number;
  warranty_expired?: string;
  condition_status?: string;
  status?: string;
  note?: string;
  category_id?: number;
  category?: { id: number; name: string };
  assigned_user?: { id: number; name: string };
  deleted_at?: string | null;
  current_holder?: string | null;
}

interface Filters {
  category: string;
  condition: string;
  status: string;
}

const conditionLabel: Record<string, string> = { good: "Good", damaged: "Damaged", under_maintenance: "Maintenance" };
const conditionColor: Record<string, string> = {
  good: "text-green-600 bg-green-50",
  damaged: "text-red-600 bg-red-50",
  under_maintenance: "text-yellow-600 bg-yellow-50",
};
const statusLabel: Record<string, string> = { active: "Aktif", borrowed: "Dipinjam", disposed: "Disposed" };
const statusColor: Record<string, string> = {
  active: "text-teal-700 bg-teal-50",
  borrowed: "text-blue-600 bg-blue-50",
  disposed: "text-gray-550 bg-gray-100",
};

export default function AssetList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  const initialSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    category: searchParams.get("category") || "",
    condition: searchParams.get("condition") || "",
    status: searchParams.get("status") || ""
  });
  const filterRef = useRef<HTMLDivElement>(null);

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
    if (filters.category) params.category = filters.category;
    if (filters.condition) params.condition = filters.condition;
    if (filters.status) params.status = filters.status;
    if (sortBy && sortBy !== "created_at") params.sort = sortBy;
    if (sortOrder && sortOrder !== "desc") params.order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [currentPage, search, filters, rowsPerPage, sortBy, sortOrder, setSearchParams]);

  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [refetchFlag, setRefetchFlag] = useState(0);
  const [toast, setToast] = useState("");

  const isSilentRef = useRef(false);
  const isFetchingRef = useRef(false);

  const triggerSilentRefresh = () => {
    isSilentRef.current = true;
    setRefetchFlag((f) => f + 1);
  };

  usePolling(triggerSilentRefresh, 60000, !modalOpen && !deleteTarget);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const categoriesFetched = useRef(false);
  useEffect(() => {
    if (categoriesFetched.current) return;
    categoriesFetched.current = true;
    setLoadingCategories(true);
    api.get("/categories?mode=options&limit=100").then((res) => {
      const data = res?.data?.data?.data || res?.data?.data || res?.data || [];
      setCategories(Array.isArray(data) ? data : []);
    }).catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, []);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 400);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAssets = async () => {
      if (isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        if (!isSilentRef.current) {
          setLoading(true);
        }
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(rowsPerPage),
          simple: "1",
        });
        if (search) params.append("search", search);
        if (filters.category) params.append("category_id", filters.category);
        if (filters.condition) params.append("condition_status", filters.condition);
        if (filters.status) params.append("status", filters.status);
        if (sortBy) params.append("sort_by", sortBy);
        if (sortOrder) params.append("sort_order", sortOrder);

        const res = await api.get(`/assets?${params}`, {
          signal: controller.signal
        });

        const payload = res?.data?.data;
        if (payload?.data) {
          if (isSilentRef.current && isListEqual(assets, payload.data, ['id', 'updated_at', 'status', 'condition_status'])) {
            isSilentRef.current = false;
            return;
          }
          setAssets(payload.data);
          const fallbackTotal = currentPage * rowsPerPage + (payload.next_page_url ? rowsPerPage : 0);
          setTotalData(payload.total ?? fallbackTotal);
          setTotalPages(payload.last_page ?? (payload.next_page_url ? currentPage + 1 : currentPage));
        } else {
          const data = Array.isArray(payload) ? payload : [];
          if (isSilentRef.current && isListEqual(assets, data, ['id', 'updated_at', 'status', 'condition_status'])) {
            isSilentRef.current = false;
            return;
          }
          setAssets(data);
          setTotalData(data.length);
          setTotalPages(1);
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("ERROR fetch assets:", err);
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

    fetchAssets();
    return () => {
      controller.abort();
      isFetchingRef.current = false;
    };
  }, [currentPage, rowsPerPage, search, filters, sortBy, sortOrder, refetchFlag]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const activeFilterCount = [filters.category, filters.condition, filters.status].filter(Boolean).length;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({ category: "", condition: "", status: "" });
    setCurrentPage(1);
    setFilterOpen(false);
  };

  const openCreate = () => { setEditAsset(null); setModalOpen(true); };
  const openEdit = (a: Asset) => { setEditAsset(a); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditAsset(null); };

  const handleSuccess = useCallback((updatedAsset?: Asset) => {
    setRefetchFlag((f) => f + 1);
    if (updatedAsset) {
      setToast("Aset berhasil diperbarui");
    } else {
      setCurrentPage(1);
      setSearch("");
      setSearchInput("");
      setToast("Aset berhasil ditambahkan");
    }
    setModalOpen(false);
    setEditAsset(null);
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filters.category) params.append("category_id", filters.category);
      if (filters.condition) params.append("condition_status", filters.condition);
      if (filters.status) params.append("status", filters.status);
      if (sortBy) params.append("sort_by", sortBy);
      if (sortOrder) params.append("sort_order", sortOrder);

      const res = await api.get(`/assets/export?${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `data-aset-${Date.now()}.xlsx`);
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

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const prevAssets = assets;
    const prevTotal = totalData;

    try {
      setDeleting(true);

      const updatedAssets = assets.filter((item) => item.id !== deleteTarget.id);
      setAssets(updatedAssets);
      setTotalData((t) => t - 1);

      const newPage = updatedAssets.length === 0 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);

      await api.delete(`/assets/${deleteTarget.id}`);
      setDeleteTarget(null);
      setToast("Aset berhasil dihapus");

    } catch (err) {
      console.error("ERROR delete asset:", err);
      setAssets(prevAssets);
      setTotalData(prevTotal);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SEARCH + ACTION */}
      <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 mb-5">
        <div className="relative w-full sm:w-80 md:w-96" ref={filterRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Cari asset..."
            className="w-full h-10 pl-9 pr-20 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm"
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
            <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Filter Aset</p>
                {activeFilterCount > 0 && (
                  <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeFilterCount} Aktif
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                <SearchableSelect
                  disabled={loadingCategories}
                  value={filters.category || "all"}
                  onChange={(val) => { setFilters((f) => ({ ...f, category: val === "all" ? "" : val })); setCurrentPage(1); }}
                  placeholder={loadingCategories ? "Memuat..." : "Semua Kategori"}
                  searchPlaceholder="Cari kategori..."
                  options={[
                    { value: "all", label: loadingCategories ? "Memuat..." : "Semua Kategori" },
                    ...categories.map((c) => ({ value: String(c.id), label: c.name }))
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kondisi</label>
                <SearchableSelect
                  value={filters.condition || "all"}
                  onChange={(val) => { setFilters((f) => ({ ...f, condition: val === "all" ? "" : val })); setCurrentPage(1); }}
                  placeholder="Semua Kondisi"
                  searchPlaceholder="Cari kondisi..."
                  options={[
                    { value: "all", label: "Semua Kondisi" },
                    { value: "good", label: "Good" },
                    { value: "damaged", label: "Damaged" },
                    { value: "under_maintenance", label: "Maintenance" }
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <SearchableSelect
                  value={filters.status || "all"}
                  onChange={(val) => { setFilters((f) => ({ ...f, status: val === "all" ? "" : val })); setCurrentPage(1); }}
                  placeholder="Semua Status"
                  searchPlaceholder="Cari status..."
                  options={[
                    { value: "all", label: "Semua Status" },
                    { value: "active", label: "Aktif" },
                    { value: "borrowed", label: "Dipinjam" },
                    { value: "disposed", label: "Disposed" }
                  ]}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex-1 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="flex-1 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Terapkan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export */}
        <button
          onClick={() => setShowExportConfirm(true)}
          disabled={exporting}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 h-10 px-4 rounded-full text-sm font-medium shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50 w-full sm:w-auto"
        >
          <Download className="w-4 h-4" />
          {exporting ? "Mengekspor..." : "Export"}
        </button>

        {/* Tambah */}
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 transition text-white h-10 px-4 rounded-full text-sm font-medium shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          + Tambah
        </button>
      </div>

      {/* ACTIVE FILTER CHIPS */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-400">Filter aktif:</span>
          {filters.category && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
              {categories.find((c) => String(c.id) === filters.category)?.name}
              <button onClick={() => { setFilters((f) => ({ ...f, category: "" })); setCurrentPage(1); }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.condition && (
            <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full flex items-center gap-1">
              {conditionLabel[filters.condition]}
              <button onClick={() => { setFilters((f) => ({ ...f, condition: "" })); setCurrentPage(1); }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="text-xs bg-teal-50 text-teal-600 px-2 py-1 rounded-full flex items-center gap-1">
              {statusLabel[filters.status]}
              <button onClick={() => { setFilters((f) => ({ ...f, status: "" })); setCurrentPage(1); }}>
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
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12 whitespace-nowrap">NO</th>
              <th 
                onClick={() => handleSort("asset_code")} 
                className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-36 whitespace-nowrap cursor-pointer hover:bg-gray-100 transition select-none"
              >
                <div className="flex items-center gap-1">
                  Kode
                  {sortBy === "asset_code" && (
                    sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort("asset_name")} 
                className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase min-w-[180px] cursor-pointer hover:bg-gray-100 transition select-none"
              >
                <div className="flex items-center gap-1">
                  Nama Asset
                  {sortBy === "asset_name" && (
                    sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                  )}
                </div>
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-40 whitespace-nowrap">Kategori</th>
              <th 
                onClick={() => handleSort("condition_status")} 
                className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-40 whitespace-nowrap cursor-pointer hover:bg-gray-100 transition select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  Kondisi
                  {sortBy === "condition_status" && (
                    sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort("status")} 
                className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-40 whitespace-nowrap cursor-pointer hover:bg-gray-100 transition select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  Status
                  {sortBy === "status" && (
                    sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                  )}
                </div>
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-48 whitespace-nowrap">Current Holder</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-52 whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <TableSkeleton columns={8} rows={rowsPerPage} />
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-0">
                  <EmptyState
                    variant="table"
                    title={search || activeFilterCount > 0 ? "Tidak ada aset yang cocok" : "Data asset belum tersedia"}
                    description={search || activeFilterCount > 0 ? "Coba ubah kata kunci pencarian atau filter Anda." : "Aset akan muncul di sini setelah ditambahkan."}
                    icon={<Package className="w-8 h-8 text-slate-400" />}
                  />
                </td>
              </tr>
            ) : (
              assets.map((a, idx) => (
                <tr
                  key={a.id}
                  className="hover:bg-brand-50/15 transition cursor-pointer"
                  onClick={() => navigate(`/assets/${a.id}${location.search}`)}
                >
                  <td className="px-5 py-4 text-gray-400 text-xs">{startIndex + idx + 1}</td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-700">{a.asset_code || "-"}</td>
                  <td className="px-5 py-4 font-medium text-gray-800">{a.asset_name || "-"}</td>
                  <td className="px-5 py-4 text-center">
                    {a.category?.name
                      ? <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase inline-flex items-center justify-center w-28 text-center">{a.category.name}</span>
                      : "-"}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full inline-flex items-center justify-center w-28 text-center ${conditionColor[a.condition_status || ""] || "text-gray-500 bg-gray-100"}`}>
                      {conditionLabel[a.condition_status || ""] || a.condition_status || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center justify-center w-28 text-center ${statusColor[a.status || ""] || "text-gray-500 bg-gray-100"}`}>
                      {statusLabel[a.status || ""] || a.status || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-left text-gray-700 font-medium whitespace-nowrap">
                    {a.current_holder || "-"}
                  </td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate(`/assets/${a.id}${location.search}`)}
                        className="text-blue-600 text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition"
                      >Detail</button>
                      <button
                        onClick={() => openEdit(a)}
                        className="text-purple-600 text-xs bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-full transition"
                      >Edit</button>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="text-red-500 text-xs bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full flex items-center gap-1 transition"
                      >
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

      <AssetModal
        open={modalOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
        editAsset={editAsset}
        categories={categories}
        loadingCategories={loadingCategories}
      />

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
              <h3 className="font-semibold text-gray-800 text-base mb-1">Hapus Aset?</h3>
              <p className="text-sm text-gray-500">
                Aset <span className="font-medium text-gray-700">"{deleteTarget.asset_name}"</span> akan dihapus permanen.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
              >Batal</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-11 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
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
