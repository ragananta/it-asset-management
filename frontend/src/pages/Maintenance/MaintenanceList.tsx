import { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { Search, Plus, Pencil, Trash2, X, Check, Wrench } from "lucide-react";

interface Asset {
  id: number;
  asset_name: string;
  asset_code: string;
}

interface MaintenanceLog {
  id: number;
  asset_id: number;
  date: string;
  description: string;
  cost: number;
  pic: string;
  asset?: Asset;
}

interface MaintenanceForm {
  asset_id: string;
  date: string;
  description: string;
  cost: string;
  pic: string;
}

const emptyForm: MaintenanceForm = {
  asset_id: "",
  date: "",
  description: "",
  cost: "",
  pic: "",
};

export default function MaintenanceList() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // pagination
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MaintenanceLog | null>(null);
  const [form, setForm] = useState<MaintenanceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // delete
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  // assets sudah di-fetch ref (agar tidak re-fetch tiap page)
  const assetsFetched = useRef(false);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── SINGLE FETCH EFFECT ───────────────────────────────────────────────────
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

        // Fetch logs + assets (assets hanya sekali)
        const requests: [Promise<any>, Promise<any> | null] = [
          api.get(`/maintenance-logs?${params}`),
          !assetsFetched.current ? api.get("/assets?per_page=all") : null,
        ];

        const [logsRes, assetsRes] = await Promise.all(requests);
        if (cancelled) return;

        // Handle logs
        const payload = logsRes?.data?.data;
        if (payload?.data) {
          setLogs(payload.data);
          setTotalData(payload.total);
          setTotalPages(payload.last_page);
          setCurrentPage(payload.current_page);
        } else {
          const data = Array.isArray(payload) ? payload : [];
          setLogs(data);
          setTotalData(data.length);
          setTotalPages(1);
        }

        // Handle assets (hanya jika di-fetch)
        if (assetsRes) {
          assetsFetched.current = true;
          const data =
            assetsRes?.data?.data?.data ||
            assetsRes?.data?.data ||
            assetsRes?.data ||
            [];
          setAssets(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) console.error("ERROR fetch maintenance:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [currentPage, rowsPerPage, search]);

  const startIndex = (currentPage - 1) * rowsPerPage;

  // ── MODAL ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (log: MaintenanceLog) => {
    setEditTarget(log);
    setForm({
      asset_id: String(log.asset_id),
      date: log.date?.slice(0, 10) || "",
      description: log.description || "",
      cost: String(log.cost || ""),
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

  // ── SAVE ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});
      const payload = {
        ...form,
        asset_id: Number(form.asset_id),
        cost: Number(form.cost),
      };

      if (editTarget) {
        await api.put(`/maintenance-logs/${editTarget.id}`, payload);
      } else {
        await api.post("/maintenance-logs", payload);
        setCurrentPage(1);
      }

      closeModal();
      // Trigger re-fetch via useEffect
      setCurrentPage((p) => p);
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val)
            ? (val as string[])[0]
            : String(val);
        });
        setErrors(apiErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── DELETE ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/maintenance-logs/${deleteTarget.id}`);
      setDeleteTarget(null);
      // Kalau hapus item terakhir di halaman, mundur 1 page
      const newPage =
        logs.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
    } catch (err) {
      console.error("ERROR delete:", err);
    } finally {
      setDeleting(false);
    }
  };

  // ── FORMAT ───────────────────────────────────────────────────────────────
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (val: string) => {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* SEARCH + ACTION */}
      <div className="flex justify-end items-center gap-3 mb-5">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Cari maintenance..."
            className="w-full pl-9 pr-9 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setCurrentPage(1);
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-2.5 rounded-full text-sm font-medium shadow flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {/* ROW CONTROL */}
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-200 rounded-md px-2 py-1 text-gray-700 text-sm focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div>
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">
            {totalData === 0
              ? "0"
              : `${startIndex + 1}–${Math.min(startIndex + rowsPerPage, totalData)} of ${totalData}`}
          </span>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
          >
            ‹
          </button>
          <button
            disabled={currentPage === totalPages || totalData === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12">NO</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[240px]">Aset</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[130px]">Tanggal</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Deskripsi</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase w-[140px]">Biaya</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[140px]">PIC</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[160px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-300">
                  {search
                    ? "Tidak ada data yang cocok"
                    : "Data maintenance belum tersedia"}
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => (
                <tr key={log.id} className="hover:bg-blue-50/30 transition">
                  <td className="px-5 py-4 text-gray-400 text-xs">
                    {startIndex + idx + 1}
                  </td>
                  <td className="px-5 py-4">
                    {log.asset ? (
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {log.asset.asset_name}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {log.asset.asset_code}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs whitespace-nowrap">
                    {formatDate(log.date)}
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs">
                    <p className="line-clamp-2 leading-relaxed">
                      {log.description || "-"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-gray-700 text-sm font-medium whitespace-nowrap text-right">
                    {log.cost ? formatCurrency(log.cost) : "-"}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[90px] text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                      {log.pic || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(log)}
                        className="text-yellow-600 text-xs bg-yellow-50 hover:bg-yellow-100 px-3 py-1 rounded-full flex items-center gap-1 transition"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(log)}
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
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-gray-800">
                  {editTarget ? "Edit Maintenance" : "Tambah Maintenance"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Asset */}
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
                {errors.asset_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.asset_id}</p>
                )}
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                    errors.date ? "border-red-400" : "border-gray-200"
                  }`}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                {errors.date && (
                  <p className="text-red-500 text-xs mt-1">{errors.date}</p>
                )}
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
                  placeholder="Jelaskan kerusakan atau tindakan maintenance..."
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Biaya + PIC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Biaya (Rp)
                  </label>
                  <input
                    type="number"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                      errors.cost ? "border-red-400" : "border-gray-200"
                    }`}
                    placeholder="0"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  />
                  {errors.cost && (
                    <p className="text-red-500 text-xs mt-1">{errors.cost}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    PIC / Teknisi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                      errors.pic ? "border-red-400" : "border-gray-200"
                    }`}
                    placeholder="Nama teknisi"
                    value={form.pic}
                    onChange={(e) => setForm({ ...form, pic: e.target.value })}
                  />
                  {errors.pic && (
                    <p className="text-red-500 text-xs mt-1">{errors.pic}</p>
                  )}
                </div>
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

      {/* MODAL DELETE */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">
                Hapus Log Maintenance?
              </h3>
              <p className="text-sm text-gray-500">
                Data maintenance aset{" "}
                <span className="font-medium text-gray-700">
                  "
                  {deleteTarget.asset?.asset_name ||
                    `ID ${deleteTarget.asset_id}`}
                  "
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