import { useEffect, useState } from "react";
import api from "../api/axios";
import { X, Check } from "lucide-react";

const toDateInput = (val?: string | null): string => {
  if (!val) return "";
  return val.slice(0, 10);
};

const inp = (error?: string) =>
  `w-full border ${
    error ? "border-red-400" : "border-gray-200"
  } rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition`;

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

interface Category { id: number; name: string; code: string; }

interface Asset {
  id: number;
  asset_name?: string;
  asset_code?: string;
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
  category_id?: number;
  category?: { id: number; name: string };
  assigned_user?: { id: number; name: string };
}

interface AssetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (updatedAsset?: Asset) => void;
  editAsset?: Asset | null;
  categories: Category[];
}

const EMPTY_FORM = {
  asset_code:       "",
  asset_name:       "",
  category_id:      "",
  user_name:        "",
  brand:            "",
  model:            "",
  serial_number:    "",
  purchase_date:    "",
  purchase_price:   "",
  warranty_expired: "",
  condition_status: "good",
  status:           "active",
  note:             "",
};

export default function AssetModal({ open, onClose, onSuccess, editAsset, categories }: AssetModalProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!editAsset;

  useEffect(() => {
    if (!open) return;
    if (isEdit && editAsset) {
      setForm({
        asset_code:       editAsset.asset_code                                  || "",
        asset_name:       editAsset.asset_name                                  || "",
        category_id:      editAsset.category_id ? String(editAsset.category_id) : "",
        user_name:        editAsset.assigned_user?.name || "",
        brand:            editAsset.brand                                       || "",
        model:            editAsset.model                                       || "",
        serial_number:    editAsset.serial_number                               || "",
        purchase_date:    toDateInput(editAsset.purchase_date),
        purchase_price:   editAsset.purchase_price != null ? String(editAsset.purchase_price) : "",
        warranty_expired: toDateInput(editAsset.warranty_expired),
        condition_status: editAsset.condition_status || "good",
        status:           editAsset.status           || "active",
        note:             editAsset.note             || "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setErrors({});
  }, [open, editAsset]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
  try {
    setErrors({});

    const selectedCategory = categories.find((c) => String(c.id) === form.category_id);

    const payload = {
      asset_code:       form.asset_code,
      asset_name:       form.asset_name,
      category_name:    selectedCategory?.name || null,
      user_name:        form.user_name        || null,
      brand:            form.brand            || null,
      model:            form.model            || null,
      serial_number:    form.serial_number    || null,
      purchase_date:    form.purchase_date    || null,
      purchase_price:   form.purchase_price   ? Number(form.purchase_price) : null,
      warranty_expired: form.warranty_expired || null,
      condition_status: form.condition_status || null,
      status:           form.status           || null,
      note:             form.note             || null,
    };

    if (isEdit && editAsset) {
      // Optimistic update — tutup modal langsung dengan data sementara
      const optimistic: Asset = {
        ...editAsset,
        status:           form.status,
        condition_status: form.condition_status,
        asset_name:       form.asset_name,
        asset_code:       form.asset_code,
        brand:            form.brand || undefined,
        model:            form.model || undefined,
        serial_number:    form.serial_number || undefined,
        note:             form.note || undefined,
        category:         selectedCategory
          ? { id: Number(form.category_id), name: selectedCategory.name }
          : editAsset.category,
      };
      onSuccess(optimistic); // tutup modal langsung

      // Request di background
      api.put(`/assets/${editAsset.id}`, payload).catch((err) => {
        alert(err?.response?.data?.message || "Gagal menyimpan perubahan");
      });

    } else {
      onSuccess(); // tutup modal langsung
      api.post("/assets", payload).catch((err) => {
        alert(err?.response?.data?.message || "Gagal menyimpan aset");
      });
    }

  } catch (err: any) {
    if (err?.response?.data?.errors) {
      const apiErrors: Record<string, string> = {};
      Object.entries(err.response.data.errors).forEach(([key, val]) => {
        apiErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val);
      });
      setErrors(apiErrors);
    }
  }
};

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-base">
            {isEdit ? `Edit Aset — ${editAsset?.asset_code}` : "Tambah Aset"}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">

            <Field label="Kode Aset" required error={errors.asset_code}>
              <input className={inp(errors.asset_code)} placeholder="AST-LPT-001"
                value={form.asset_code} onChange={(e) => set("asset_code", e.target.value)} />
            </Field>

            <Field label="Nama Aset" required error={errors.asset_name}>
              <input className={inp(errors.asset_name)} placeholder="Laptop Dell Latitude 5420"
                value={form.asset_name} onChange={(e) => set("asset_name", e.target.value)} />
            </Field>

            <Field label="Kategori" required error={errors.category_name}>
              <select className={inp(errors.category_name)}
                value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">-- Pilih Kategori --</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Nama Pengguna" error={errors.user_name}>
              <input className={inp(errors.user_name)} placeholder="Nama user (opsional)"
                value={form.user_name} onChange={(e) => set("user_name", e.target.value)} />
            </Field>

            <Field label="Brand" error={errors.brand}>
              <input className={inp(errors.brand)} placeholder="Dell, HP, Cisco..."
                value={form.brand} onChange={(e) => set("brand", e.target.value)} />
            </Field>

            <Field label="Model" error={errors.model}>
              <input className={inp(errors.model)} placeholder="Latitude 5420"
                value={form.model} onChange={(e) => set("model", e.target.value)} />
            </Field>

            <Field label="Serial Number" error={errors.serial_number}>
              <input className={inp(errors.serial_number)} placeholder="SN-DELL-001-2024"
                value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} />
            </Field>

            <Field label="Harga Beli (Rp)" error={errors.purchase_price}>
              <input className={inp(errors.purchase_price)} type="number" placeholder="15000000"
                value={form.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} />
            </Field>

            <Field label="Tanggal Beli" error={errors.purchase_date}>
              <input className={inp(errors.purchase_date)} type="date"
                value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
            </Field>

            <Field label="Garansi Sampai" error={errors.warranty_expired}>
              <input className={inp(errors.warranty_expired)} type="date"
                value={form.warranty_expired} onChange={(e) => set("warranty_expired", e.target.value)} />
            </Field>

            <Field label="Kondisi" required error={errors.condition_status}>
              <select className={inp(errors.condition_status)}
                value={form.condition_status} onChange={(e) => set("condition_status", e.target.value)}>
                <option value="good">Good</option>
                <option value="damaged">Damaged</option>
                <option value="under_maintenance">Maintenance</option>
              </select>
            </Field>

            <Field label="Status" required error={errors.status}>
              <select className={inp(errors.status)}
                value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Aktif</option>
                <option value="borrowed">Dipinjam</option>
                <option value="disposed">Disposed</option>
              </select>
            </Field>

            <div className="col-span-2">
              <Field label="Catatan" error={errors.note}>
                <textarea className={`${inp(errors.note)} resize-none`} rows={3}
                  placeholder="Catatan tambahan tentang aset ini..."
                  value={form.note} onChange={(e) => set("note", e.target.value)} />
              </Field>
            </div>

          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            Batal
          </button>
          <button onClick={handleSubmit}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2">
            <Check className="w-4 h-4" />
            {isEdit ? "Simpan Perubahan" : "Simpan Aset"}
          </button>
        </div>

      </div>
    </div>
  );
}