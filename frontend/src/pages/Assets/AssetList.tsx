import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { Search, Filter, X, Trash2, Download } from "lucide-react";
import AssetModal from "../../components/AssetModal";

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
  disposed: "text-gray-500 bg-gray-100",
};

export default function AssetList() {
  const navigate = useNavigate();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({ category: "", condition: "", status: "" });
  const filterRef = useRef<HTMLDivElement>(null);

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [refetchFlag, setRefetchFlag] = useState(0);

  const categoriesFetched = useRef(false);
  useEffect(() => {
    if (categoriesFetched.current) return;
    categoriesFetched.current = true;
    api.get("/categories?per_page=100").then((res) => {
      const data = res?.data?.data?.data || res?.data?.data || res?.data || [];
      setCategories(Array.isArray(data) ? data : []);
    }).catch(() => {});
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
    let cancelled = false;

    const fetchAssets = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(rowsPerPage),
        });
        if (search) params.append("search", search);
        if (filters.category) params.append("category_id", filters.category);
        if (filters.condition) params.append("condition_status", filters.condition);
        if (filters.status) params.append("status", filters.status);

        const res = await api.get(`/assets?${params}`);
        if (cancelled) return;

        const payload = res?.data?.data;
        if (payload?.data) {
          setAssets(payload.data);
          setTotalData(payload.total);
          setTotalPages(payload.last_page);
        } else {
          const data = Array.isArray(payload) ? payload : [];
          setAssets(data);
          setTotalData(data.length);
          setTotalPages(1);
        }
      } catch (err) {
        if (!cancelled) console.error("ERROR fetch assets:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAssets();
    return () => { cancelled = true; };
  }, [currentPage, rowsPerPage, search, filters, refetchFlag]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const activeFilterCount = [filters.category, filters.condition, filters.status].filter(Boolean).length;

  const resetFilters = () => {
    setFilters({ category: "", condition: "", status: "" });
    setCurrentPage(1);
    setFilterOpen(false);
  };

  const openCreate = () => { setEditAsset(null); setModalOpen(true); };
  const openEdit = (a: Asset) => { setEditAsset(a); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditAsset(null); };

  const handleSuccess = useCallback((updatedAsset?: Asset) => {
    if (updatedAsset) {
      setAssets((prev) =>
        prev.map((item) =>
          item.id === updatedAsset.id ? { ...item, ...updatedAsset } : item
        )
      );
    } else {
      setCurrentPage(1);
      setSearch("");
      setSearchInput("");
      setRefetchFlag((f) => f + 1);
    }
    setModalOpen(false); // ← langsung set state, tidak panggil closeModal
    setEditAsset(null);
  }, []); // ← dependency array kosong, stabil

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filters.category) params.append("category_id", filters.category);
      if (filters.condition) params.append("condition_status", filters.condition);
      if (filters.status) params.append("status", filters.status);

      const res = await api.get(`/assets/export?${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `data-aset-${Date.now()}.xlsx`);
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

      {/* SEARCH + ACTION */}
      <div className="flex justify-end items-center gap-3 mb-5">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Cari asset..."
            className="w-full pl-9 pr-9 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => { setSearchInput(""); setSearch(""); setCurrentPage(1); }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`relative w-10 h-10 flex items-center justify-center rounded-full shadow transition ${
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
            <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Filter Aset</p>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Reset semua
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={filters.category}
                  onChange={(e) => { setFilters((f) => ({ ...f, category: e.target.value })); setCurrentPage(1); }}
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kondisi</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={filters.condition}
                  onChange={(e) => { setFilters((f) => ({ ...f, condition: e.target.value })); setCurrentPage(1); }}
                >
                  <option value="">Semua Kondisi</option>
                  <option value="good">Good</option>
                  <option value="damaged">Damaged</option>
                  <option value="under_maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={filters.status}
                  onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setCurrentPage(1); }}
                >
                  <option value="">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="borrowed">Dipinjam</option>
                  <option value="disposed">Disposed</option>
                </select>
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Terapkan
              </button>
            </div>
          )}
        </div>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? "..." : "Export"}
        </button>

        {/* Tambah */}
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-2.5 rounded-full text-sm font-medium shadow flex items-center gap-2"
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
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-gray-200 rounded-md px-2 py-1 text-gray-700 text-sm focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-gray-400 text-sm">
            {totalData === 0 ? "0" : `${startIndex + 1}–${Math.min(startIndex + rowsPerPage, totalData)} of ${totalData}`}
          </span>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
          >‹</button>
          <button
            disabled={currentPage === totalPages || totalData === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
          >›</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12">NO</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kode</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nama Asset</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kategori</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kondisi</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[200px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-400">Loading...</td></tr>
            ) : assets.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-300">
                {search || activeFilterCount > 0 ? "Tidak ada aset yang cocok" : "Data asset belum tersedia"}
              </td></tr>
            ) : (
              assets.map((a, idx) => (
                <tr
                  key={a.id}
                  className="hover:bg-blue-50/30 transition cursor-pointer"
                  onClick={() => navigate(`/assets/${a.id}`)}
                >
                  <td className="px-5 py-4 text-gray-400 text-xs">{startIndex + idx + 1}</td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-700">{a.asset_code || "-"}</td>
                  <td className="px-5 py-4 font-medium text-gray-800">{a.asset_name || "-"}</td>
                  <td className="px-5 py-4">
                    {a.category?.name
                      ? <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">{a.category.name}</span>
                      : "-"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${conditionColor[a.condition_status || ""] || "text-gray-500 bg-gray-100"}`}>
                      {conditionLabel[a.condition_status || ""] || a.condition_status || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[a.status || ""] || "text-gray-500 bg-gray-100"}`}>
                      {statusLabel[a.status || ""] || a.status || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate(`/assets/${a.id}`)}
                        className="text-blue-600 text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition"
                      >Detail</button>
                      <button
                        onClick={() => openEdit(a)}
                        className="text-yellow-600 text-xs bg-yellow-50 hover:bg-yellow-100 px-3 py-1 rounded-full transition"
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

      <AssetModal
        open={modalOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
        editAsset={editAsset}
        categories={categories}
      />

      {/* MODAL DELETE */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Hapus Aset?</h3>
              <p className="text-sm text-gray-500">
                Aset <span className="font-medium text-gray-700">"{deleteTarget.asset_name}"</span> akan dihapus.
              </p>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >Batal</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
