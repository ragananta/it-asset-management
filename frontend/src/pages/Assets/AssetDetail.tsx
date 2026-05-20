import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  ArrowLeft, Package, Tag, User, Wrench,
  Calendar, DollarSign, Hash, Plus,
  Pencil, Trash2, X, Check,
} from "lucide-react";

interface Property {
  id: number;
  asset_id: number;
  property_name: string;
  value: string;
  note?: string;
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

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // property modal
  const [propModalOpen, setPropModalOpen] = useState(false);
  const [propEditTarget, setPropEditTarget] = useState<Property | null>(null);
  const [propForm, setPropForm] = useState<PropertyForm>(emptyPropForm);
  const [propSaving, setPropSaving] = useState(false);
  const [propErrors, setPropErrors] = useState<Record<string, string>>({});

  // delete property
  const [propDeleteTarget, setPropDeleteTarget] = useState<Property | null>(null);
  const [propDeleting, setPropDeleting] = useState(false);

  // ================= FETCH =================
  const fetchDetail = async () => {
    try {
      setLoading(true);
      if (!id) return;
      const res = await api.get(`/assets/${id}`);
      setAsset(res.data.data || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  // ================= PROPERTY MODAL =================
  const openPropCreate = () => {
    setPropEditTarget(null);
    setPropForm(emptyPropForm);
    setPropErrors({});
    setPropModalOpen(true);
  };

  const openPropEdit = (prop: Property) => {
    setPropEditTarget(prop);
    setPropForm({
      property_name: prop.property_name,
      value: prop.value,
      note: prop.note || "",
    });
    setPropErrors({});
    setPropModalOpen(true);
  };

  const closePropModal = () => {
    setPropModalOpen(false);
    setPropEditTarget(null);
    setPropForm(emptyPropForm);
    setPropErrors({});
  };

  // ================= SAVE PROPERTY =================
  const handlePropSave = async () => {
    try {
      setPropSaving(true);
      setPropErrors({});

      const payload = {
        asset_id: Number(id),
        property_name: propForm.property_name,
        value: propForm.value,
        note: propForm.note || null,
      };

      if (propEditTarget) {
        await api.put(`/asset-properties/${propEditTarget.id}`, payload);
      } else {
        await api.post("/asset-properties", payload);
      }

      await fetchDetail();
      closePropModal();
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val);
        });
        setPropErrors(apiErrors);
      }
    } finally {
      setPropSaving(false);
    }
  };

  // ================= DELETE PROPERTY =================
  const handlePropDelete = async () => {
    if (!propDeleteTarget) return;
    try {
      setPropDeleting(true);
      await api.delete(`/asset-properties/${propDeleteTarget.id}`);
      await fetchDetail();
      setPropDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setPropDeleting(false);
    }
  };

  // ================= FORMAT =================
  const formatDate = (val: string) => {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("id-ID", {
      day: "2-digit", month: "long", year: "numeric",
    });
  };

  const formatCurrency = (val: number | string) => {
    if (!val) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", maximumFractionDigits: 0,
    }).format(Number(val));
  };

  // ================= LOADING / NOT FOUND =================
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

      {/* ================= HEADER ================= */}
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

      {/* ================= INFO UTAMA ================= */}
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

      {/* ================= ASSET PROPERTIES ================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Hash className="w-4 h-4 text-purple-500" />
            Asset Properties
            <span className="text-xs text-gray-400 font-normal ml-1">
              ({asset.properties?.length || 0} item)
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
            {asset.properties.map((prop: Property) => (
              <div
                key={prop.id}
                className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
              >
                {/* Kiri: info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">{prop.property_name}</p>
                  <p className="text-sm font-medium text-gray-800">{prop.value}</p>
                  {prop.note && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">{prop.note}</p>
                  )}
                </div>

                {/* Kanan: tombol edit & hapus — selalu terlihat */}
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button
                    onClick={() => openPropEdit(prop)}
                    className="text-yellow-600 text-xs bg-yellow-50 hover:bg-yellow-100 px-2.5 py-1 rounded-full flex items-center gap-1 transition"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => setPropDeleteTarget(prop)}
                    className="text-red-500 text-xs bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-full flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL ADD/EDIT PROPERTY ================= */}
      {propModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                {propEditTarget ? `Edit Property — ${propEditTarget.property_name}` : "Tambah Property"}
              </h2>
              <button onClick={closePropModal} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nama Property <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="contoh: RAM, IP Address, Warna"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${propErrors.property_name ? "border-red-400" : "border-gray-200"}`}
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
                  placeholder="contoh: 16GB, 192.168.1.10, Hitam"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${propErrors.value ? "border-red-400" : "border-gray-200"}`}
                  value={propForm.value}
                  onChange={(e) => setPropForm({ ...propForm, value: e.target.value })}
                />
                {propErrors.value && (
                  <p className="text-red-500 text-xs mt-1">{propErrors.value}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Catatan
                  <span className="text-gray-400 font-normal ml-1">(opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="contoh: IP statis kantor"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={propForm.note}
                  onChange={(e) => setPropForm({ ...propForm, note: e.target.value })}
                />
              </div>

            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={closePropModal}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handlePropSave}
                disabled={propSaving}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {propSaving ? "Menyimpan..." : propEditTarget ? "Simpan Perubahan" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DELETE PROPERTY ================= */}
      {propDeleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Hapus Property?</h3>
              <p className="text-sm text-gray-500">
                Property{" "}
                <span className="font-medium text-gray-700">"{propDeleteTarget.property_name}"</span>{" "}
                akan dihapus permanen.
              </p>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setPropDeleteTarget(null)}
                className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handlePropDelete}
                disabled={propDeleting}
                className="flex-1 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition disabled:opacity-50"
              >
                {propDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Helper component ────────────────────────────────────────────────────────

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