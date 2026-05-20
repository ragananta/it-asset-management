import { useEffect, useState } from "react";
import api from "../../api/axios";
import { Search, Plus, Pencil, Trash2, X, Check, UserCheck } from "lucide-react";

interface Asset {
  id: number;
  asset_name: string;
  asset_code: string;
}

interface Assignment {
  id: number;
  asset_id: number;
  user_name: string;
  assign_date: string;
  return_date: string | null;
  note?: string;
  asset?: Asset;
}

interface AssignmentForm {
  asset_id: string;
  user_name: string;
  assign_date: string;
  return_date: string;
  note: string;
}

const emptyForm: AssignmentForm = {
  asset_id: "",
  user_name: "",
  assign_date: "",
  return_date: "",
  note: "",
};

export default function AssignmentList() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // pagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ================= FETCH =================
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/asset-assignments?per_page=all");
      const data =
        res?.data?.data?.data ||
        res?.data?.data ||
        res?.data ||
        [];
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ERROR fetch assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await api.get("/assets?per_page=all");
      const data =
        res?.data?.data?.data ||
        res?.data?.data ||
        res?.data ||
        [];
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ERROR fetch assets:", err);
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchAssets();
  }, []);

  // ================= FILTER =================
  const filtered = assignments.filter((a) => {
    const keyword = search.toLowerCase();
    return (
      (a.user_name || "").toLowerCase().includes(keyword) ||
      (a.asset?.asset_name || "").toLowerCase().includes(keyword) ||
      (a.asset?.asset_code || "").toLowerCase().includes(keyword)
    );
  });

  // ================= PAGINATION =================
  const totalData = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalData / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalData);
  const paginatedData = filtered.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

  // ================= MODAL =================
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item: Assignment) => {
    setEditTarget(item);
    setForm({
      asset_id: String(item.asset_id),
      user_name: item.user_name || "",
      assign_date: item.assign_date?.slice(0, 10) || "",
      return_date: item.return_date?.slice(0, 10) || "",
      note: item.note || "",
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setForm(emptyForm);
    setErrors({});
  };

  // ================= SAVE =================
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      const payload = {
        asset_id: Number(form.asset_id),
        user_name: form.user_name,
        assign_date: form.assign_date,
        return_date: form.return_date || null,
        note: form.note || null,
      };

      if (editTarget) {
        await api.put(`/asset-assignments/${editTarget.id}`, payload);
      } else {
        await api.post("/asset-assignments", payload);
      }

      await fetchAssignments();
      closeModal();
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val);
        });
        setErrors(apiErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  // ================= DELETE =================
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/asset-assignments/${deleteTarget.id}`);
      await fetchAssignments();
      setDeleteTarget(null);
    } catch (err) {
      console.error("ERROR delete:", err);
    } finally {
      setDeleting(false);
    }
  };

  // ================= FORMAT =================
  const formatDate = (val: string | null) => {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isActive = (item: Assignment) => !item.return_date;

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* ================= SEARCH + ACTION ================= */}
      <div className="flex justify-end items-center gap-3 mb-5">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Cari peminjaman..."
            className="w-full pl-9 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-2.5 rounded-full text-sm font-medium shadow flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {/* ================= ROW CONTROL ================= */}
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
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
        <div>Page {currentPage} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">
            {totalData === 0 ? "0" : `${startIndex + 1}–${endIndex} of ${totalData}`}
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

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12">NO</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[240px]">
                Aset
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[200px]">
                Dipinjam Oleh
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[120px]">
                Tgl Pinjam
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[120px]">
                Tgl Kembali
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[140px]">
                Status
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Catatan
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[180px]">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400">Loading...</td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-300">Data peminjaman belum tersedia</td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition">
                  <td className="px-5 py-4 text-gray-400 text-xs">{startIndex + idx + 1}</td>

                  <td className="px-5 py-4">
                    {item.asset ? (
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{item.asset.asset_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{item.asset.asset_code}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold uppercase">
                        {(item.user_name || "?").charAt(0)}
                      </div>
                      <span className="text-gray-700 text-sm">{item.user_name || "-"}</span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-gray-600 text-xs whitespace-nowrap text-center">
                    {formatDate(item.assign_date)}
                  </td>

                  <td className="px-5 py-4 text-gray-600 text-xs whitespace-nowrap text-center">
                    {formatDate(item.return_date)}
                  </td>

                  <td className="px-5 py-4 align-middle text-center">
                    <span
                      className={`inline-flex items-center justify-center min-w-[110px] text-xs px-2 py-1 rounded-full font-medium ${
                        isActive(item)
                          ? "text-blue-700 bg-blue-50"
                          : "text-gray-500 bg-gray-100"
                      }`}
                    >
                      {isActive(item) ? "Dipinjam" : "Dikembalikan"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-gray-500 text-xs max-w-[280px]">
                    <p className="line-clamp-2 leading-relaxed">
                      {item.note || "-"}
                    </p>
                  </td>

                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-yellow-600 text-xs bg-yellow-50 hover:bg-yellow-100 px-3 py-1 rounded-full flex items-center gap-1 transition"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>

                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="text-red-500 text-xs bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL CREATE/EDIT ================= */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-gray-800">
                  {editTarget ? "Edit Peminjaman" : "Tambah Peminjaman"}
                </h2>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">

              {/* Aset */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Aset <span className="text-red-500">*</span>
                </label>
                <select
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                    errors.asset_id ? "border-red-400" : "border-gray-200"
                  }`}
                  value={form.asset_id}
                  onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                >
                  <option value="">-- Pilih Aset --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_code} — {a.asset_name}
                    </option>
                  ))}
                </select>
                {errors.asset_id && <p className="text-red-500 text-xs mt-1">{errors.asset_id}</p>}
              </div>

              {/* Nama Peminjam */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nama Peminjam <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                    errors.user_name ? "border-red-400" : "border-gray-200"
                  }`}
                  placeholder="contoh: Doni Marketing"
                  value={form.user_name}
                  onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                />
                {errors.user_name && <p className="text-red-500 text-xs mt-1">{errors.user_name}</p>}
              </div>

              {/* Tanggal Pinjam & Kembali */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tgl Pinjam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                      errors.assign_date ? "border-red-400" : "border-gray-200"
                    }`}
                    value={form.assign_date}
                    onChange={(e) => setForm({ ...form, assign_date: e.target.value })}
                  />
                  {errors.assign_date && <p className="text-red-500 text-xs mt-1">{errors.assign_date}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tgl Kembali
                    <span className="text-gray-400 font-normal ml-1">(opsional)</span>
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                    value={form.return_date}
                    onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Catatan
                  <span className="text-gray-400 font-normal ml-1">(opsional)</span>
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                  placeholder="Keterangan tambahan..."
                  rows={3}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL DELETE CONFIRM ================= */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Hapus Peminjaman?</h3>
              <p className="text-sm text-gray-500">
                Data peminjaman oleh{" "}
                <span className="font-medium text-gray-700">"{deleteTarget.user_name}"</span>{" "}
                akan dihapus permanen.
              </p>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition disabled:opacity-50"
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