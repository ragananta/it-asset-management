import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  ArrowLeft, Package, Tag, User, Wrench,
  Calendar, DollarSign, Hash, Plus,
  Pencil, Trash2, X, Check,
} from "lucide-react";

interface Category { id: number; name: string; }
interface AssignedUser { id: number; name: string; }
interface Property {
  id: number;
  asset_id: number;
  property_name: string;
  value: string;
  note?: string;
}
interface Asset {
  id: number;
  asset_name: string;
  asset_code: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  vendor?: string;
  purchase_date?: string;
  purchase_price?: number;
  warranty_expired?: string;
  condition_status?: string;
  status?: string;
  note?: string;
  category?: Category;
  assigned_user?: AssignedUser;
  properties?: Property[];
}

interface PropertyForm {
  property_name: string;
  value: string;
  note: string;
}

const emptyPropForm: PropertyForm = { property_name: "", value: "", note: "" };

const conditionLabel: Record<string, string> = {
  good: "Good", damaged: "Damaged", under_maintenance: "Maintenance",
};
const conditionColor: Record<string, string> = {
  good: "text-green-600 bg-green-50",
  damaged: "text-red-600 bg-red-50",
  under_maintenance: "text-yellow-600 bg-yellow-50",
};
const statusLabel: Record<string, string> = {
  active: "Aktif", borrowed: "Dipinjam", disposed: "Disposed",
};
const statusColor: Record<string, string> = {
  active: "text-teal-700 bg-teal-50",
  borrowed: "text-blue-600 bg-blue-50",
  disposed: "text-gray-500 bg-gray-100",
};

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  // property modal
  const [propModalOpen, setPropModalOpen] = useState(false);
  const [propModalClosing, setPropModalClosing] = useState(false);
  const [propEditTarget, setPropEditTarget] = useState<Property | null>(null);
  const [propForm, setPropForm] = useState<PropertyForm>(propForm => propForm || emptyPropForm);
  const [propErrors, setPropErrors] = useState<Record<string, string>>({});
  const propNameInputRef = useRef<HTMLInputElement>(null);

  // delete property
  const [propDeleteTarget, setPropDeleteTarget] = useState<Property | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/assets/${id}`);
      setAsset(res.data.data || res.data);
    } catch (err) {
      console.error(err);
      setAsset(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // ── Property modal ────────────────────────────────────────────────────────
  const openPropCreate = () => {
    setPropModalClosing(false);
    setPropEditTarget(null);
    setPropForm(emptyPropForm);
    setPropErrors({});
    setPropModalOpen(true);
  };

  const openPropEdit = (prop: Property) => {
    setPropModalClosing(false);
    setPropEditTarget(prop);
    setPropForm({ property_name: prop.property_name, value: prop.value, note: prop.note || "" });
    setPropErrors({});
    setPropModalOpen(true);
  };

  const closePropModal = () => {
    setPropModalOpen(false);
    setPropEditTarget(null);
    setPropForm(emptyPropForm);
    setPropErrors({});
    setPropModalClosing(false);
  };

  const requestClosePropModal = () => {
    if (propModalClosing) return;
    setPropModalClosing(true);
    window.setTimeout(() => {
      closePropModal();
    }, 200);
  };

  // Autofocus dan ESC key handler
  useEffect(() => {
    if (!propModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => propNameInputRef.current?.focus(), 80);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClosePropModal();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [propModalOpen, propModalClosing]);

  // ── Save property ─────────────────────────────────────────────────────────
  const handlePropSave = async () => {
    try {
      setPropErrors({});

      const payload = {
        asset_id: Number(id),
        property_name: propForm.property_name,
        value: propForm.value,
        note: propForm.note || null,
      };

      if (propEditTarget) {
        // Optimistic update
        setAsset((prev) => prev ? {
          ...prev,
          properties: prev.properties?.map((p) =>
            p.id === propEditTarget.id ? { ...p, ...propForm } : p
          ),
        } : prev);

        closePropModal(); // tutup modal langsung
        api.put(`/asset-properties/${propEditTarget.id}`, payload)
          .then(() => fetchDetail()) // refresh di background
          .catch((err) => {
            alert(err?.response?.data?.message || "Gagal menyimpan perubahan");
            fetchDetail();
          });

      } else {
        closePropModal(); // tutup modal langsung
        api.post("/asset-properties", payload)
          .then(() => fetchDetail()) // refresh di background
          .catch((err) => {
            alert(err?.response?.data?.message || "Gagal menyimpan property");
            fetchDetail();
          });
      }

    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val);
        });
        setPropErrors(apiErrors);
      }
    }
  };

  // ── Delete property ───────────────────────────────────────────────────────
  const handlePropDelete = async () => {
    if (!propDeleteTarget) return;

    // Optimistic — hapus langsung dari UI
    setAsset((prev) => prev ? {
      ...prev,
      properties: prev.properties?.filter((p) => p.id !== propDeleteTarget.id),
    } : prev);
    setPropDeleteTarget(null);

    // Request di background
    api.delete(`/asset-properties/${propDeleteTarget.id}`)
      .catch(() => {
        alert("Gagal menghapus property");
        fetchDetail(); // rollback
      });
  };

  // ── Format helpers ────────────────────────────────────────────────────────
  const formatDate = (val?: string) => {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("id-ID", {
      day: "2-digit", month: "long", year: "numeric",
    });
  };

  const formatCurrency = (val?: number | string) => {
    if (!val) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", maximumFractionDigits: 0,
    }).format(Number(val));
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Memuat data aset...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-3">Data aset tidak ditemukan</p>
          <button onClick={() => navigate("/assets")} className="text-blue-600 text-sm hover:underline">
            ← Kembali ke daftar aset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-5">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/assets")}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{asset.asset_name}</h1>
            <p className="text-xs font-mono text-gray-400">{asset.asset_code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {asset.condition_status && (
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${conditionColor[asset.condition_status] || "text-gray-500 bg-gray-100"}`}>
              {conditionLabel[asset.condition_status] || asset.condition_status}
            </span>
          )}
          {asset.status && (
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor[asset.status] || "text-gray-500 bg-gray-100"}`}>
              {statusLabel[asset.status] || asset.status}
            </span>
          )}
        </div>
      </div>

      {/* INFO UTAMA */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-500" />
          Informasi Aset
        </h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <InfoRow icon={<Tag />} label="Kategori" value={asset.category?.name} />
          <InfoRow icon={<User />} label="Pengguna" value={asset.assigned_user?.name} />
          <InfoRow
            icon={<Wrench />}
            label="Brand / Model"
            value={[asset.brand, asset.model].filter(Boolean).join(" · ") || "-"}
          />
          <InfoRow icon={<Hash />} label="Serial Number" value={asset.serial_number} mono />
          <InfoRow icon={<DollarSign />} label="Harga Beli" value={formatCurrency(asset.purchase_price)} />
          <InfoRow icon={<Calendar />} label="Tanggal Beli" value={formatDate(asset.purchase_date)} />
          <InfoRow icon={<Calendar />} label="Garansi Sampai" value={formatDate(asset.warranty_expired)} />
        </div>
        {asset.note && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Catatan</p>
            <p className="text-sm text-gray-600">{asset.note}</p>
          </div>
        )}
      </div>

      {/* ASSET PROPERTIES */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Hash className="w-4 h-4 text-purple-500" />
            Asset Properties
            <span className="text-xs text-gray-400 font-normal ml-1">
              ({asset.properties?.length ?? 0} item)
            </span>
          </h2>
          <button
            onClick={openPropCreate}
            className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full transition"
          >
            <Plus className="w-3 h-3" />
            Tambah
          </button>
        </div>

        {!asset.properties || asset.properties.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-300 text-sm">Belum ada property untuk aset ini</p>
            <button onClick={openPropCreate} className="mt-2 text-blue-500 text-xs hover:underline">
              + Tambah property pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {asset.properties.map((prop) => (
              <div
                key={prop.id}
                className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">{prop.property_name}</p>
                  <p className="text-sm font-medium text-gray-800">{prop.value}</p>
                  {prop.note && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">{prop.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button
                    onClick={() => openPropEdit(prop)}
                    className="text-yellow-600 text-xs bg-yellow-50 hover:bg-yellow-100 px-2.5 py-1 rounded-full flex items-center gap-1 transition"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => setPropDeleteTarget(prop)}
                    className="text-red-500 text-xs bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-full flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL ADD/EDIT PROPERTY */}
      {propModalOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-6 transition-opacity duration-200 ${propModalClosing ? "opacity-0" : "opacity-100"}`}
          style={{
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) requestClosePropModal();
          }}
        >
          <style>{`
            @keyframes propModalIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes propModalOut {
              from { opacity: 1; transform: scale(1); }
              to { opacity: 0; transform: scale(0.95); }
            }
          `}</style>
          <div
            className="bg-white w-full max-w-[500px] max-h-[90vh] rounded-[20px] shadow-[0_25px_50px_rgba(0,0,0,.15)] overflow-hidden"
            style={{ animation: `${propModalClosing ? "propModalOut" : "propModalIn"} 200ms ease-out forwards` }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prop-modal-title"
          >
            <div className="flex items-center justify-between px-7 py-6 border-b border-[#eef2f7] bg-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="prop-modal-title" className="font-semibold text-lg text-gray-900 leading-tight">
                    {propEditTarget ? "Edit Property" : "Tambah Property"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {propEditTarget ? "Perbarui detail property aset Anda" : "Tambahkan spesifikasi detail baru"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestClosePropModal}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-7 py-6 overflow-y-auto max-h-[calc(90vh-181px)] space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nama Property <span className="text-red-500">*</span>
                </label>
                <input
                  ref={propNameInputRef}
                  type="text"
                  placeholder="contoh: RAM, IP Address, OS"
                  className={`w-full h-12 border rounded-[10px] px-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 transition ${propErrors.property_name ? "border-red-400" : "border-[#dbe2ea]"}`}
                  value={propForm.property_name}
                  onChange={(e) => setPropForm({ ...propForm, property_name: e.target.value })}
                />
                {propErrors.property_name && (
                  <p className="text-red-500 text-xs mt-1">{propErrors.property_name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="contoh: 16GB, 192.168.1.10, Windows 11"
                  className={`w-full h-12 border rounded-[10px] px-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 transition ${propErrors.value ? "border-red-400" : "border-[#dbe2ea]"}`}
                  value={propForm.value}
                  onChange={(e) => setPropForm({ ...propForm, value: e.target.value })}
                />
                {propErrors.value && (
                  <p className="text-red-500 text-xs mt-1">{propErrors.value}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Catatan <span className="text-gray-400 font-normal">(opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="contoh: IP statis kantor"
                  className="w-full h-12 border border-[#dbe2ea] rounded-[10px] px-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 transition"
                  value={propForm.note}
                  onChange={(e) => setPropForm({ ...propForm, note: e.target.value })}
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-7 py-5 border-t border-[#eef2f7] flex justify-end gap-3">
              <button
                onClick={requestClosePropModal}
                className="h-11 px-5 text-sm font-medium text-gray-700 bg-[#f8fafc] hover:bg-[#e2e8f0] rounded-[10px] transition"
              >
                Batal
              </button>
              <button
                onClick={handlePropSave}
                disabled={!propForm.property_name?.trim() || !propForm.value?.trim()}
                className="h-11 px-5 text-sm font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-[10px] transition flex items-center gap-2 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {propEditTarget ? "Simpan Perubahan" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE PROPERTY */}
      {propDeleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPropDeleteTarget(null); }}
        >
          <style>{`@keyframes deleteModalIn { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }`}</style>
          <div
            className="bg-white rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,.15)] w-full max-w-sm"
            style={{ animation: "deleteModalIn 200ms ease-out forwards" }}
            role="dialog" aria-modal="true"
          >
            <div className="px-6 py-6 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 text-base mb-1">Hapus Property?</h3>
              <p className="text-sm text-gray-500">
                Property{" "}
                <span className="font-medium text-gray-700">"{propDeleteTarget.property_name}"</span>{" "}
                akan dihapus permanen.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setPropDeleteTarget(null)}
                className="flex-1 h-11 text-sm font-medium text-gray-700 bg-[#f8fafc] hover:bg-[#e2e8f0] rounded-[10px] transition"
              >
                Batal
              </button>
              <button
                onClick={handlePropDelete}
                className="flex-1 h-11 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-[10px] transition"
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

// ── Helper component ──────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value, mono,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-4 h-4 text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-sm font-medium text-gray-800 ${mono ? "font-mono" : ""}`}>
          {value || "-"}
        </p>
      </div>
    </div>
  );
}