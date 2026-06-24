import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Search,
  X,
  Store,
  Package,
  Layers,
  Loader2,
} from "lucide-react";
import StorePackageModal from "./StorePackageModal";

interface Asset {
  id: number;
  asset_code: string;
  asset_name: string;
  category: string;
  status: string;
  condition: string;
}

interface StorePackageDetailData {
  store_code: string;
  store_name: string;
  total_assets: number;
  assets: Asset[];
}

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

export default function StorePackageDetail() {
  const { storeCode } = useParams<{ storeCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Data states
  const [detail, setDetail] = useState<StorePackageDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states (local)
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Quick Action unlink state
  const [unlinkTarget, setUnlinkTarget] = useState<Asset | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    if (storeCode) {
      fetchDetail();
    }
  }, [storeCode]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/store-packages/${storeCode}`);
      if (res.data?.success) {
        setDetail(res.data.data);
      }
    } catch (err: any) {
      console.error("Gagal memuat detail store package:", err);
      showToast("Detail Store Package tidak ditemukan.");
      navigate(`/store-packages${location.search}`);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Quick Action unlink single asset
  const confirmUnlink = (asset: Asset) => {
    setUnlinkTarget(asset);
  };

  const handleUnlink = async () => {
    if (!detail || !unlinkTarget) return;
    setUnlinking(true);
    try {
      const remainingAssetIds = detail.assets
        .filter((a) => a.id !== unlinkTarget.id)
        .map((a) => a.id);

      await api.put(`/store-packages/${storeCode}`, {
        asset_ids: remainingAssetIds,
      });

      showToast(`Asset "${unlinkTarget.asset_name}" dilepas.`);
      setUnlinkTarget(null);
      fetchDetail();
    } catch (err: any) {
      console.error("Gagal melepas asset:", err);
      showToast("Gagal melepas asset.");
    } finally {
      setUnlinking(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="p-10 space-y-4">
        <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse w-full" />
      </div>
    );
  }

  if (!detail) return null;

  // Local filter for child assets
  const filteredAssets = detail.assets.filter((a) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      a.asset_name.toLowerCase().includes(q) ||
      a.asset_code.toLowerCase().includes(q);

    const matchesCategory = !categoryFilter || a.category === categoryFilter;
    const matchesStatus = !statusFilter || a.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Extract unique categories of current assets for local filter
  const localCategories = Array.from(new Set(detail.assets.map((a) => a.category).filter(Boolean)));

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

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/store-packages${location.search}`)}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-slate-50 flex items-center justify-center transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Store Package: {detail.store_name}</h2>
            <p className="text-xs text-slate-400">Manage permanent Store inventory assignment</p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="h-10 px-5 bg-teal-600 hover:bg-teal-700 transition text-white rounded-full text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
        >
          <Pencil className="w-4 h-4" /> Edit Assigned Assets
        </button>
      </div>

      {/* STORE METADATA INFO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Store Code</p>
            <p className="text-slate-755 font-bold text-base mt-0.5">{detail.store_code}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Store Name</p>
            <p className="text-slate-800 font-bold text-base mt-0.5">{detail.store_name}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Inventory Assets</p>
            <p className="text-slate-855 font-extrabold text-base mt-0.5">{detail.total_assets} Asset</p>
          </div>
        </div>
      </div>

      {/* FILTER & LOCAL TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1">
        {/* Table Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-200 rounded-full px-4 py-1.5 text-xs focus:outline-none focus:border-brand-500 bg-white cursor-pointer w-full sm:w-40 shadow-sm"
            >
              <option value="">Semua Kategori</option>
              {localCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-full px-4 py-1.5 text-xs focus:outline-none focus:border-brand-500 bg-white cursor-pointer w-full sm:w-40 shadow-sm"
            >
              <option value="">Semua Status</option>
              <option value="active">Active</option>
              <option value="borrowed">Borrowed</option>
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                placeholder="Cari asset..."
                className="w-full h-8 pl-9 pr-9 rounded-full border border-gray-200 bg-white text-xs focus:outline-none focus:border-brand-500 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearch("")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Display */}
        <div className="overflow-x-auto">
          {filteredAssets.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">Tidak Ada Asset Ditemukan</h3>
              <p className="text-xs text-slate-400">
                {search || categoryFilter || statusFilter
                  ? "Tidak ada asset yang cocok dengan kriteria filter Anda."
                  : "Store Package ini kosong. Klik tombol di atas untuk menambahkan asset."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 text-center w-12 whitespace-nowrap">No</th>
                  <th className="px-5 py-3 text-left w-36 whitespace-nowrap">Asset Code</th>
                  <th className="px-5 py-3 text-left min-w-[180px]">Nama Asset</th>
                  <th className="px-5 py-3 text-center w-36 whitespace-nowrap">Kategori</th>
                  <th className="px-5 py-3 text-center w-28 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-center w-28 whitespace-nowrap">Kondisi</th>
                  <th className="px-5 py-3 text-center w-28 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAssets.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-brand-50/15 transition cursor-pointer" onClick={() => navigate(`/assets/${item.id}`)}>
                    <td className="px-5 py-4 text-center text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-700">
                      {item.asset_code}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800">{item.asset_name}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase inline-flex items-center justify-center w-28 text-center">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center capitalize">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold w-24 text-center ${
                          item.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center">
                        {getConditionBadge(item.condition)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => confirmUnlink(item)}
                        className="w-7 h-7 bg-red-50 text-red-600 hover:bg-red-100 rounded-full flex items-center justify-center transition mx-auto"
                        title="Lepas dari Store"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* REFACTORED MODAL */}
      <StorePackageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editTargetCode={storeCode}
        onSuccess={(msg) => {
          setModalOpen(false);
          showToast(msg);
          fetchDetail();
        }}
      />

      {/* QUICK UNLINK CONFIRMATION MODAL */}
      {unlinkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-base">Lepas Asset dari Store?</h3>
                <p className="text-xs text-slate-400">
                  Apakah Anda yakin ingin melepas asset{" "}
                  <span className="font-bold text-slate-700">"{unlinkTarget.asset_name}"</span> (
                  <span className="text-slate-600 font-semibold">
                    {unlinkTarget.asset_code}
                  </span>
                  ) dari Store{" "}
                  <span className="font-bold text-slate-700">"{detail.store_name}"</span>?
                </p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUnlinkTarget(null)}
                className="h-9 px-4 rounded-full border border-gray-250 hover:bg-slate-100 transition text-xs font-bold text-slate-500"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUnlink}
                disabled={unlinking}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white transition text-xs font-bold rounded-full shadow-sm flex items-center gap-1.5"
              >
                {unlinking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, Lepas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
