import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import {
  Package, CheckCircle, AlertTriangle, Wrench,
  UserCheck, Tag, TrendingUp, Download,
} from "lucide-react";

interface Stats {
  total_assets: number;
  good_condition: number;
  damaged: number;
  maintenance: number;
  total_borrowed: number;
  total_categories: number;
}

interface ChartItem {
  label: string;
  value: number;
  color?: string;
}

interface DashboardData {
  stats: Stats;
  condition_chart: ChartItem[];
  category_chart: ChartItem[];
}

const CATEGORY_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchDashboard = async () => {
      try {
        const res = await api.get("/dashboard");
        setData(res?.data?.data || null);
      } catch (err) {
        console.error("ERROR fetch dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // ── Export All ────────────────────────────────────────────────────────────
  const handleExportAll = async () => {
    try {
      setExporting(true);
      const res = await api.get("/dashboard/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `laporan-it-asset-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ERROR export:", err);
      alert("Gagal export data");
    } finally {
      setExporting(false);
    }
  };

  const stats = data?.stats;
  const conditionChart = data?.condition_chart || [];
  const categoryChart = data?.category_chart || [];

  const conditionTotal = conditionChart.reduce((s, i) => s + i.value, 0) || 1;
  const categoryMax = Math.max(...categoryChart.map((i) => i.value), 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-5">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64 bg-gray-200 rounded-2xl" />
            <div className="h-64 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Ringkasan data IT Asset Management</p>
        </div>
        <button
          onClick={handleExportAll}
          disabled={exporting}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? "Menyiapkan..." : "Export Semua"}
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

        <div
          onClick={() => navigate("/assets")}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Aset</p>
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats?.total_assets ?? "-"}</p>
        </div>

        <div
          onClick={() => navigate("/assets")}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Good Condition</p>
            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats?.good_condition ?? "-"}</p>
          {stats && (
            <p className="text-xs text-gray-400 mt-1">
              {Math.round((stats.good_condition / (stats.total_assets || 1)) * 100)}% dari total
            </p>
          )}
        </div>

        <div
          onClick={() => navigate("/assets")}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Damaged</p>
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-500">{stats?.damaged ?? "-"}</p>
          {stats && stats.damaged > 0 && (
            <p className="text-xs text-red-400 mt-1">Perlu perhatian</p>
          )}
        </div>

        <div
          onClick={() => navigate("/maintenance")}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Maintenance</p>
            <div className="w-9 h-9 rounded-full bg-yellow-50 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-yellow-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-yellow-500">{stats?.maintenance ?? "-"}</p>
        </div>

        <div
          onClick={() => navigate("/assignments")}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dipinjam</p>
            <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-purple-600">{stats?.total_borrowed ?? "-"}</p>
          <p className="text-xs text-gray-400 mt-1">Belum dikembalikan</p>
        </div>

        <div
          onClick={() => navigate("/categories")}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kategori</p>
            <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center">
              <Tag className="w-4 h-4 text-teal-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-teal-600">{stats?.total_categories ?? "-"}</p>
        </div>

      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Pie Chart — Kondisi Aset */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Distribusi Kondisi Aset</h3>
          </div>

          {conditionChart.length === 0 ? (
            <p className="text-center text-gray-300 text-sm py-10">Belum ada data</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  {(() => {
                    let offset = 0;
                    const r = 52;
                    const cx = 70;
                    const cy = 70;
                    const circumference = 2 * Math.PI * r;
                    return conditionChart.map((item, i) => {
                      const pct = item.value / conditionTotal;
                      const dash = pct * circumference;
                      const gap = circumference - dash;
                      const rotation = offset * 360 - 90;
                      offset += pct;
                      return (
                        <circle
                          key={i}
                          cx={cx} cy={cy} r={r}
                          fill="none"
                          stroke={item.color}
                          strokeWidth="24"
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={0}
                          transform={`rotate(${rotation} ${cx} ${cy})`}
                        />
                      );
                    });
                  })()}
                  <text x="70" y="66" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#1f2937">
                    {stats?.total_assets ?? 0}
                  </text>
                  <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#9ca3af">
                    Total
                  </text>
                </svg>
              </div>

              <div className="space-y-3 flex-1">
                {conditionChart.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-600">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800">{item.value}</span>
                      <span className="text-xs text-gray-400">
                        ({Math.round((item.value / conditionTotal) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar Chart — Aset per Kategori */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Aset per Kategori</h3>
          </div>

          {categoryChart.length === 0 ? (
            <p className="text-center text-gray-300 text-sm py-10">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {categoryChart.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 truncate shrink-0">{item.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.value / categoryMax) * 100}%`,
                        backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-6 text-right shrink-0">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}