import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import {
  Package, CheckCircle, AlertTriangle, Wrench,
  UserCheck, Tag, TrendingUp, Download, RefreshCw,
} from "lucide-react";
import { useKaryawan } from "@/context/KaryawanContext";
import { fetchAllActiveAssignments, getAssetDistributionByDepartment } from "@/api/dashboardService";

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
  "#2ba56e", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { karyawanList, ensureKaryawan, loadingKaryawan } = useKaryawan();
  const [data, setData] = useState<DashboardData | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterDept, setFilterDept] = useState<"all" | "active" | "borrowed" | "maintenance">("all");

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadingAssignments(true);

        const res = await api.get("/dashboard", { noCache: true } as any);
        if (!cancelled) setData(res?.data?.data || null);

        await ensureKaryawan();

        const activeAssignments = await fetchAllActiveAssignments();
        if (!cancelled) setAssignments(activeAssignments);
      } catch (err) {
        console.error("ERROR fetch dashboard data:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingAssignments(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [refreshKey, ensureKaryawan]);

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

  const departmentDistribution = useMemo(() => {
    return getAssetDistributionByDepartment(assignments, karyawanList, filterDept);
  }, [assignments, karyawanList, filterDept]);

  const topDepartment = useMemo(() => {
    if (departmentDistribution.length === 0) return null;
    return departmentDistribution[0];
  }, [departmentDistribution]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-5">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
            ))}
          </div>
          <div className="h-72 bg-gray-200 rounded-2xl w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">Ringkasan data & analisis IT Asset Management</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            title="Refresh data"
            className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 shadow-sm flex items-center justify-center transition-all duration-300 hover:shadow active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 h-10 px-5 rounded-full text-xs font-semibold shadow-sm flex items-center gap-2.5 transition-all duration-300 hover:shadow hover:border-slate-300 hover:text-brand-600 hover:border-brand-200 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Menyiapkan..." : "Export Semua Data"}
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Total Asset */}
        <div
          onClick={() => navigate("/assets")}
          className="group relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-brand-500 p-5 cursor-pointer hover:shadow hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Asset</p>
            <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center transition-all duration-300 group-hover:bg-brand-600 group-hover:text-white group-hover:rotate-6">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{stats?.total_assets ?? "-"}</p>
            <p className="text-[10px] text-slate-400 mt-1">Semua tipe barang terdaftar</p>
          </div>
        </div>

        {/* Asset Aktif */}
        <div
          onClick={() => navigate("/assets")}
          className="group relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-emerald-500 p-5 cursor-pointer hover:shadow hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Aktif</p>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-emerald-600 tracking-tight">{stats?.good_condition ?? "-"}</p>
            {stats && (
              <p className="text-[10px] text-slate-400 mt-1">
                <span className="font-bold text-emerald-600">{Math.round((stats.good_condition / (stats.total_assets || 1)) * 100)}%</span> dari total aset
              </p>
            )}
          </div>
        </div>

        {/* Asset Rusak */}
        <div
          onClick={() => navigate("/assets")}
          className="group relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-rose-500 p-5 cursor-pointer hover:shadow hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Rusak</p>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center transition-all duration-300 group-hover:bg-rose-600 group-hover:text-white group-hover:animate-bounce">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-rose-500 tracking-tight">{stats?.damaged ?? "-"}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {stats && stats.damaged > 0 ? (
                <span className="text-rose-500 font-medium animate-pulse">Butuh perbaikan segera</span>
              ) : (
                "Tidak ada kerusakan"
              )}
            </p>
          </div>
        </div>

        {/* Asset Maintenance */}
        <div
          onClick={() => navigate("/maintenance")}
          className="group relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-amber-500 p-5 cursor-pointer hover:shadow hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Maintenance</p>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center transition-all duration-300 group-hover:bg-amber-600 group-hover:text-white group-hover:rotate-12">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-amber-500 tracking-tight">{stats?.maintenance ?? "-"}</p>
            <p className="text-[10px] text-slate-400 mt-1">Sedang dalam perawatan</p>
          </div>
        </div>

        {/* Asset Dipinjam */}
        <div
          onClick={() => navigate("/assignments")}
          className="group relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-indigo-500 p-5 cursor-pointer hover:shadow hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Dipinjam</p>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-indigo-600 tracking-tight">{stats?.total_borrowed ?? "-"}</p>
            <p className="text-[10px] text-slate-400 mt-1">Digunakan oleh karyawan</p>
          </div>
        </div>

        {/* Kategori */}
        <div
          onClick={() => navigate("/categories")}
          className="group relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-cyan-500 p-5 cursor-pointer hover:shadow hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kategori</p>
            <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center transition-all duration-300 group-hover:bg-cyan-600 group-hover:text-white group-hover:-rotate-6">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-cyan-600 tracking-tight">{stats?.total_categories ?? "-"}</p>
            <p className="text-[10px] text-slate-400 mt-1">Klasifikasi tipe aset</p>
          </div>
        </div>

      </div>

      {/* PERSEBARAN ASSET PER DEPARTEMEN */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-700">Persebaran Asset per Departemen</h3>
          </div>
          
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value as any)}
            className="text-xs font-semibold text-slate-600 bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-[3px] focus:ring-brand-500/15 focus:border-brand-500 cursor-pointer transition-all"
          >
            <option value="all">Semua Asset</option>
            <option value="active">Asset Aktif</option>
            <option value="borrowed">Asset Dipinjam</option>
            <option value="maintenance">Asset Maintenance</option>
          </select>
        </div>

        {loadingAssignments || loadingKaryawan ? (
          <div className="space-y-4.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-24 sm:w-36" />
                <div className="flex-1 bg-slate-100 rounded-full h-3" />
                <div className="h-4 bg-slate-100 rounded w-10 hidden sm:block" />
              </div>
            ))}
          </div>
        ) : (
          <div>
            {departmentDistribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="w-9 h-9 text-slate-300 mb-2.5" />
                <p className="text-slate-400 text-sm font-medium">Belum ada data persebaran asset.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {departmentDistribution.map((item, i) => {
                  const maxCount = departmentDistribution[0]?.count || 1;
                  const pct = (item.count / maxCount) * 100;
                  const isTop = i === 0;

                  return (
                    <div key={item.department} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
                      <div className="flex items-center sm:w-48 shrink-0 gap-3">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          i === 0 ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          i === 1 ? "bg-slate-100 text-slate-700 border border-slate-200" :
                          i === 2 ? "bg-orange-100 text-orange-800 border border-orange-200" :
                          "bg-slate-50 text-slate-400 border border-slate-100"
                        }`}>
                          {i + 1}
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-800 truncate" title={item.department}>
                             {item.department}
                          </span>
                          {item.categories && item.categories.length > 0 && (() => {
                            const maxVisible = 2;
                            const visible = item.categories.slice(0, maxVisible);
                            const moreCount = item.categories.length - maxVisible;
                            const displayText = visible.map((cat) => `${cat.categoryName} (${cat.count})`).join(" • ") + 
                              (moreCount > 0 ? ` • +${moreCount} lainnya` : "");
                            
                            return (
                              <div className="relative group/tooltip">
                                <span className="text-[10px] text-gray-400 truncate mt-0.5 block cursor-help">
                                  {displayText}
                                </span>
                                
                                {/* Custom Premium Tooltip Popover */}
                                <div className="absolute left-0 bottom-full pb-2 hidden group-hover:block z-30 min-w-[240px] max-w-[280px]">
                                  <div className="bg-slate-900 text-white text-xs rounded-xl shadow-xl p-3.5 relative">
                                    <div className="font-bold border-b border-slate-800 pb-1.5 mb-1.5 text-[11px] text-slate-400 flex justify-between items-center gap-2">
                                      <span className="truncate">Detail Kategori Aset</span>
                                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 font-semibold shrink-0 max-w-[120px] truncate" title={item.department}>
                                        {item.department}
                                      </span>
                                    </div>
                                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                                      {item.categories.map((cat) => (
                                        <div key={cat.categoryName} className="flex justify-between items-center gap-4">
                                          <span className="text-slate-300 font-medium truncate">{cat.categoryName}</span>
                                          <span className="font-bold bg-slate-800 text-brand-400 px-2 py-0.5 rounded-full text-[10px]">
                                            {cat.count}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute left-6 top-full -translate-y-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900" />
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex-1 bg-slate-50 rounded-full h-3 overflow-hidden flex items-center">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${pct}%`,
                            background: isTop
                              ? "linear-gradient(90deg, #2BA56E 0%, #228A5A 100%)"
                              : i === 1
                              ? "linear-gradient(90deg, #3ecc8b 0%, #2ba56e 100%)"
                              : i === 2
                              ? "linear-gradient(90deg, #aff0d1 0%, #78e3b2 100%)"
                              : "linear-gradient(90deg, #cbd5e1 0%, #cbd5e1 100%)",
                          }}
                        />
                      </div>

                      <span className="text-xs font-extrabold text-slate-700 w-16 text-right shrink-0 hidden sm:inline">
                        {item.count} Asset
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Pie Chart — Kondisi Aset */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-700">Distribusi Kondisi Aset</h3>
          </div>

          {conditionChart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Package className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-slate-400 text-xs font-medium">Belum ada data kondisi aset.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
              <div className="relative shrink-0 flex items-center justify-center">
                <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-sm">
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
                          strokeWidth="20"
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={0}
                          transform={`rotate(${rotation} ${cx} ${cy})`}
                          className="transition-all duration-500 ease-in-out"
                        />
                      );
                    });
                  })()}
                  <text x="70" y="66" textAnchor="middle" className="text-2xl font-black fill-slate-800 tracking-tight">
                    {stats?.total_assets ?? 0}
                  </text>
                  <text x="70" y="84" textAnchor="middle" className="text-[9px] font-bold tracking-widest fill-slate-400 uppercase">
                    Total Aset
                  </text>
                </svg>
              </div>

              <div className="space-y-3 flex-1 w-full">
                {conditionChart.map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{item.value}</span>
                      <span className="text-[10px] font-bold text-slate-400">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <Tag className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-700">Aset per Kategori</h3>
          </div>

          {categoryChart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Tag className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-slate-400 text-xs font-medium">Belum ada data kategori.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categoryChart.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center gap-2.5 w-32 shrink-0">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      i === 0 ? "bg-brand-50 text-brand-600 border border-brand-100" :
                      i === 1 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                      i === 2 ? "bg-purple-50 text-purple-600 border border-purple-100" :
                      "bg-slate-50 text-slate-400 border border-slate-100"
                    }`}>
                      {i + 1}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 truncate">{item.label}</span>
                  </div>

                  <div className="flex-1 bg-slate-50 rounded-full h-2.5 overflow-hidden flex items-center">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.value / categoryMax) * 100}%`,
                        backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-8 text-right shrink-0">
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