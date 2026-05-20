import { useEffect, useState } from "react";
import api from "../../api/axios";
import { Search, ActivitySquare, Monitor, Globe } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
}

interface ActivityLog {
  id: number;
  user_id: number;
  activity: string;
  description: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user?: User;
}

// ================= CONFIG =================
const activityLabel: Record<string, string> = {
  login:       "Login",
  logout:      "Logout",
  register:    "Register",
  create_data: "Tambah Data",
  update_data: "Ubah Data",
  delete_data: "Hapus Data",
};

const activityColor: Record<string, string> = {
  login:       "text-teal-700 bg-teal-50",
  logout:      "text-gray-600 bg-gray-100",
  register:    "text-blue-700 bg-blue-50",
  create_data: "text-green-700 bg-green-50",
  update_data: "text-yellow-700 bg-yellow-50",
  delete_data: "text-red-700 bg-red-50",
};

const activityIcon: Record<string, string> = {
  login:       "→",
  logout:      "←",
  register:    "✦",
  create_data: "+",
  update_data: "✎",
  delete_data: "✕",
};

export default function ActivityLogList() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // pagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // detail modal
  const [detailLog, setDetailLog] = useState<ActivityLog | null>(null);

  // ================= FETCH =================
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/logs?per_page=all");
      const data =
        res?.data?.data?.data ||
        res?.data?.data ||
        res?.data ||
        [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ERROR fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // ================= FILTER =================
  const filtered = logs.filter((l) => {
    const keyword = search.toLowerCase();
    return (
      (l.user?.name || "").toLowerCase().includes(keyword) ||
      (l.user?.email || "").toLowerCase().includes(keyword) ||
      (l.activity || "").toLowerCase().includes(keyword) ||
      (l.description || "").toLowerCase().includes(keyword) ||
      (l.ip_address || "").toLowerCase().includes(keyword)
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

  const getLabel = (val: string) =>
    activityLabel[val] || val;

  const getBrowser = (ua: string) => {
    if (!ua) return "-";
    if (ua.includes("PostmanRuntime")) return "Postman";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Browser lain";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* ================= HEADER INFO ================= */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <ActivitySquare className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-xs text-gray-400">Dicatat otomatis oleh sistem · Read only</p>
        </div>
      </div>

      {/* ================= SEARCH ================= */}
      <div className="flex justify-end items-center gap-3 mb-5">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Cari user, aktivitas, IP..."
            className="w-full pl-9 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
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
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12">
                NO
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-[240px]">
                USER
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[160px]">
                AKTIVITAS
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                DESKRIPSI
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[140px]">
                IP ADDRESS
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[140px]">
                BROWSER
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[180px]">
                WAKTU
              </th>

              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-[120px]">
                DETAIL
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
                <td colSpan={8} className="py-16 text-center text-gray-300">Data aktivitas belum tersedia</td>
              </tr>
            ) : (
              paginatedData.map((log, idx) => (
                <tr key={log.id} className="hover:bg-blue-50/30 transition">
                  <td className="px-5 py-4 text-gray-400 text-xs">{startIndex + idx + 1}</td>

                  {/* User */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold uppercase">
                        {(log.user?.name || "?").charAt(0)}
                      </div>
                      <div>
                        <p className="text-gray-800 text-sm font-medium">{log.user?.name || "-"}</p>
                        <p className="text-gray-400 text-xs">{log.user?.email || "-"}</p>
                      </div>
                    </div>
                  </td>

                  {/* Aktivitas */}
                  <td className="px-5 py-4 align-middle text-center">
                    <span
                      className={`inline-flex items-center justify-center min-w-[120px] text-xs px-2 py-1 rounded-full font-medium ${
                        activityColor[log.activity] || "text-gray-600 bg-gray-100"
                      }`}
                    >
                      <span className="mr-1">{activityIcon[log.activity] || "•"}</span>
                      {getLabel(log.activity)}
                    </span>
                  </td>

                  {/* Deskripsi */}
                  <td className="px-5 py-4 text-gray-500 text-xs max-w-xs">
                    <p className="line-clamp-2">{log.description || "-"}</p>
                  </td>

                  {/* IP */}
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <Globe className="w-3 h-3 text-gray-400" />
                      {log.ip_address || "-"}
                    </div>
                  </td>

                  {/* Browser */}
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <Monitor className="w-3 h-3 text-gray-400" />
                      {getBrowser(log.user_agent)}
                    </div>
                  </td>

                  {/* Waktu */}
                  <td className="px-5 py-4 text-gray-400 text-xs whitespace-nowrap text-center">
                    {formatDate(log.created_at)}
                  </td>

                  {/* Detail */}
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => setDetailLog(log)}
                        className="text-indigo-600 text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full transition"
                      >
                        Lihat
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL DETAIL ================= */}
      {detailLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ActivitySquare className="w-4 h-4 text-indigo-500" />
                <h2 className="font-semibold text-gray-800">Detail Aktivitas</h2>
              </div>
              <button
                onClick={() => setDetailLog(null)}
                className="text-gray-400 hover:text-gray-600 transition text-lg leading-none"
              >✕</button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">

              {/* User */}
              <div className="flex items-center gap-3 bg-indigo-50 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-sm font-bold uppercase">
                  {(detailLog.user?.name || "?").charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{detailLog.user?.name || "-"}</p>
                  <p className="text-xs text-gray-500">{detailLog.user?.email || "-"}</p>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Aktivitas</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    activityColor[detailLog.activity] || "text-gray-600 bg-gray-100"
                  }`}>
                    {getLabel(detailLog.activity)}
                  </span>
                </div>

                <div className="flex justify-between items-start text-sm gap-4">
                  <span className="text-gray-400 shrink-0">Deskripsi</span>
                  <span className="text-gray-700 text-right text-xs">{detailLog.description || "-"}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">IP Address</span>
                  <span className="text-gray-700 font-mono text-xs">{detailLog.ip_address || "-"}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Browser</span>
                  <span className="text-gray-700 text-xs">{getBrowser(detailLog.user_agent)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Waktu</span>
                  <span className="text-gray-700 text-xs">{formatDate(detailLog.created_at)}</span>
                </div>
              </div>

              {/* User Agent full */}
              <div>
                <p className="text-xs text-gray-400 mb-1">User Agent</p>
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 break-all leading-relaxed">
                  {detailLog.user_agent || "-"}
                </p>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setDetailLog(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}