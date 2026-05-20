import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { Search, Filter, X } from "lucide-react";
import AssetModal from "../../components/AssetModal";

interface Category { id: number; name: string; }
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
  category?: Category;
  assigned_user?: { id: number; name: string };
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

  // search dengan debounce
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // filter
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  // pagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  // ── Debounce search ──────────────────────────────────────────────────────
  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 400);
  };

  // ── Close filter on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch categories sekali untuk dropdown filter ─────────────────────
  useEffect(() => {
    api.get("/categories?per_page=all").then((res) => {
      const data = res?.data?.data?.data || res?.data?.data || res?.data || [];
      setCategories(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  // ── SINGLE FETCH EFFECT — dipanggil saat page/rowsPerPage/search/filter berubah ──
  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(rowsPerPage),
        });
        if (search) params.append("search", search);
        if (filterCategory) params.append("category_id", filterCategory);
        if (filterCondition) params.append("condition_status", filterCondition);
        if (filterStatus) params.append("status", filterStatus);

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

    fetch();
    return () => { cancelled = true; };
  }, [currentPage, rowsPerPage, search, filterCategory, filterCondition, filterStatus]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const activeFilterCount = [filterCategory, filterCondition, filterStatus].filter(Boolean).length;

  const resetFilters = () => {
    setFilterCategory("");
    setFilterCondition("");
    setFilterStatus("");
    setCurrentPage(1);
    setFilterOpen(false);
  };

  const openCreate = () => { setEditAsset(null); setModalOpen(true); };
  const openEdit = (a: Asset) => { setEditAsset(a); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditAsset(null); };

  const handleSuccess = () => {
    setCurrentPage(1);
    setSearch("");
    setSearchInput("");
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
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => { setSearchInput(""); setSearch(""); setCurrentPage(1); }}>
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
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}>
                  <option value="">Semua Kategori</option>
                  {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kondisi</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={filterCondition} onChange={(e) => { setFilterCondition(e.target.value); setCurrentPage(1); }}>
                  <option value="">Semua Kondisi</option>
                  <option value="good">Good</option>
                  <option value="damaged">Damaged</option>
                  <option value="under_maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
                  <option value="">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="borrowed">Dipinjam</option>
                  <option value="disposed">Disposed</option>
                </select>
              </div>
              <button onClick={() => setFilterOpen(false)}
                className="w-full py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                Terapkan
              </button>
            </div>
          )}
        </div>

        <button onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-2.5 rounded-full text-sm font-medium shadow flex items-center gap-2">
          + Tambah
        </button>
      </div>

      {/* ACTIVE FILTER CHIPS */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-400">Filter aktif:</span>
          {filterCategory && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
              {categories.find((c) => String(c.id) === filterCategory)?.name}
              <button onClick={() => { setFilterCategory(""); setCurrentPage(1); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterCondition && (
            <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full flex items-center gap-1">
              {conditionLabel[filterCondition]}
              <button onClick={() => { setFilterCondition(""); setCurrentPage(1); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterStatus && (
            <span className="text-xs bg-teal-50 text-teal-600 px-2 py-1 rounded-full flex items-center gap-1">
              {statusLabel[filterStatus]}
              <button onClick={() => { setFilterStatus(""); setCurrentPage(1); }}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* ROW CONTROL */}
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="border border-gray-200 rounded-md px-2 py-1 text-gray-700 text-sm focus:outline-none">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div>Page {currentPage} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">
            {totalData === 0 ? "0" : `${startIndex + 1}–${Math.min(startIndex + rowsPerPage, totalData)} of ${totalData}`}
          </span>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40">‹</button>
          <button disabled={currentPage === totalPages || totalData === 0} onClick={() => setCurrentPage((p) => p + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40">›</button>
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
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aksi</th>
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
                <tr key={a.id} className="hover:bg-blue-50/30 transition cursor-pointer"
                  onClick={() => navigate(`/assets/${a.id}`)}>
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
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/assets/${a.id}`)}
                        className="text-blue-600 text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition">Detail</button>
                      <button onClick={() => openEdit(a)}
                        className="text-yellow-600 text-xs bg-yellow-50 hover:bg-yellow-100 px-3 py-1 rounded-full transition">Edit</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AssetModal open={modalOpen} onClose={closeModal} onSuccess={handleSuccess} editAsset={editAsset} />
    </div>
  );
}