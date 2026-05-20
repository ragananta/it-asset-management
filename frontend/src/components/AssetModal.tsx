import { useEffect, useState } from "react";
import api from "../api/axios";
import { X, Check } from "lucide-react";

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  asset_code:       "",
  asset_name:       "",
  category_name:    "",
  user_name:        "",   // sesuai backend: user_name
  brand:            "",
  model:            "",
  serial_number:    "",
  vendor:           "",
  purchase_date:    "",
  purchase_price:   "",
  warranty_expired: "",
  condition_status: "good",
  status:           "active", // field baru
  note:             "",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editAsset?: any; // kalau ada → mode edit
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssetModal({ open, onClose, onSuccess, editAsset }: AssetModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isEdit = !!editAsset;

  // ── Pre-fill form saat mode edit ──────────────────────────────────────────
  useEffect(() => {
    if (open && isEdit) {
      setForm({
        asset_code:       editAsset.asset_code                                    || "",
        asset_name:       editAsset.asset_name                                    || "",
        category_name:    editAsset.category?.name                                || "",
        user_name:        editAsset.assigned_user?.name || editAsset.user_name    || "",
        brand:            editAsset.brand                                         || "",
        model:            editAsset.model                                         || "",
        serial_number:    editAsset.serial_number                                 || "",
        vendor:           editAsset.vendor                                        || "",
        purchase_date:    editAsset.purchase_date                                 || "",
        purchase_price:   editAsset.purchase_price != null ? String(editAsset.purchase_price) : "",
        warranty_expired: editAsset.warranty_expired                              || "",
        condition_status: editAsset.condition_status                              || "good",
        status:           editAsset.status                                        || "active",
        note:             editAsset.note                                          || "",
      });
    } else if (open && !isEdit) {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, editAsset]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrors({});

      const payload = {
        asset_code:       form.asset_code,
        asset_name:       form.asset_name,
        category_name:    form.category_name    || null,
        user_name:        form.user_name        || null,
        brand:            form.brand            || null,
        model:            form.model            || null,
        serial_number:    form.serial_number    || null,
        vendor:           form.vendor           || null,
        purchase_date:    form.purchase_date    || null,
        purchase_price:   form.purchase_price   ? Number(form.purchase_price) : null,
        warranty_expired: form.warranty_expired || null,
        condition_status: form.condition_status || null,
        status:           form.status           || null,
        note:             form.note             || null,
      };

      if (isEdit) {
        await api.put(`/assets/${editAsset.id}`, payload);
      } else {
        await api.post("/assets", payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      // Tampilkan error validasi dari backend
      if (err?.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val);
        });
        setErrors(apiErrors);
      } else {
        alert(err?.response?.data?.message || "Gagal menyimpan aset");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-base">
            {isEdit ? `Edit Aset — ${editAsset.asset_code}` : "Tambah Aset"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">

            <Field label="Kode Aset" required error={errors.asset_code}>
              <input
                className={inp(errors.asset_code)}
                placeholder="AST-NET-011"
                value={form.asset_code}
                onChange={(e) => handleChange("asset_code", e.target.value)}
              />
            </Field>

            <Field label="Nama Aset" required error={errors.asset_name}>
              <input
                className={inp(errors.asset_name)}
                placeholder="Nama aset"
                value={form.asset_name}
                onChange={(e) => handleChange("asset_name", e.target.value)}
              />
            </Field>

            <Field label="Kategori" required error={errors.category_name}>
              <input
                className={inp(errors.category_name)}
                placeholder="Contoh: Laptop, Printer, Server"
                value={form.category_name}
                onChange={(e) => handleChange("category_name", e.target.value)}
              />
            </Field>

            <Field label="Nama Pengguna" error={errors.user_name}>
              <input
                className={inp(errors.user_name)}
                placeholder="Nama user (opsional)"
                value={form.user_name}
                onChange={(e) => handleChange("user_name", e.target.value)}
              />
            </Field>

            <Field label="Brand" error={errors.brand}>
              <input
                className={inp(errors.brand)}
                placeholder="Ubiquiti"
                value={form.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
              />
            </Field>

            <Field label="Model" error={errors.model}>
              <input
                className={inp(errors.model)}
                placeholder="U6 Lite"
                value={form.model}
                onChange={(e) => handleChange("model", e.target.value)}
              />
            </Field>

            <Field label="Serial Number" error={errors.serial_number}>
              <input
                className={inp(errors.serial_number)}
                placeholder="SN-UBNT-AP-011-2024"
                value={form.serial_number}
                onChange={(e) => handleChange("serial_number", e.target.value)}
              />
            </Field>

            <Field label="Vendor" error={errors.vendor}>
              <input
                className={inp(errors.vendor)}
                placeholder="PT. Contoh Indonesia"
                value={form.vendor}
                onChange={(e) => handleChange("vendor", e.target.value)}
              />
            </Field>

            {/* Kondisi */}
            <Field label="Kondisi" required error={errors.condition_status}>
              <select
                className={inp(errors.condition_status)}
                value={form.condition_status}
                onChange={(e) => handleChange("condition_status", e.target.value)}
              >
                <option value="good">Good</option>
                <option value="damaged">Damaged</option>
                <option value="under_maintenance">Maintenance</option>
              </select>
            </Field>

            {/* Status */}
            <Field label="Status" required error={errors.status}>
              <select
                className={inp(errors.status)}
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                <option value="active">Aktif</option>
                <option value="borrowed">Dipinjam</option>
                <option value="disposed">Disposed</option>
              </select>
            </Field>

            <Field label="Harga Beli (Rp)" error={errors.purchase_price}>
              <input
                className={inp(errors.purchase_price)}
                type="number"
                placeholder="2200000"
                value={form.purchase_price}
                onChange={(e) => handleChange("purchase_price", e.target.value)}
              />
            </Field>

            <Field label="Tanggal Beli" error={errors.purchase_date}>
              <input
                className={inp(errors.purchase_date)}
                type="date"
                value={form.purchase_date}
                onChange={(e) => handleChange("purchase_date", e.target.value)}
              />
            </Field>

            <Field label="Garansi Sampai" error={errors.warranty_expired}>
              <input
                className={inp(errors.warranty_expired)}
                type="date"
                value={form.warranty_expired}
                onChange={(e) => handleChange("warranty_expired", e.target.value)}
              />
            </Field>

            <div className="col-span-2">
              <Field label="Catatan" error={errors.note}>
                <textarea
                  className={`${inp(errors.note)} resize-none`}
                  rows={3}
                  placeholder="Catatan tambahan tentang aset ini…"
                  value={form.note}
                  onChange={(e) => handleChange("note", e.target.value)}
                />
              </Field>
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {loading ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Simpan Aset"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Class input — merah kalau ada error
const inp = (error?: string) =>
  `w-full border ${error ? "border-red-400" : "border-gray-200"} rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition`;

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
    </div>
  );
}