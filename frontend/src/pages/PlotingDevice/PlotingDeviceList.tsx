import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import api from "../../api/axios";
import { Search, Plus, Pencil, Trash2, X, Save, Eye, Smartphone, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import TablePagination from "../../components/pagination/TablePagination";
import { useRowsPerPage } from "../../hooks/useRowsPerPage";
import { usePolling } from "../../hooks/usePolling";

interface Asset {
  id: number;
  asset_name: string;
  asset_code: string;
  condition_status: "good" | "damaged" | "under_maintenance" | "retired";
  status: "active" | "borrowed" | "disposed";
  category?: { id: number; name: string; code?: string } | null;
  parent_package?: {
    asset_code: string;
    asset_name: string;
  } | null;
  store_package?: {
    store_code: string;
    store_name: string;
  } | null;
}

interface PlotingDevice {
  id: number;
  code: string; // Tas Asset Code
  name: string; // Tas Asset Name
  store_id?: number | null;
  store_name: string; // Store Name Snapshot
  status: "available" | "borrowed" | "maintenance" | "lost";
  assets_count: number;
  created_at: string;
}

interface PlotingDeviceForm {
  container_asset_id: number | "";
  asset_ids: number[];
  store_id: number | "";
}

const emptyForm: PlotingDeviceForm = {
  container_asset_id: "",
  asset_ids: [],
  store_id: "",
};

const statusLabel: Record<string, string> = {
  available: "Available",
  borrowed: "Borrowed",
  maintenance: "Maintenance",
  lost: "Lost",
};

const statusColor: Record<string, string> = {
  available: "text-emerald-700 bg-emerald-50 border border-emerald-250",
  borrowed: "text-blue-700 bg-blue-50 border border-blue-250",
  maintenance: "text-amber-700 bg-amber-50 border border-amber-250",
  lost: "text-rose-700 bg-rose-50 border border-rose-250",
};

const getConditionBadge = (cond: string) => {
  switch (cond) {
    case "good":
      return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Good</span>;
    case "under_maintenance":
      return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Maintenance</span>;
    case "damaged":
      return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Damaged</span>;
    case "retired":
      return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-50 text-slate-700 border border-slate-200">Retired</span>;
    default:
      return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-50 text-gray-700 border border-gray-200">{cond}</span>;
  }
};

export default function PlotingDeviceList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Data states
  const [plotingDevices, setPlotingDevices] = useState<PlotingDevice[]>([]);
  const [assetsPool, setAssetsPool] = useState<Asset[]>([]);
  const [storeOptions, setStoreOptions] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination states
  const initialSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "");
  const [storeFilter, setStoreFilter] = useState(() => searchParams.get("store_id") || "");
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
  const [currentPage, setCurrentPage] = useState(() => parseInt(searchParams.get("page") || "1", 10));
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "created_at");
  const [sortOrder, setSortOrder] = useState(() => searchParams.get("order") || "desc");

  useEffect(() => {
    const params: Record<string, string> = {};
    if (currentPage > 1) params.page = String(currentPage);
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (storeFilter) params.store_id = storeFilter;
    if (sortBy && sortBy !== "created_at") params.sort = sortBy;
    if (sortOrder && sortOrder !== "desc") params.order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [currentPage, search, statusFilter, storeFilter, rowsPerPage, sortBy, sortOrder, setSearchParams]);

  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlotingDevice | null>(null);
  const [form, setForm] = useState<PlotingDeviceForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [tasDropdownOpen, setTasDropdownOpen] = useState(false);
  const [tasSearchQuery, setTasSearchQuery] = useState("");
  const tasDropdownRef = useRef<HTMLDivElement>(null);

  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  // Filter dropdown states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showStoreFilterDropdown, setShowStoreFilterDropdown] = useState(false);
  const [storeFilterSearchQuery, setStoreFilterSearchQuery] = useState("");

  useEffect(() => {
    if (!modalOpen) {
      setAssetSearchQuery("");
      setTasSearchQuery("");
      setTasDropdownOpen(false);
      setStoreSearchQuery("");
      setStoreDropdownOpen(false);
    }
  }, [modalOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tasDropdownRef.current && !tasDropdownRef.current.contains(event.target as Node)) {
        setTasDropdownOpen(false);
      }
    }
    if (tasDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [tasDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target as Node)) {
        setStoreDropdownOpen(false);
      }
    }
    if (storeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [storeDropdownOpen]);

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<PlotingDevice | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isSilentRef = useRef(false);
  const isFetchingRef = useRef(false);

  const triggerRefresh = () => {
    isSilentRef.current = false;
    setRefreshKey((k) => k + 1);
  };

  const triggerSilentRefresh = () => {
    isSilentRef.current = true;
    setRefreshKey((k) => k + 1);
  };

  // Auto-refresh every 30s when modal/dialogs are closed
  usePolling(triggerSilentRefresh, 30000, !modalOpen && !deleteTarget);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Handle Search Input debouncing
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

  // Fetch Ploting Devices (Tas Assets)
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      if (isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        if (!isSilentRef.current) {
          setLoading(true);
        }
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(rowsPerPage),
        });
        if (search) params.append("search", search);
        if (statusFilter) params.append("status", statusFilter);
        if (storeFilter) params.append("store_id", storeFilter);
        if (sortBy) params.append("sort_by", sortBy);
        if (sortOrder) params.append("sort_order", sortOrder);

        const res = await api.get(`/ploting-devices?${params}`, { signal: controller.signal });

        const payload = res?.data?.data;
        if (payload?.data) {
          setPlotingDevices(payload.data);
          setTotalData(payload.total);
          setTotalPages(payload.last_page);
        }
      } catch (err: any) {
        if (err.name !== "CanceledError") {
          console.error("ERROR fetch ploting devices:", err);
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
  }, [currentPage, rowsPerPage, search, statusFilter, storeFilter, sortBy, sortOrder, refreshKey]);

  // Fetch Store Options for Selector
  useEffect(() => {
    let active = true;
    api.get("/stores/options")
      .then((res) => {
        if (!active) return;
        setStoreOptions(res?.data?.data || []);
      })
      .catch((err) => console.error("ERROR fetch store options:", err));
    return () => { active = false; };
  }, [refreshKey]);

  // Fetch Assets Pool for Selector (limit=1000 to get options)
  useEffect(() => {
    let active = true;
    api.get("/assets?per_page=1000")
      .then((res) => {
        if (!active) return;
        const data = res?.data?.data?.data || [];
        setAssetsPool(data);
      })
      .catch((err) => console.error("ERROR fetch assets pool:", err));
    return () => { active = false; };
  }, [refreshKey]);

  // Filter pool of assets that are available for container contents
  const getAvailableAssets = () => {
    return assetsPool.filter((asset) => {
      // Exclude Tas category from contents
      if (asset.category?.code === "CAT-TAS" || asset.category?.name === "Tas") {
        return false;
      }
      // Exclude retired or disposed assets
      if (asset.condition_status === "retired" || asset.status === "disposed") {
        return false;
      }
      return true;
    });
  };

  const openCreate = () => {
    setForm(emptyForm);
    setErrors({});
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (target: PlotingDevice) => {
    api.get(`/ploting-devices/${target.id}`)
      .then((res) => {
        const fullDetail = res?.data?.data;
        if (fullDetail) {
          const assetIds = (fullDetail.assets || []).map((a: Asset) => a.id);
          setForm({
            container_asset_id: fullDetail.id,
            asset_ids: assetIds,
            store_id: fullDetail.store_id || "",
          });
          setErrors({});
          setEditTarget(target);
          setModalOpen(true);
        }
      })
      .catch((err) => {
        console.error("ERROR fetch detail for edit:", err);
        setToast("Gagal mengambil detail mapping");
      });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    if (!form.container_asset_id) {
      setErrors({ container_asset_id: "Asset Tas wajib dipilih" });
      setSaving(false);
      return;
    }

    if (!form.store_id) {
      setErrors({ store_id: "Store wajib dipilih" });
      setSaving(false);
      return;
    }

    try {
      if (editTarget) {
        await api.put(`/ploting-devices/${editTarget.id}`, form);
        setToast("Asset Package berhasil diperbarui");
      } else {
        await api.post("/ploting-devices", form);
        setToast("Asset Package berhasil ditambahkan");
        setCurrentPage(1);
      }
      setModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val);
        });
        setErrors(apiErrors);
      } else {
        setToast(err?.response?.data?.message || "Terjadi kesalahan saat menyimpan");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/ploting-devices/${deleteTarget.id}`);
      setToast("Asset Package berhasil dihapus");
      setDeleteTarget(null);
      triggerRefresh();
    } catch (err: any) {
      console.error("ERROR delete:", err);
      setToast(err?.response?.data?.message || "Gagal menghapus Asset Package");
    } finally {
      setDeleting(false);
    }
  };

  const availableAssets = getAvailableAssets();
  const tasPool = assetsPool.filter(a => a.category?.code === "CAT-TAS" || a.category?.name === "Tas");
  const availableTas = tasPool.filter(a => (a.condition_status !== "retired" && a.status !== "disposed") || a.id === form.container_asset_id);
  const selectedTas = availableTas.find((tas) => tas.id === form.container_asset_id);
  const filteredTas = availableTas.filter((tas) => {
    const query = tasSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      tas.asset_code.toLowerCase().includes(query) ||
      tas.asset_name.toLowerCase().includes(query)
    );
  });
  const selectedStore = storeOptions.find((store) => store.id === form.store_id);
  const filteredStores = storeOptions.filter((store) => {
    const query = storeSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return store.name.toLowerCase().includes(query);
  });

  const filteredStoreFilterOptions = useMemo(() => {
    if (!storeFilterSearchQuery) return storeOptions;
    return storeOptions.filter((store) =>
      store.name.toLowerCase().includes(storeFilterSearchQuery.toLowerCase())
    );
  }, [storeOptions, storeFilterSearchQuery]);

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
          {/* Status Filter */}
          <div className="relative w-full sm:w-48">
            <button
              type="button"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="w-full h-10 px-5 flex items-center justify-between rounded-full border border-gray-250 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm cursor-pointer"
            >
              <span className={statusFilter ? "text-slate-800 font-semibold" : "text-gray-400"}>
                {statusFilter ? statusLabel[statusFilter] || statusFilter : "Semua Status"}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </button>

            {showStatusDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-20 divide-y divide-gray-105 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("");
                      setCurrentPage(1);
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full text-left p-3 text-xs transition hover:bg-slate-50 ${
                      !statusFilter ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                    }`}
                  >
                    Semua Status
                  </button>
                  {["available", "borrowed", "maintenance", "lost"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st);
                        setCurrentPage(1);
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full text-left p-3 text-xs transition hover:bg-slate-50 ${
                        statusFilter === st ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                      }`}
                    >
                      {statusLabel[st] || st}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Store Filter */}
          <div className="relative w-full sm:w-48">
            <button
              type="button"
              onClick={() => setShowStoreFilterDropdown(!showStoreFilterDropdown)}
              className="w-full h-10 px-5 flex items-center justify-between rounded-full border border-gray-250 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm cursor-pointer"
            >
              <span className={storeFilter ? "text-slate-800 font-semibold" : "text-gray-400"}>
                {storeFilter ? storeOptions.find(s => String(s.id) === String(storeFilter))?.name || storeFilter : "Semua Store"}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </button>

            {showStoreFilterDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setShowStoreFilterDropdown(false);
                    setStoreFilterSearchQuery("");
                  }}
                />
                <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-lg z-20 flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-2 border-b border-gray-150 bg-slate-50/50 relative flex items-center">
                    <input
                      type="text"
                      placeholder="Cari store..."
                      value={storeFilterSearchQuery}
                      onChange={(e) => setStoreFilterSearchQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-gray-205 rounded-lg outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 transition placeholder:text-gray-400"
                      autoFocus
                    />
                    <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
                    {storeFilterSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setStoreFilterSearchQuery("")}
                        className="absolute right-3 text-gray-400 hover:text-gray-650"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto divide-y divide-gray-100 flex-1 max-h-48 bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        setStoreFilter("");
                        setCurrentPage(1);
                        setShowStoreFilterDropdown(false);
                        setStoreFilterSearchQuery("");
                      }}
                      className={`w-full text-left p-3 text-xs transition hover:bg-slate-50 ${
                        !storeFilter ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                      }`}
                    >
                      Semua Store
                    </button>
                    {filteredStoreFilterOptions.length === 0 ? (
                      <div className="p-3 text-xs text-gray-450 font-medium text-center">
                        Tidak ada store ditemukan.
                      </div>
                    ) : (
                      filteredStoreFilterOptions.map((store) => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => {
                            setStoreFilter(String(store.id));
                            setCurrentPage(1);
                            setShowStoreFilterDropdown(false);
                            setStoreFilterSearchQuery("");
                          }}
                          className={`w-full text-left p-3 text-xs transition hover:bg-slate-50 ${
                            String(storeFilter) === String(store.id) ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                          }`}
                        >
                          {store.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              placeholder="Cari code, nama tas..."
              className="w-full h-10 pl-9 pr-9 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
                onClick={() => {
                  setSearchInput("");
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
          <Plus className="w-4 h-4" /> Tambah Package
        </button>
      </div>

      {/* PAGINATION */}
      {!loading && plotingDevices.length > 0 && (
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
        ) : plotingDevices.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
              <Smartphone className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Tidak Ada Data Asset Package</h3>
            <p className="text-xs text-slate-400 max-w-sm px-4">
              {search || statusFilter
                ? "Tidak ada hasil yang cocok dengan kriteria pencarian atau filter Anda."
                : "Saat ini belum ada pemetaan Tas dan perangkat terdaftar."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-5 font-bold w-12 text-center">No</th>
                  <th 
                    onClick={() => handleSort("code")}
                    className="py-3 px-5 font-bold w-36 cursor-pointer hover:bg-gray-100 transition"
                  >
                    Asset Code
                  </th>
                  <th 
                    onClick={() => handleSort("name")}
                    className="py-3 px-5 font-bold cursor-pointer hover:bg-gray-100 transition"
                  >
                    Nama Tas
                  </th>
                  <th className="py-3 px-5 font-bold w-44">Store</th>
                  <th className="py-3 px-5 font-bold text-center w-32">Jumlah Device</th>
                  <th 
                    onClick={() => handleSort("status")}
                    className="py-3 px-5 font-bold text-center w-32 cursor-pointer hover:bg-gray-100 transition"
                  >
                    Status
                  </th>
                  <th 
                    onClick={() => handleSort("created_at")}
                    className="py-3 px-5 font-bold text-center w-40 cursor-pointer hover:bg-gray-100 transition"
                  >
                    Created At
                  </th>
                  <th className="py-3 px-5 font-bold text-center w-40">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {plotingDevices.map((item, index) => (
                  <tr key={item.id} className="hover:bg-brand-50/10 transition">
                    <td className="py-3.5 px-5 text-center text-slate-400 text-xs">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-700 font-mono text-xs">
                      {item.code}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-800">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-5 text-slate-660 font-semibold">
                      {item.store_name || "-"}
                    </td>
                    <td className="py-3.5 px-5 text-center font-bold text-slate-700">
                      {item.assets_count} Device
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full ${statusColor[item.status]}`}>
                        {statusLabel[item.status]}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center text-slate-500 text-xs">
                      {new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/ploting-devices/${item.id}${location.search}`)}
                          className="w-7 h-7 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full flex items-center justify-center transition"
                          title="Detail Asset Package"
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
                          className="w-7 h-7 bg-red-50 text-red-650 hover:bg-red-100 rounded-full flex items-center justify-center transition"
                          title="Hapus Mapping"
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

      {/* CRUD MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-teal-50 px-6 py-4 flex items-center justify-between border-b border-teal-100">
              <div className="flex items-center gap-3">
                <div className="bg-teal-650 text-white rounded-lg w-8 h-8 flex items-center justify-center shadow-md">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {editTarget ? "Edit Asset Package" : "Tambah Asset Package"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm space-y-3">
                
                {/* Step 1: Select Tas */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Pilih Asset Tas <span className="text-red-500">*</span>
                  </label>
                  {editTarget ? (
                    <div className="mt-1 w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 font-semibold cursor-not-allowed">
                      {selectedTas ? `${selectedTas.asset_code} - ${selectedTas.asset_name}` : "-- Tas Tidak Ditemukan --"}
                    </div>
                  ) : (
                    <div ref={tasDropdownRef} className="relative mt-1 z-20">
                      <button
                        type="button"
                        onClick={() => setTasDropdownOpen(!tasDropdownOpen)}
                        className="w-full h-10 px-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm cursor-pointer"
                      >
                        <span className={selectedTas ? "text-gray-800 font-medium" : "text-gray-400"}>
                          {selectedTas ? `${selectedTas.asset_code} - ${selectedTas.asset_name}` : "-- Pilih Tas --"}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      </button>

                      {tasDropdownOpen && (
                        <div className="absolute z-60 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-60 animate-in fade-in slide-in-from-top-1 duration-100">
                          <div className="p-2 border-b border-gray-150 bg-slate-50/50 relative flex items-center">
                            <input
                              type="text"
                              placeholder="Cari tas (kode atau nama)..."
                              value={tasSearchQuery}
                              onChange={(e) => setTasSearchQuery(e.target.value)}
                              className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 transition placeholder:text-gray-400"
                              autoFocus
                            />
                            <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
                            {tasSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setTasSearchQuery("")}
                                className="absolute right-3 text-gray-400 hover:text-gray-650"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="overflow-y-auto divide-y divide-gray-100 flex-1 bg-white">
                            {filteredTas.length === 0 ? (
                              <div className="py-4 text-center text-xs text-gray-450 font-medium">
                                Tidak ada tas yang cocok
                              </div>
                            ) : (
                              filteredTas.map((tas) => (
                                <button
                                  key={tas.id}
                                  type="button"
                                  onClick={() => {
                                    setForm((f) => ({ ...f, container_asset_id: tas.id }));
                                    setTasDropdownOpen(false);
                                    setTasSearchQuery("");
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-xs transition flex flex-col gap-0.5 hover:bg-slate-50 ${
                                    form.container_asset_id === tas.id ? "bg-teal-50/50 font-semibold text-teal-700" : "text-gray-700"
                                  }`}
                                >
                                  <span className="font-mono text-slate-800 font-semibold">{tas.asset_code}</span>
                                  <span className="text-gray-500 truncate">{tas.asset_name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {errors.container_asset_id && <p className="text-red-500 text-xs mt-1 font-medium">{errors.container_asset_id}</p>}
                </div>

                {/* Pilih Store */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Pilih Store <span className="text-red-500">*</span>
                  </label>
                  <div ref={storeDropdownRef} className="relative mt-1 z-10">
                    <button
                      type="button"
                      onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                      className="w-full h-10 px-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm cursor-pointer"
                    >
                      <span className={selectedStore ? "text-gray-800 font-medium" : "text-gray-400"}>
                        {selectedStore ? selectedStore.name : "-- Pilih Store --"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </button>

                    {storeDropdownOpen && (
                      <div className="absolute z-60 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-60 animate-in fade-in slide-in-from-top-1 duration-100">
                        <div className="p-2 border-b border-gray-150 bg-slate-50/50 relative flex items-center">
                          <input
                            type="text"
                            placeholder="Cari store..."
                            value={storeSearchQuery}
                            onChange={(e) => setStoreSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 transition placeholder:text-gray-400"
                            autoFocus
                          />
                          <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
                          {storeSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setStoreSearchQuery("")}
                              className="absolute right-3 text-gray-400 hover:text-gray-650"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="overflow-y-auto divide-y divide-gray-100 flex-1 bg-white">
                          {filteredStores.length === 0 ? (
                            <div className="py-4 text-center text-xs text-gray-450 font-medium">
                              Tidak ada store yang cocok
                            </div>
                          ) : (
                            filteredStores.map((store) => (
                              <button
                                key={store.id}
                                type="button"
                                onClick={() => {
                                  setForm((f) => ({ ...f, store_id: store.id }));
                                  setStoreDropdownOpen(false);
                                  setStoreSearchQuery("");
                                }}
                                className={`w-full text-left px-4 py-2.5 text-xs transition flex flex-col gap-0.5 hover:bg-slate-50 ${
                                  form.store_id === store.id ? "bg-teal-50/50 font-semibold text-teal-700" : "text-gray-700"
                                }`}
                              >
                                <span className="font-semibold">{store.name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.store_id && <p className="text-red-500 text-xs mt-1 font-medium">{errors.store_id}</p>}
                </div>

                {/* Step 2: Multi-select contained assets */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Pilih Asset Di Dalam Tas
                  </label>
                  <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                    <div className="bg-slate-100/80 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 flex justify-between items-center">
                      <span>Daftar Asset Tersedia</span>
                      <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5 font-bold">
                        Terpilih: {form.asset_ids.length}
                      </span>
                    </div>
                    {/* Search Input for Assets */}
                    <div className="p-2 border-b border-slate-150 bg-slate-50/50">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder="Cari asset berdasarkan kode, nama, atau kategori..."
                          value={assetSearchQuery}
                          onChange={(e) => setAssetSearchQuery(e.target.value)}
                          className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 transition placeholder:text-gray-400"
                        />
                        <Search className="absolute left-2.5 w-3.5 h-3.5 text-gray-400" />
                        {assetSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setAssetSearchQuery("")}
                            className="absolute right-2.5 text-gray-400 hover:text-gray-650"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white">
                      {availableAssets
                        .filter((asset) => {
                          const query = assetSearchQuery.trim().toLowerCase();
                          if (!query) return true;
                          return (
                            asset.asset_code.toLowerCase().includes(query) ||
                            asset.asset_name.toLowerCase().includes(query) ||
                            (asset.category?.name || "").toLowerCase().includes(query)
                          );
                        })
                        .map((asset) => {
                          const isChecked = form.asset_ids.includes(asset.id);
                          const isBelongsToOtherPackage = !!(asset.parent_package &&
                            (!editTarget || asset.parent_package.asset_code !== editTarget.code));
                          const isBelongsToStore = !!asset.store_package;
                          const isBorrowed = asset.status === "borrowed";
                          const isDisabled = (isBelongsToOtherPackage || isBelongsToStore || isBorrowed) && !isChecked;

                          return (
                            <label
                              key={asset.id}
                              className={`flex items-center gap-3 px-4 py-2.5 select-none transition ${
                                isDisabled
                                  ? "opacity-50 cursor-not-allowed bg-slate-50/30"
                                  : "hover:bg-slate-50/65 cursor-pointer"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={(e) => {
                                  if (isDisabled) return;
                                  if (e.target.checked) {
                                    setForm((prev) => ({
                                      ...prev,
                                      asset_ids: [...prev.asset_ids, asset.id],
                                    }));
                                  } else {
                                    setForm((prev) => ({
                                      ...prev,
                                      asset_ids: prev.asset_ids.filter((id) => id !== asset.id),
                                    }));
                                  }
                                }}
                                className={`w-4 h-4 rounded text-teal-600 border-gray-300 focus:ring-teal-550 focus:ring-[3px] focus:ring-teal-500/15 ${
                                  isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 font-mono">
                                  {asset.asset_code}
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium truncate">
                                  {asset.asset_name}
                                </p>
                                {isBelongsToOtherPackage && asset.parent_package && (
                                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                                    [Already in Asset Package: {asset.parent_package.asset_name}]
                                  </p>
                                )}
                                {isBelongsToStore && asset.store_package && (
                                  <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                    [Already in Store: {asset.store_package.store_name}]
                                  </p>
                                )}
                                {isBorrowed && (
                                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                                    [Sedang Dipinjam]
                                  </p>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 border border-gray-150 rounded px-1.5 py-0.5">
                                  {asset.category?.name || "-"}
                                </span>
                                {getConditionBadge(asset.condition_status)}
                              </div>
                            </label>
                          );
                        })}
                      {availableAssets.length > 0 && availableAssets.filter((asset) => {
                        const query = assetSearchQuery.trim().toLowerCase();
                        if (!query) return true;
                        return (
                          asset.asset_code.toLowerCase().includes(query) ||
                          asset.asset_name.toLowerCase().includes(query) ||
                          (asset.category?.name || "").toLowerCase().includes(query)
                        );
                      }).length === 0 && (
                        <div className="py-8 text-center text-gray-400 text-xs font-medium">
                          Pencarian tidak menemukan asset yang cocok.
                        </div>
                      )}
                      {availableAssets.length === 0 && (
                        <div className="py-8 text-center text-gray-400 text-xs font-medium">
                          Tidak ada asset tersedia untuk dimasukkan ke dalam Tas.
                        </div>
                      )}
                    </div>
                  </div>
                  {errors.asset_ids && <p className="text-red-500 text-xs mt-1 font-medium">{errors.asset_ids}</p>}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 px-5 border border-gray-200 text-gray-500 rounded-full text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition text-white rounded-full text-sm font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE DIALOG */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="bg-red-50 p-6 flex flex-col items-center text-center gap-3 border-b border-red-100">
              <div className="bg-red-650 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Hapus Mapping Asset Package</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Apakah Anda yakin ingin menghapus mapping pemetaan Tas <span className="font-semibold text-slate-700">"{deleteTarget.name}" ({deleteTarget.code})</span>?
                Tindakan ini hanya akan melepas seluruh asset dari dalam Tas tersebut, tanpa menghapus asset fisiknya.
              </p>
            </div>
            <div className="p-4 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="h-9 px-4 border border-gray-200 text-gray-500 rounded-full text-xs font-semibold hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 transition text-white rounded-full text-xs font-semibold shadow-sm"
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
