import { useEffect, useState, useMemo } from "react";
import api from "../../api/axios";
import {
  X,
  Store,
  Search,
  Loader2,
  CheckCircle2,
  Package,
  ChevronDown,
} from "lucide-react";

interface StoreOption {
  id: number;
  code: string;
  name: string;
}

interface Asset {
  id: number;
  asset_name: string;
  asset_code: string;
  condition_status: "good" | "damaged" | "under_maintenance" | "retired";
  status: "active" | "borrowed" | "disposed";
  category?: { id: number; name: string; code?: string } | null;
  store_package?: {
    store_code: string;
    store_name: string;
  } | null;
  parent_package?: {
    asset_code: string;
    asset_name: string;
  } | null;
}

interface StorePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTargetCode?: string | null;
  onSuccess: (msg: string) => void;
}

export default function StorePackageModal({
  isOpen,
  onClose,
  editTargetCode,
  onSuccess,
}: StorePackageModalProps) {
  // Data pools
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [selectedStoreId, setSelectedStoreId] = useState<number | "">("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);

  // Search & Filters
  const [storeQuery, setStoreQuery] = useState("");
  const [assetQuery, setAssetQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Submitting / Error States
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const editMode = !!editTargetCode;

  // Resolve selected store option
  const selectedStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || null;
  }, [stores, selectedStoreId]);

  // Load basic data
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, editTargetCode]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg("");
    setSelectedStoreId("");
    setSelectedAssetIds([]);
    setStoreQuery("");
    setAssetQuery("");
    setCategoryFilter("");
    setStatusFilter("");
    setShowCategoryDropdown(false);
    setShowStatusDropdown(false);
    
    try {
      const [resStores, resAssets] = await Promise.all([
        api.get("/stores/options"),
        api.get("/assets?per_page=1000"),
      ]);

      let loadedStores: StoreOption[] = [];
      if (resStores.data?.success) {
        loadedStores = resStores.data.data || [];
        setStores(loadedStores);
      }

      if (resAssets.data?.success) {
        setAssets(resAssets.data.data?.data || []);
      }

      // If in edit mode, fetch the current package mapping details
      if (editTargetCode) {
        const resDetail = await api.get(`/store-packages/${editTargetCode}`);
        if (resDetail.data?.success) {
          const detail = resDetail.data.data;
          
          // Match store by code
          const storeOpt = loadedStores.find((s) => s.code === editTargetCode);
          if (storeOpt) {
            setSelectedStoreId(storeOpt.id);
            setStoreQuery("");
          } else {
            // Fallback object
            const fallbackStore = { id: -1, code: detail.store_code, name: detail.store_name };
            setStores((prev) => [...prev, fallbackStore]);
            setSelectedStoreId(-1);
            setStoreQuery("");
          }

          // Pre-populate asset IDs
          const ids = detail.assets.map((a: any) => a.id);
          setSelectedAssetIds(ids);
        }
      }
    } catch (err: any) {
      console.error("Gagal memuat data modal:", err);
      setErrorMsg("Gagal mengambil data referensi dari server.");
    } finally {
      setLoading(false);
    }
  };

  // Filter stores based on search query
  const filteredStores = useMemo(() => {
    const q = storeQuery.toLowerCase().trim();
    if (!q) return stores;
    return stores.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [stores, storeQuery]);

  // Filter assets based on search query, category, and status
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const q = assetQuery.toLowerCase().trim();
      
      const matchesSearch =
        !q ||
        asset.asset_name.toLowerCase().includes(q) ||
        asset.asset_code.toLowerCase().includes(q) ||
        (asset.category?.name && asset.category.name.toLowerCase().includes(q));

      const matchesCategory =
        !categoryFilter || (asset.category?.id !== undefined && String(asset.category.id) === categoryFilter);

      const matchesStatus = !statusFilter || asset.status === statusFilter;

      // Exclude retired and disposed assets
      const isActive = asset.status !== "disposed" && asset.condition_status !== "retired";

      return matchesSearch && matchesCategory && matchesStatus && isActive;
    });
  }, [assets, assetQuery, categoryFilter, statusFilter]);

  // Extract unique categories from assets
  const categories = useMemo(() => {
    return Array.from(
      new Map(
        assets
          .map((a) => a.category)
          .filter(Boolean)
          .map((c) => [c!.id, c!])
      ).values()
    );
  }, [assets]);

  const handleSelectStore = (store: StoreOption) => {
    setSelectedStoreId(store.id);
    setStoreQuery("");
    setShowStoreDropdown(false);
    setErrorMsg("");
  };

  const handleToggleAsset = (assetId: number) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  const allFilteredSelectableSelected = useMemo(() => {
    const selectables = filteredAssets.filter((a) => {
      const isAssigned = !!a.store_package;
      const isThisStore =
        isAssigned &&
        selectedStore &&
        a.store_package!.store_code === selectedStore.code;
      const isBorrowed = a.status === "borrowed";
      const isInTas = !!a.parent_package;
      const isChecked = selectedAssetIds.includes(a.id);
      const isDisabled = (isAssigned && !isThisStore) || ((isBorrowed || isInTas) && !isChecked);
      return !isDisabled;
    });
    if (selectables.length === 0) return false;
    return selectables.every((a) => selectedAssetIds.includes(a.id));
  }, [filteredAssets, selectedAssetIds, selectedStore]);

  const handleToggleAllFiltered = () => {
    const selectables = filteredAssets.filter((a) => {
      const isAssigned = !!a.store_package;
      const isThisStore =
        isAssigned &&
        selectedStore &&
        a.store_package!.store_code === selectedStore.code;
      const isBorrowed = a.status === "borrowed";
      const isInTas = !!a.parent_package;
      const isChecked = selectedAssetIds.includes(a.id);
      const isDisabled = (isAssigned && !isThisStore) || ((isBorrowed || isInTas) && !isChecked);
      return !isDisabled;
    });

    const selectableIds = selectables.map((a) => a.id);

    if (allFilteredSelectableSelected) {
      setSelectedAssetIds((prev) => prev.filter((id) => !selectableIds.includes(id)));
    } else {
      setSelectedAssetIds((prev) => Array.from(new Set([...prev, ...selectableIds])));
    }
  };

  const handleSave = async () => {
    if (!selectedStore) {
      setErrorMsg("Store wajib dipilih.");
      return;
    }
    if (selectedAssetIds.length === 0) {
      setErrorMsg("Paling sedikit satu asset harus dipilih.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      if (editMode) {
        await api.put(`/store-packages/${selectedStore.code}`, {
          asset_ids: selectedAssetIds,
        });
        onSuccess(`Store Package "${selectedStore.name}" berhasil diperbarui.`);
      } else {
        await api.post("/store-packages", {
          store_code: selectedStore.code,
          asset_ids: selectedAssetIds,
        });
        onSuccess(`Store Package "${selectedStore.name}" berhasil dibuat.`);
      }
    } catch (err: any) {
      console.error("Gagal menyimpan mapping store package:", err);
      if (err.response?.status === 409) {
        setErrorMsg("Asset sudah terdaftar pada Store lain.");
      } else {
        setErrorMsg(err.response?.data?.message || "Gagal menyimpan data ke server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-teal-50 px-6 py-4 flex items-center justify-between border-b border-teal-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 text-white rounded-lg w-8 h-8 flex items-center justify-center shadow-md">
              <Store className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">
              {editMode ? "Edit Store Package" : "Create Store Package"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-656 rounded-full p-1 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
              <p className="text-xs text-gray-400">Loading data...</p>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-750 text-xs rounded-xl animate-in slide-in-from-top-1">
                  {errorMsg}
                </div>
              )}

              {/* Section 1: Select Store */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Pilih Store <span className="text-red-500">*</span>
                </label>
                
                {editMode ? (
                  <div className="w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 font-semibold cursor-not-allowed">
                    {selectedStore?.name} ({selectedStore?.code})
                  </div>
                ) : (
                  <div className={`relative ${showStoreDropdown ? "z-30" : "z-10"}`}>
                    <button
                      type="button"
                      onClick={() => setShowStoreDropdown(!showStoreDropdown)}
                      className="w-full h-10 px-3 flex items-center justify-between rounded-lg border border-gray-255 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm cursor-pointer"
                    >
                      <span className={selectedStore ? "text-slate-800 font-semibold" : "text-gray-400"}>
                        {selectedStore ? `${selectedStore.name} (${selectedStore.code})` : "-- Pilih Store --"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </button>

                    {showStoreDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowStoreDropdown(false)}
                        />
                        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-lg z-20 flex flex-col">
                          <div className="p-2 border-b border-gray-150 bg-slate-50/50 relative flex items-center">
                            <input
                              type="text"
                              placeholder="Cari store..."
                              value={storeQuery}
                              onChange={(e) => setStoreQuery(e.target.value)}
                              className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 transition placeholder:text-gray-400"
                              autoFocus
                            />
                            <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
                            {storeQuery && (
                              <button
                                type="button"
                                onClick={() => setStoreQuery("")}
                                className="absolute right-3 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="overflow-y-auto divide-y divide-gray-100 flex-1 max-h-48 bg-white">
                            {filteredStores.length === 0 ? (
                              <div className="p-3 text-xs text-gray-450 font-medium text-center">
                                Tidak ada store ditemukan.
                              </div>
                            ) : (
                              filteredStores.map((store) => (
                                <button
                                  key={store.id}
                                  type="button"
                                  onClick={() => handleSelectStore(store)}
                                  className={`w-full text-left p-3 text-xs transition flex flex-col gap-0.5 hover:bg-slate-50 ${
                                    selectedStoreId === store.id ? "bg-teal-50/50 font-semibold text-teal-700" : "text-slate-700"
                                  }`}
                                >
                                  <span className="font-semibold">{store.name}</span>
                                  <span className="text-[10px] text-gray-400 font-semibold">{store.code}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Pilih Asset */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Daftar Asset Tersedia
                  </h4>
                  <div className="text-xs font-semibold text-slate-500">
                    Terpilih: <span className="text-teal-600 font-bold">{selectedAssetIds.length}</span>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input
                      placeholder="Cari asset berdasarkan kode, nama, atau kategori..."
                      className="w-full h-8 pl-8 pr-8 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-brand-500"
                      value={assetQuery}
                      onChange={(e) => setAssetQuery(e.target.value)}
                    />
                    {assetQuery && (
                      <button
                        type="button"
                        onClick={() => setAssetQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Dropdown */}
                  <div className={`relative min-w-[130px] ${showCategoryDropdown ? "z-30" : "z-10"}`}>
                    <button
                      type="button"
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="w-full h-8 px-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white text-xs text-slate-700 hover:bg-gray-50 focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm cursor-pointer transition-all"
                    >
                      <span className={categoryFilter ? "text-brand-600 font-semibold truncate" : "text-slate-500 truncate"}>
                        {categories.find(c => String(c.id) === categoryFilter)?.name || "Semua Kategori"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
                    </button>

                    {showCategoryDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowCategoryDropdown(false)}
                        />
                        <div className="absolute right-0 mt-1 w-48 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg z-20 flex flex-col max-h-48 overflow-y-auto divide-y divide-gray-100">
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryFilter("");
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full text-left p-2.5 text-xs transition hover:bg-slate-50 ${
                              !categoryFilter ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                            }`}
                          >
                            Semua Kategori
                          </button>
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setCategoryFilter(String(cat.id));
                                setShowCategoryDropdown(false);
                              }}
                              className={`w-full text-left p-2.5 text-xs transition hover:bg-slate-50 ${
                                categoryFilter === String(cat.id) ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div className={`relative min-w-[110px] ${showStatusDropdown ? "z-30" : "z-10"}`}>
                    <button
                      type="button"
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="w-full h-8 px-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white text-xs text-slate-700 hover:bg-gray-50 focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm cursor-pointer transition-all"
                    >
                      <span className={statusFilter ? "text-brand-600 font-semibold truncate" : "text-slate-500 truncate"}>
                        {statusFilter === "active" ? "Active" : statusFilter === "borrowed" ? "Borrowed" : "Semua Status"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
                    </button>

                    {showStatusDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowStatusDropdown(false)}
                        />
                        <div className="absolute right-0 mt-1 w-36 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg z-20 flex flex-col divide-y divide-gray-100">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("");
                              setShowStatusDropdown(false);
                            }}
                            className={`w-full text-left p-2.5 text-xs transition hover:bg-slate-50 ${
                              !statusFilter ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                            }`}
                          >
                            Semua Status
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("active");
                              setShowStatusDropdown(false);
                            }}
                            className={`w-full text-left p-2.5 text-xs transition hover:bg-slate-50 ${
                              statusFilter === "active" ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                            }`}
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("borrowed");
                              setShowStatusDropdown(false);
                            }}
                            className={`w-full text-left p-2.5 text-xs transition hover:bg-slate-50 ${
                              statusFilter === "borrowed" ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                            }`}
                          >
                            Borrowed
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Table list of assets */}
                <div className="border border-gray-150 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto bg-white">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={allFilteredSelectableSelected}
                            onChange={handleToggleAllFiltered}
                            disabled={!selectedStore || filteredAssets.filter(a => {
                              const isAssigned = !!a.store_package;
                              const isThisStore = isAssigned && selectedStore && a.store_package!.store_code === selectedStore.code;
                              const isBorrowed = a.status === "borrowed";
                              const isInTas = !!a.parent_package;
                              const isChecked = selectedAssetIds.includes(a.id);
                              const isDisabled = (isAssigned && !isThisStore) || ((isBorrowed || isInTas) && !isChecked);
                              return !isDisabled;
                            }).length === 0}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                            title="Pilih Semua / Kosongkan Pilihan (pada filter saat ini)"
                          />
                        </th>
                        <th className="py-2.5 px-4 w-28">Asset Code</th>
                        <th className="py-2.5 px-4">Nama Asset</th>
                        <th className="py-2.5 px-4 w-28">Kategori</th>
                        <th className="py-2.5 px-4 w-20 text-center">Status</th>
                        <th className="py-2.5 px-4 w-44">Store Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAssets.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Tidak ada asset yang cocok dengan kriteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAssets.map((asset) => {
                          const isChecked = selectedAssetIds.includes(asset.id);
                          const isAssigned = !!asset.store_package;
                          const isThisStore =
                            isAssigned &&
                            selectedStore &&
                            asset.store_package!.store_code === selectedStore.code;
                          const isBorrowed = asset.status === "borrowed";
                          const isInTas = !!asset.parent_package;
                          const isDisabled = (isAssigned && !isThisStore) || ((isBorrowed || isInTas) && !isChecked);

                          return (
                            <tr
                              key={asset.id}
                              onClick={() => !isDisabled && handleToggleAsset(asset.id)}
                              className={`transition cursor-pointer ${
                                isDisabled
                                  ? "bg-gray-50/50 cursor-not-allowed opacity-50"
                                  : isChecked
                                  ? "bg-teal-50/20"
                                  : "hover:bg-gray-50/40"
                              }`}
                            >
                              <td className="py-2 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onChange={() => {}} // handled by row click
                                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-4 font-semibold text-slate-600">
                                {asset.asset_code}
                              </td>
                              <td className="py-2 px-4 font-semibold text-slate-700">
                                {asset.asset_name}
                              </td>
                              <td className="py-2 px-4 text-slate-500">
                                {asset.category?.name || "-"}
                              </td>
                              <td className="py-2 px-4 text-center capitalize">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    asset.status === "active"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}
                                >
                                  {asset.status}
                                </span>
                              </td>
                              <td className="py-2 px-4 flex flex-wrap gap-1">
                                {isAssigned && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      isThisStore
                                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-250"
                                    }`}
                                  >
                                    {isThisStore
                                      ? `This Store`
                                      : `[Already Assigned: ${asset.store_package!.store_name}]`}
                                  </span>
                                )}
                                {isInTas && (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {`[Di dalam Tas: ${asset.parent_package!.asset_name}]`}
                                  </span>
                                )}
                                {isBorrowed && (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    [Sedang Dipinjam]
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-full border border-gray-250 hover:bg-slate-100 transition text-xs font-bold text-slate-500"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting || loading || !selectedStore}
            className="h-9 px-5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white transition text-xs font-bold rounded-full shadow-sm flex items-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Simpan Mapping
          </button>
        </div>
      </div>
    </div>
  );
}
