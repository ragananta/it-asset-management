import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { Check, Loader2, Package, X, Plus, Pencil, Save } from "lucide-react";
import { DatePicker } from "./ui/date-picker";

const toDateInput = (val?: string | null): string => {
  if (!val) return "";
  return val.slice(0, 10);
};

const inputClass = (error?: string, readonly = false) =>
  `w-full h-12 border ${
    error ? "border-red-400" : "border-gray-200"
  } rounded-lg px-3 text-sm text-gray-800 focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 transition ${
    readonly ? "bg-gray-100 cursor-not-allowed text-gray-500" : "bg-white"
  }`;

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface Category {
  id: number;
  name: string;
  code: string;
}

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
  asset_code: "",
  asset_name: "",
  category_id: "",
  user_name: "",
  brand: "",
  model: "",
  serial_number: "",
  purchase_date: "",
  purchase_price: "",
  warranty_expired: "",
  condition_status: "good",
  status: "active",
  note: "",
};

export default function AssetModal({
  open,
  onClose,
  onSuccess,
  editAsset,
  categories,
}: AssetModalProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatingCode, setGeneratingCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const categorySelectRef = useRef<HTMLSelectElement>(null);

  const isEdit = !!editAsset;
  const selectedCategory = categories.find((c) => String(c.id) === form.category_id);

  useEffect(() => {
    if (!open) return;

    if (isEdit && editAsset) {
      setForm({
        asset_code: editAsset.asset_code || "",
        asset_name: editAsset.asset_name || "",
        category_id: editAsset.category_id ? String(editAsset.category_id) : "",
        user_name: editAsset.assigned_user?.name || "",
        brand: editAsset.brand || "",
        model: editAsset.model || "",
        serial_number: editAsset.serial_number || "",
        purchase_date: toDateInput(editAsset.purchase_date),
        purchase_price: editAsset.purchase_price != null ? String(editAsset.purchase_price) : "",
        warranty_expired: toDateInput(editAsset.warranty_expired),
        condition_status: editAsset.condition_status || "good",
        status: editAsset.status || "active",
        note: editAsset.note || "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }

    setErrors({});
    setGeneratingCode(false);
    setSaving(false);
    setModalClosing(false);
  }, [open, editAsset, isEdit]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => categorySelectRef.current?.focus(), 80);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) requestClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving]);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const fetchGenerateCode = async (categoryId: string) => {
    if (!categoryId) {
      set("asset_code", "");
      return;
    }

    try {
      setGeneratingCode(true);
      const res = await api.get(`/assets/generate-code/${categoryId}`, { noCache: true } as any);
      set("asset_code", res?.data?.code || "");
    } catch (err: any) {
      set("asset_code", "");
      setErrors((prev) => ({
        ...prev,
        asset_code: err?.response?.data?.message || "Gagal membuat kode aset",
      }));
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    setForm((prev) => ({ ...prev, category_id: categoryId, asset_code: "" }));
    setErrors((prev) => ({ ...prev, category_id: "", category_name: "", asset_code: "" }));

    if (!isEdit) {
      await fetchGenerateCode(categoryId);
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.category_id) nextErrors.category_id = "Kategori wajib dipilih";
    if (!form.asset_code) nextErrors.asset_code = "Kode aset belum dibuat";
    if (!form.asset_name.trim()) nextErrors.asset_name = "Nama aset wajib diisi";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    asset_code: form.asset_code,
    asset_name: form.asset_name,
    category_id: Number(form.category_id),
    user_name: form.user_name || null,
    brand: form.brand || null,
    model: form.model || null,
    serial_number: form.serial_number || null,
    purchase_date: form.purchase_date || null,
    purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
    warranty_expired: form.warranty_expired || null,
    condition_status: form.condition_status || null,
    status: form.status || null,
    note: form.note || null,
  });

  const submitAsset = async () => {
    if (!validateForm() || generatingCode) return;

    try {
      setSaving(true);
      setErrors({});

      const payload = buildPayload();
      const res = isEdit && editAsset
        ? await api.put(`/assets/${editAsset.id}`, payload)
        : await api.post("/assets", payload);

      const savedAsset = res?.data?.data;

      onSuccess(savedAsset || {
        ...editAsset,
        ...payload,
        id: editAsset?.id || 0,
        category: selectedCategory
          ? { id: Number(form.category_id), name: selectedCategory.name }
          : editAsset?.category,
      });
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val);
        });
        setErrors(apiErrors);
      } else {
        setErrors({
          form: err?.response?.data?.message || "Gagal menyimpan aset",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (saving || modalClosing) return;
    setModalClosing(true);
    window.setTimeout(() => {
      setModalClosing(false);
      onClose();
    }, 200);
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6 transition-opacity duration-200 ${modalClosing ? "opacity-0" : "opacity-100"}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <style>{`
        @keyframes assetModalIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes assetModalOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.95); }
        }
      `}</style>
      <div
        className="flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_rgba(0,0,0,0.15)]"
        style={{ animation: `${modalClosing ? "assetModalOut" : "assetModalIn"} 200ms ease-out forwards` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#eef2f7] bg-white px-7 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              {isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <h2 id="asset-modal-title" className="text-lg font-semibold leading-tight text-gray-900">
              {isEdit ? "Edit Data" : "Tambah Data"}
            </h2>
          </div>
          <button
            onClick={requestClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-6 bg-slate-50/20">
          {errors.form && (
            <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errors.form}
            </div>
          )}

          {/* Inner Card Container */}
          <div className="border border-slate-100 rounded-2xl p-4 sm:p-6 bg-white shadow-sm">
            {/* Card Section Header */}
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <Package className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-slate-800 text-sm">
                {isEdit ? `Edit Detail Aset (${editAsset?.asset_code})` : "Tambah Aset Baru"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Kategori" required error={errors.category_id || errors.category_name}>
                <select
                  ref={categorySelectRef}
                  className={inputClass(errors.category_id || errors.category_name)}
                  value={form.category_id}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Pilih kategori terlebih dahulu</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Kode Aset"
                required
                error={errors.asset_code}
                hint="Kode aset dibuat otomatis berdasarkan kategori yang dipilih."
              >
                <div className="relative">
                  <input
                    className={`${inputClass(errors.asset_code, true)} pr-10`}
                    value={
                      generatingCode
                        ? "Membuat kode aset..."
                        : form.asset_code || "Pilih kategori terlebih dahulu"
                    }
                    readOnly
                    disabled
                  />
                  {generatingCode && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
                  )}
                </div>
              </Field>

              <Field label="Nama Aset" required error={errors.asset_name}>
                <input
                  className={inputClass(errors.asset_name)}
                  placeholder="Contoh: Laptop Dell Latitude 5420"
                  value={form.asset_name}
                  onChange={(e) => set("asset_name", e.target.value)}
                />
              </Field>

              <Field label="Nama Pengguna" error={errors.user_name}>
                <input
                  className={inputClass(errors.user_name)}
                  placeholder="Nama user pemegang aset (opsional)"
                  value={form.user_name}
                  onChange={(e) => set("user_name", e.target.value)}
                />
              </Field>

              <Field label="Brand" error={errors.brand}>
                <input
                  className={inputClass(errors.brand)}
                  placeholder="Contoh: Dell, HP, Cisco"
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                />
              </Field>

              <Field label="Model" error={errors.model}>
                <input
                  className={inputClass(errors.model)}
                  placeholder="Contoh: Latitude 5420"
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                />
              </Field>

              <Field label="Serial Number" error={errors.serial_number}>
                <input
                  className={inputClass(errors.serial_number)}
                  placeholder="Masukkan serial number aset"
                  value={form.serial_number}
                  onChange={(e) => set("serial_number", e.target.value)}
                />
              </Field>

              <Field label="Harga Beli (Rp)" error={errors.purchase_price}>
                <input
                  className={inputClass(errors.purchase_price)}
                  type="number"
                  placeholder="Contoh: 15000000"
                  value={form.purchase_price}
                  onChange={(e) => set("purchase_price", e.target.value)}
                />
              </Field>

              <Field label="Tanggal Beli" error={errors.purchase_date}>
                <DatePicker
                  value={form.purchase_date}
                  onChange={(val) => set("purchase_date", val)}
                  error={!!errors.purchase_date}
                />
              </Field>

              <Field label="Garansi Sampai" error={errors.warranty_expired}>
                <DatePicker
                  value={form.warranty_expired}
                  onChange={(val) => set("warranty_expired", val)}
                  error={!!errors.warranty_expired}
                />
              </Field>

              <Field label="Kondisi" required error={errors.condition_status}>
                <select
                  className={inputClass(errors.condition_status)}
                  value={form.condition_status}
                  onChange={(e) => set("condition_status", e.target.value)}
                >
                  <option value="good">Good</option>
                  <option value="damaged">Damaged</option>
                  <option value="under_maintenance">Maintenance</option>
                </select>
              </Field>

              <Field label="Status" required error={errors.status}>
                <select
                  className={inputClass(errors.status)}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="active">Aktif</option>
                  <option value="borrowed">Dipinjam</option>
                  <option value="disposed">Disposed</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Catatan" error={errors.note}>
                  <textarea
                    className={`${inputClass(errors.note)} min-h-[100px] resize-y py-3`}
                    placeholder="Catatan tambahan tentang aset ini..."
                    value={form.note}
                    onChange={(e) => set("note", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-100 bg-white px-7 py-4 shrink-0">
          <button
            onClick={requestClose}
            disabled={saving}
            className="h-10 px-6 rounded-full bg-red-500 hover:bg-red-650 text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm"
          >
            Batal
          </button>
          <button
            onClick={submitAsset}
            disabled={saving || generatingCode || !form.category_id || !form.asset_code}
            className="flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
