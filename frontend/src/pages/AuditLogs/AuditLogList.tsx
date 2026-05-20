import { useEffect, useState } from "react";
import api from "../../api/axios";
import { Search, Plus, Pencil, Trash2, X, Check, ClipboardList } from "lucide-react";

interface Asset {
  id: number;
  asset_name: string;
  asset_code: string;
}

interface AuditLog {
  id: number;
  asset_id: number;
  action: string;
  description: string;
  pic: string;
  created_at: string;
  asset?: Asset;
}

interface AuditLogForm {
  asset_id: string;
  action: string;
  description: string;
  pic: string;
}

const emptyForm: AuditLogForm = {
  asset_id: "",
  action: "",
  description: "",
  pic: "",
};

const actionOptions = [
  { value: "check",    label: "Pengecekan" },
  { value: "replace",  label: "Penggantian" },
  { value: "repair",   label: "Perbaikan" },
  { value: "update",   label: "Pembaruan Data" },
  { value: "disposal", label: "Disposal / Penghapusan" },
  { value: "other",    label: "Lainnya" },
];

const actionColor: Record<string, string> = {
  check:    "text-blue-600 bg-blue-50",
  replace:  "text-orange-600 bg-orange-50",
  repair:   "text-yellow-600 bg-yellow-50",
  update:   "text-teal-600 bg-teal-50",
  disposal: "text-red-600 bg-red-50",
  other:    "text-gray-600 bg-gray-100",
};

export default function AuditLogList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // pagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AuditLog | null>(null);
  const [form, setForm] = useState<AuditLogForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AuditLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ================= FETCH =================
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/audit-logs?per_page=all");
      const data =
        res?.data?.data?.data ||
        res?.data?.data ||
        res?.data ||
        [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ERROR fetch audit-logs:", err);
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
    fetchLogs();
    fetchAssets();
  }, []);

  // ================= FILTER =================
  const filtered = logs.filter((l) => {
    const keyword = search.toLowerCase();
    return (
      (l.asset?.asset_name || "").toLowerCase().includes(keyword) ||
      (l.asset?.asset_code || "").toLowerCase().includes(keyword) ||
      (l.pic || "").toLowerCase().includes(keyword) ||
      (l.action || "").toLowerCase().includes(keyword) ||
      (l.description || "").toLowerCase().includes(keyword)
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

  const openEdit = (log: AuditLog) => {
    setEditTarget(log);
    setForm({
      asset_id: String(log.asset_id),
      action: log.action || "",
      description: log.description || "",
      pic: log.pic || "",
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
        action: form.action,
        description: form.description,
        pic: form.pic,
      };

      if (editTarget) {
        await api.put(`/audit-logs/${editTarget.id}`, payload);
      } else {
        await api.post("/audit-logs", payload);
      }

      await fetchLogs();
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
      await api.delete(`/audit-logs/${deleteTarget.id}`);
      await fetchLogs();
      setDeleteTarget(null);
    } catch (err) {
      console.error("ERROR delete:", err);
    } finally {
      setDeleting(false);
    }
  };

  // ================= FORMAT =================
  const formatDate = (val: string) => {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionLabel = (val: string) =>
    actionOptions.find((o) => o.value === val)?.label || val;

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* ================= SEARCH + ACTION ================= */}
      <div className="flex justify-end items-center gap-3 mb-5">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Cari audit log..."
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
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[60px]">
              NO
            </th>

            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[260px]">
              ASET
            </th>

            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[160px]">
              JENIS AKSI
            </th>

            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
              DESKRIPSI
            </th>

            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[140px]">
              PIC
            </th>

            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[180px]">
              WAKTU
            </th>

            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[160px]">
              AKSI
            </th>
          </tr>
        </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">Loading...</td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-300">Data audit log belum tersedia</td>
              </tr>
            ) : (
              paginatedData.map((log, idx) => (
                <tr key={log.id} className="hover:bg-blue-50/30 transition">
                  <td className="px-5 py-4 text-gray-400 text-xs">{startIndex + idx + 1}</td>

                  <td className="px-5 py-4">
                    {log.asset ? (
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{log.asset.asset_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{log.asset.asset_code}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-5 py-4 align-middle text-center">
                    <span
                      className={`inline-flex items-center justify-center min-w-[120px] text-xs px-2 py-1 rounded-full font-medium ${
                        actionColor[log.action] || "text-gray-600 bg-gray-100"
                      }`}
                    >
                      {getActionLabel(log.action)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-gray-500 text-xs max-w-xs">
                    <p className="line-clamp-2">{log.description || "-"}</p>
                  </td>

                  <td className="px-5 py-4 align-middle text-center">
                    <span className="inline-flex items-center justify-center min-w-[100px] text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                      {log.pic || "-"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-gray-400 text-xs whitespace-nowrap text-center">
                    {formatDate(log.created_at)}
                  </td>

                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(log)}
                        className="text-yellow-600 text-xs bg-yellow-50 hover:bg-yellow-100 px-3 py-1 rounded-full flex items-center gap-1 transition"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>

                      <button
                        onClick={() => setDeleteTarget(log)}
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

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-gray-800">
                  {editTarget ? "Edit Audit Log" : "Tambah Audit Log"}
                </h2>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

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

              {/* Jenis Aksi */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Jenis Aksi <span className="text-red-500">*</span>
                </label>
                <select
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                    errors.action ? "border-red-400" : "border-gray-200"
                  }`}
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                >
                  <option value="">-- Pilih Aksi --</option>
                  {actionOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {errors.action && <p className="text-red-500 text-xs mt-1">{errors.action}</p>}
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Deskripsi <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none ${
                    errors.description ? "border-red-400" : "border-gray-200"
                  }`}
                  placeholder="Jelaskan detail tindakan yang dilakukan..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>

              {/* PIC */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  PIC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                    errors.pic ? "border-red-400" : "border-gray-200"
                  }`}
                  placeholder="Nama penanggung jawab"
                  value={form.pic}
                  onChange={(e) => setForm({ ...form, pic: e.target.value })}
                />
                {errors.pic && <p className="text-red-500 text-xs mt-1">{errors.pic}</p>}
              </div>

            </div>

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

      {/* ================= MODAL DELETE ================= */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Hapus Audit Log?</h3>
              <p className="text-sm text-gray-500">
                Log audit aset{" "}
                <span className="font-medium text-gray-700">
                  "{deleteTarget.asset?.asset_name || `ID ${deleteTarget.asset_id}`}"
                </span>{" "}
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