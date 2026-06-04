import { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { Search, Plus, Pencil, Trash2, X, Check, Tag } from "lucide-react";
import { usePolling } from "../../hooks/usePolling";
import TablePagination from "../../components/pagination/TablePagination";
import { useRowsPerPage } from "../../hooks/useRowsPerPage";

interface Category {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  deleted_at?: string | null;
}

interface CategoryForm {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

const emptyForm: CategoryForm = { name: "", code: "", description: "", is_active: true };

const squish = (value: string) => value.trim().replace(/\s+/g, " ");
const normalizeName = (value: string) =>
  squish(value).toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
const normalizeCode = (value: string) => squish(value).toUpperCase();
const comparable = (value: string) => squish(value).toLowerCase();

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Auto refresh setiap 30 detik ──────────────────────────────────────────
  usePolling(triggerRefresh, 30000, !modalOpen && !deleteTarget);

  // ── Debounce search ───────────────────────────────────────────────────────
  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 400);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(rowsPerPage),
          simple: "1",
        });
        if (search) params.append("search", search);

        const res = await api.get(`/categories?${params}`);
        if (cancelled) return;

        const payload = res?.data?.data;
        if (payload?.data) {
          setCategories(payload.data);
          const fallbackTotal = currentPage * rowsPerPage + (payload.next_page_url ? rowsPerPage : 0);
          setTotalData(payload.total ?? fallbackTotal);
          setTotalPages(payload.last_page ?? (payload.next_page_url ? currentPage + 1 : currentPage));
        } else {
          const data = Array.isArray(payload) ? payload : [];
          setCategories(data);
          setTotalData(data.length);
          setTotalPages(1);
        }
      } catch (err) {
        if (!cancelled) console.error("ERROR fetch categories:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [currentPage, rowsPerPage, search, refreshKey]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const duplicateSource = allCategories.length > 0 ? allCategories : categories;
  const duplicateName = form.name.trim()
    ? duplicateSource.find((cat) =>
        cat.id !== editTarget?.id && comparable(cat.name) === comparable(form.name)
      )
    : null;
  const duplicateCode = form.code.trim()
    ? duplicateSource.find((cat) =>
        cat.id !== editTarget?.id && comparable(cat.code) === comparable(form.code)
      )
    : null;
  const nameError = duplicateName ? "Nama kategori sudah digunakan." : errors.name;
  const codeError = duplicateCode ? "Kode kategori sudah digunakan." : errors.code;
  const isFormValid = Boolean(form.name.trim() && form.code.trim() && !duplicateName && !duplicateCode);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => nameInputRef.current?.focus(), 80);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestCloseModal();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;

    let cancelled = false;
    api.get("/categories?per_page=500")
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data?.data;
        setAllCategories(payload?.data || (Array.isArray(payload) ? payload : categories));
      })
      .catch(() => {
        if (!cancelled) setAllCategories(categories);
      });

    return () => { cancelled = true; };
  }, [modalOpen, categories]);

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setModalClosing(false);
    setEditTarget(null); setForm(emptyForm); setErrors({}); setModalOpen(true);
  };
  const openEdit = (cat: Category) => {
    setModalClosing(false);
    setEditTarget(cat);
    setForm({ name: cat.name, code: cat.code, description: cat.description || "", is_active: cat.is_active });
    setErrors({});
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false); setEditTarget(null); setForm(emptyForm); setErrors({}); setModalClosing(false); setAllCategories([]);
  };
  const requestCloseModal = () => {
    if (modalClosing) return;
    setModalClosing(true);
    window.setTimeout(() => closeModal(), 200);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const normalizedForm = {
      ...form,
      name: normalizeName(form.name),
      code: normalizeCode(form.code),
      description: form.description.trim(),
    };

    const nextErrors: Record<string, string> = {};
    if (!normalizedForm.name) nextErrors.name = "Nama kategori wajib diisi.";
    if (!normalizedForm.code) nextErrors.code = "Kode kategori wajib diisi.";
    if (duplicateName) nextErrors.name = "Nama kategori sudah digunakan.";
    if (duplicateCode) nextErrors.code = "Kode kategori sudah digunakan.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setToast(nextErrors.name || nextErrors.code || "Form kategori belum valid.");
      return;
    }

    try {
      setErrors({});

      if (editTarget) {
        const optimistic: Category = { ...editTarget, ...normalizedForm };
        setCategories((prev) =>
          prev.map((item) => (item.id === editTarget.id ? { ...item, ...optimistic } : item))
        );
        closeModal(); // tutup modal langsung

        api.put(`/categories/${editTarget.id}`, normalizedForm).catch((err) => {
          triggerRefresh(); // rollback dengan refetch
          const message = err?.response?.data?.errors?.name?.[0]
            || err?.response?.data?.errors?.code?.[0]
            || err?.response?.data?.message
            || "Gagal menyimpan perubahan";
          setToast(message);
        });

      } else {
        closeModal(); // tutup modal langsung

        api.post("/categories", normalizedForm)
          .then(() => { setCurrentPage(1); triggerRefresh(); })
          .catch((err) => {
            const message = err?.response?.data?.errors?.name?.[0]
              || err?.response?.data?.errors?.code?.[0]
              || err?.response?.data?.message
              || "Gagal menyimpan kategori";
            setToast(message);
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

  // ── Delete (soft delete) — optimistic update ──────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;

    const prevCategories = categories;
    const prevTotal = totalData;

    const updated = categories.filter((item) => item.id !== deleteTarget.id);
    setCategories(updated);
    setTotalData((t) => t - 1);
    const newPage = updated.length === 0 && currentPage > 1 ? currentPage - 1 : currentPage;
    setCurrentPage(newPage);
    setDeleteTarget(null); // tutup modal langsung

    api.delete(`/categories/${deleteTarget.id}`).catch((err) => {
      setCategories(prevCategories);
      setTotalData(prevTotal);
      alert(err?.response?.data?.message || "Gagal menghapus kategori");
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className="fixed right-6 top-6 z-[60] rounded-xl border border-red-100 bg-white px-4 py-3 text-sm font-medium text-red-600 shadow-lg">
          {toast}
        </div>
      )}

      {/* SEARCH + ACTION */}
      <div className="flex justify-end items-center gap-3 mb-5">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Cari kategori..."
            className="w-full pl-9 pr-9 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => { setSearchInput(""); setSearch(""); setCurrentPage(1); }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-2.5 rounded-full text-sm font-medium shadow flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {/* ROW CONTROL */}
      <TablePagination
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        totalData={totalData}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12">NO</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[120px]">Kode</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[220px]">Nama Kategori</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Deskripsi</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[120px]">Status</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[180px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="py-16 text-center text-gray-400">Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center text-gray-300">
                {search ? "Tidak ada kategori yang cocok" : "Data kategori belum tersedia"}
              </td></tr>
            ) : (
              categories.map((cat, idx) => (
                <tr key={cat.id} className="hover:bg-blue-50/30 transition">
                  <td className="px-5 py-4 text-gray-400 text-xs">{startIndex + idx + 1}</td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-700">{cat.code || "-"}</td>
                  <td className="px-5 py-4 font-medium text-gray-800">{cat.name}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{cat.description || "-"}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[70px] text-xs px-2 py-1 rounded-full font-medium ${
                      cat.is_active ? "text-teal-700 bg-teal-50" : "text-gray-500 bg-gray-100"
                    }`}>
                      {cat.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-yellow-600 text-xs bg-yellow-50 hover:bg-yellow-100 px-3 py-1 rounded-full flex items-center gap-1 transition"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="text-red-500 text-xs bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREATE/EDIT */}
      {modalOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-6 transition-opacity duration-200 ${modalClosing ? "opacity-0" : "opacity-100"}`}
          style={{
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) requestCloseModal();
          }}
        >
          <style>{`
            @keyframes categoryModalIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes categoryModalOut {
              from { opacity: 1; transform: scale(1); }
              to { opacity: 0; transform: scale(0.95); }
            }
          `}</style>
          <div
            className="bg-white w-full max-w-[620px] max-h-[90vh] rounded-[20px] shadow-[0_25px_50px_rgba(0,0,0,.15)] overflow-hidden"
            style={{ animation: `${modalClosing ? "categoryModalOut" : "categoryModalIn"} 200ms ease-out forwards` }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <div className="flex items-center justify-between px-7 py-6 border-b border-[#eef2f7] bg-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="category-modal-title" className="font-semibold text-lg text-gray-900 leading-tight">
                    {editTarget ? "Edit Kategori" : "Tambah Kategori"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editTarget ? "Perbarui nama, kode, dan status kategori" : "Tambahkan kategori aset baru"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestCloseModal}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-7 py-6 overflow-y-auto max-h-[calc(90vh-181px)]">
              <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Kategori <span className="text-red-500">*</span></label>
                <input
                  ref={nameInputRef}
                  className={`w-full h-12 border rounded-[10px] px-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 ${nameError ? "border-red-400" : "border-[#dbe2ea]"}`}
                  placeholder="contoh: Laptop"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((prev) => ({ ...prev, name: "" })); }}
                  onBlur={() => setForm((prev) => ({ ...prev, name: normalizeName(prev.name) }))}
                />
                {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kode <span className="text-red-500">*</span></label>
                <input
                  className={`w-full h-12 border rounded-[10px] px-3 text-sm uppercase focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 ${codeError ? "border-red-400" : "border-[#dbe2ea]"}`}
                  placeholder="contoh: CAT-LPT"
                  value={form.code}
                  onChange={(e) => { setForm({ ...form, code: e.target.value.toUpperCase() }); setErrors((prev) => ({ ...prev, code: "" })); }}
                  onBlur={() => setForm((prev) => ({ ...prev, code: normalizeCode(prev.code) }))}
                />
                {codeError && <p className="text-red-500 text-xs mt-1">{codeError}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                <textarea
                  className="w-full min-h-[120px] border border-[#dbe2ea] rounded-[10px] px-3 py-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 resize-y"
                  placeholder="Deskripsi singkat kategori..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600">Status Aktif</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? "bg-teal-500" : "bg-gray-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <span className="text-xs text-gray-500">{form.is_active ? "Aktif" : "Nonaktif"}</span>
              </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-7 py-5 border-t border-[#eef2f7] flex justify-end gap-3">
              <button onClick={requestCloseModal} className="h-11 px-5 text-sm font-medium text-gray-700 bg-[#f8fafc] hover:bg-[#e2e8f0] rounded-[10px] transition">Batal</button>
              <button
                onClick={handleSave}
                disabled={!isFormValid}
                className="h-11 px-5 text-sm font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-[10px] transition flex items-center gap-2 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Hapus Kategori?</h3>
              <p className="text-sm text-gray-500">
                Apakah anda yakin ingin menghapus Kategori<span className="font-medium text-gray-700">"{deleteTarget.name}"</span>?
              </p>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >Batal</button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
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
