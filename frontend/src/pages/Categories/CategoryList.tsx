import { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { Search, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { usePolling } from "../../hooks/usePolling";

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

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        });
        if (search) params.append("search", search);

        const res = await api.get(`/categories?${params}`);
        if (cancelled) return;

        const payload = res?.data?.data;
        if (payload?.data) {
          setCategories(payload.data);
          setTotalData(payload.total);
          setTotalPages(payload.last_page);
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

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setErrors({}); setModalOpen(true); };
  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setForm({ name: cat.name, code: cat.code, description: cat.description || "", is_active: cat.is_active });
    setErrors({});
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); setForm(emptyForm); setErrors({}); };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setErrors({});

      if (editTarget) {
        const optimistic: Category = { ...editTarget, ...form };
        setCategories((prev) =>
          prev.map((item) => (item.id === editTarget.id ? { ...item, ...optimistic } : item))
        );
        closeModal(); // tutup modal langsung

        api.put(`/categories/${editTarget.id}`, form).catch((err) => {
          triggerRefresh(); // rollback dengan refetch
          alert(err?.response?.data?.message || "Gagal menyimpan perubahan");
        });

      } else {
        closeModal(); // tutup modal langsung

        api.post("/categories", form)
          .then(() => { setCurrentPage(1); triggerRefresh(); })
          .catch((err) => {
            alert(err?.response?.data?.message || "Gagal menyimpan kategori");
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
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-gray-200 rounded-md px-2 py-1 text-gray-700 text-sm focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-gray-400 text-sm">
            {totalData === 0 ? "0" : `${startIndex + 1}–${Math.min(startIndex + rowsPerPage, totalData)} of ${totalData}`}
          </span>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
          >‹</button>
          <button
            disabled={currentPage === totalPages || totalData === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
          >›</button>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{editTarget ? "Edit Kategori" : "Tambah Kategori"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Kategori <span className="text-red-500">*</span></label>
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.name ? "border-red-400" : "border-gray-200"}`}
                  placeholder="contoh: Laptop"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kode <span className="text-red-500">*</span></label>
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.code ? "border-red-400" : "border-gray-200"}`}
                  placeholder="contoh: CAT-LPT"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
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
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Batal</button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2"
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