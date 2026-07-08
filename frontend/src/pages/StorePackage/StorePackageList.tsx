import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import api from "../../api/axios";
import axios from "axios";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  Store,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import TablePagination from "../../components/pagination/TablePagination";
import { useRowsPerPage } from "../../hooks/useRowsPerPage";
import StorePackageModal, { clearStorePackageDropdownCache } from "./StorePackageModal";
import { usePolling } from "../../hooks/usePolling";
import { isListEqual } from "../../utils/equality";

interface StorePackageItem {
  store_code: string;
  store_name: string;
  total_assets: number;
}

export default function StorePackageList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Data states
  const [storePackages, setStorePackages] = useState<StorePackageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Pagination states
  const initialSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(searchParams.get("page") || "1", 10);
  });

  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "store_code");
  const [sortOrder, setSortOrder] = useState(() => searchParams.get("order") || "asc");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 400);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Modal trigger states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTargetCode, setEditTargetCode] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  // Delete modal states
  const [deleteTarget, setDeleteTarget] = useState<StorePackageItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isFetchingRef = useRef(false);
  const isSilentRef = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerSilentRefresh = () => {
    isSilentRef.current = true;
    setRefreshKey((k) => k + 1);
  };

  usePolling(triggerSilentRefresh, 60000, !modalOpen && !deleteTarget);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => {
      controller.abort();
      isFetchingRef.current = false;
    };
  }, [currentPage, rowsPerPage, search, sortBy, sortOrder, refreshKey]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const params: Record<string, string> = {};
    if (currentPage > 1) params.page = String(currentPage);
    if (search) params.search = search;
    if (sortBy && sortBy !== "store_code") params.sort = sortBy;
    if (sortOrder && sortOrder !== "asc") params.order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [currentPage, search, rowsPerPage, sortBy, sortOrder, setSearchParams]);

  const fetchData = async (signal?: AbortSignal) => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      if (!isSilentRef.current) {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(rowsPerPage),
        sort: sortBy,
        order: sortOrder,
      });
      if (search) params.append("search", search);

      const res = await api.get(`/store-packages?${params}`, { signal });
      if (res.data?.success) {
        const payload = res.data.data;
        if (payload?.data) {
          if (isSilentRef.current && isListEqual(storePackages, payload.data, ['store_code', 'total_assets'])) {
            isSilentRef.current = false;
            return;
          }
          setStorePackages(payload.data || []);
          setTotalData(payload.total ?? 0);
          setTotalPages(payload.last_page ?? 1);
        } else {
          const dataArray = Array.isArray(payload) ? payload : [];
          if (isSilentRef.current && isListEqual(storePackages, dataArray, ['store_code', 'total_assets'])) {
            isSilentRef.current = false;
            return;
          }
          setStorePackages(dataArray);
          setTotalData(dataArray.length);
          setTotalPages(1);
        }
      }
    } catch (err: any) {
      if (!axios.isCancel(err)) {
        console.error("Gagal memuat data:", err);
        showToast("Gagal memuat data dari server.");
      }
    } finally {
      isFetchingRef.current = false;
      if (!signal?.aborted) {
        setLoading(false);
        isSilentRef.current = false;
      }
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const paginatedPackages = storePackages;

  const openCreate = () => {
    setEditTargetCode(null);
    setModalOpen(true);
  };

  const openEdit = (item: StorePackageItem) => {
    setEditTargetCode(item.store_code);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/store-packages/${deleteTarget.store_code}`);
      showToast(`Store Package "${deleteTarget.store_name}" berhasil dibersihkan.`);
      setDeleteTarget(null);
      clearStorePackageDropdownCache();
      fetchData();
    } catch (err: any) {
      console.error("Gagal menghapus store package:", err);
      showToast("Gagal membersihkan Store Package.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col gap-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-55 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              placeholder="Cari kode store, nama store..."
              className="w-full h-10 pl-9 pr-9 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  handleSearchInput("");
                  setSearch("");
                  setCurrentPage(1);
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={openCreate}
          className="w-full sm:w-auto h-10 px-5 bg-teal-600 hover:bg-teal-700 transition text-white rounded-full text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Buat Store Package
        </button>
      </div>

      {/* PAGINATION */}
      {!loading && storePackages.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          totalData={totalData}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
          className="mb-0"
        />
      )}

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm flex-1">
        {loading ? (
          <div className="p-10 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse w-full" />
            ))}
          </div>
        ) : paginatedPackages.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
              <Store className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Tidak Ada Data Store Package</h3>
            <p className="text-xs text-slate-400 max-w-sm px-4">
              {search
                ? "Tidak ada hasil yang cocok dengan kriteria pencarian Anda."
                : "Saat ini belum ada Store Package yang terdaftar."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 text-center w-12 whitespace-nowrap">No</th>
                  <th 
                    onClick={() => handleSort("store_code")} 
                    className="px-5 py-3 text-left w-44 whitespace-nowrap cursor-pointer hover:bg-gray-100 transition select-none"
                  >
                    Store Code
                  </th>
                  <th 
                    onClick={() => handleSort("store_name")} 
                    className="px-5 py-3 text-left min-w-[200px] cursor-pointer hover:bg-gray-100 transition select-none"
                  >
                    Store Name
                  </th>
                  <th 
                    onClick={() => handleSort("total_assets")} 
                    className="px-5 py-3 text-center w-36 whitespace-nowrap cursor-pointer hover:bg-gray-100 transition select-none"
                  >
                    Total Assets
                  </th>
                  <th className="px-5 py-3 text-center w-36 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedPackages.map((item, index) => (
                  <tr
                    key={item.store_code}
                    className="hover:bg-brand-50/15 transition cursor-pointer"
                    onClick={() => navigate(`/store-packages/${item.store_code}${location.search}`)}
                  >
                    <td className="px-5 py-4 text-center text-slate-400 text-xs">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-700">
                      {item.store_code}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {item.store_name}
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-slate-700">
                      {item.total_assets} Asset
                    </td>
                    <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/store-packages/${item.store_code}${location.search}`)}
                          className="w-7 h-7 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full flex items-center justify-center transition"
                          title="Detail Store Package"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="w-7 h-7 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-full flex items-center justify-center transition"
                          title="Edit Mapping"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="w-7 h-7 bg-red-50 text-red-600 hover:bg-red-100 rounded-full flex items-center justify-center transition"
                          title="Bersihkan Mapping"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REFACTORED MODAL */}
      <StorePackageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editTargetCode={editTargetCode}
        onSuccess={(msg) => {
          setModalOpen(false);
          showToast(msg);
          fetchData();
        }}
      />

      {/* DELETE MAPPING CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-base">Bersihkan Store Package?</h3>
                <p className="text-xs text-slate-400">
                  Apakah Anda yakin ingin melepas semua asset dari Store{" "}
                  <span className="font-bold text-slate-700">"{deleteTarget.store_name}"</span>?
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl text-left mt-2">
                  <p className="font-bold">Catatan Penting:</p>
                  <ul className="list-disc list-inside mt-0.5 text-amber-700 space-y-0.5">
                    <li>Asset tidak akan dihapus dari sistem.</li>
                    <li>Store data di POS API tetap utuh.</li>
                    <li>Hanya record mapping relasi yang akan dibersihkan.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-9 px-4 rounded-full border border-gray-250 hover:bg-slate-100 transition text-xs font-bold text-slate-500"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white transition text-xs font-bold rounded-full shadow-sm flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, Bersihkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
