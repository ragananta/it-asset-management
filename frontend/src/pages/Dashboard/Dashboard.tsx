import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import {
  Package, CheckCircle, AlertTriangle, Wrench,
  UserCheck, Tag, TrendingUp, Download, RefreshCw, Smartphone, Plus,
  ChevronDown, ChevronUp, X
} from "lucide-react";
import { useKaryawan } from "@/context/KaryawanContext";
import { fetchAllActiveAssignments, getAssetDistributionByDepartment } from "@/api/dashboardService";
import { usePolling } from "@/hooks/usePolling";
import ExportConfirmationModal from "@/components/ExportConfirmationModal";

interface Stats {
  total_assets: number;
  good_condition: number;
  damaged: number;
  maintenance: number;
  total_borrowed: number;
  total_categories: number;
}

interface PlotingDeviceStats {
  total: number;
  available: number;
  borrowed: number;
  maintenance: number;
  lost: number;
}

interface ChartItem {
  label: string;
  value: number;
  color?: string;
}

interface DashboardData {
  stats: Stats;
  ploting_device_stats: PlotingDeviceStats;
  condition_chart: ChartItem[];
  category_chart: ChartItem[];
}

const CATEGORY_COLORS = [
  "#059669", // Emerald-600
  "#16a34a", // Green-600
  "#d97706", // Amber-600
  "#dc2626", // Red-600
  "#64748b", // Slate-500
  "#10b981", // Emerald-500
  "#22c55e", // Green-500
  "#475569", // Slate-600
];

const getConditionColor = (label: string): string => {
  const lower = label.toLowerCase();
  if (lower.includes("bagus") || lower.includes("good")) return "#10b981"; // Emerald
  if (lower.includes("rusak") || lower.includes("damaged")) return "#ef4444"; // Red
  if (lower.includes("perbaikan") || lower.includes("maintenance")) return "#f59e0b"; // Amber
  return "#64748b"; // Slate
};

const formatLastSync = (date: Date | null) => {
  if (!date) return "-";
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${m} ${y} ${hh}:${mm}`;
};

const isDashboardEqual = (a: DashboardData | null, b: DashboardData | null): boolean => {
  if (!a || !b) return false;
  if (!a.stats || !b.stats || !a.ploting_device_stats || !b.ploting_device_stats) return false;

  return (
    a.stats.total_assets === b.stats.total_assets &&
    a.stats.total_borrowed === b.stats.total_borrowed &&
    a.stats.maintenance === b.stats.maintenance &&
    a.ploting_device_stats.total === b.ploting_device_stats.total &&
    a.ploting_device_stats.borrowed === b.ploting_device_stats.borrowed &&
    a.ploting_device_stats.maintenance === b.ploting_device_stats.maintenance
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { karyawanList, ensureKaryawan, loadingKaryawan } = useKaryawan();
  const [data, setData] = useState<DashboardData | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);

  const [showAllCategoriesDepts, setShowAllCategoriesDepts] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const toggleDeptExpand = (dept: string) => {
    setExpandedDepts((prev) => {
      const isExpanded = prev.includes(dept);
      if (isExpanded) {
        setShowAllCategoriesDepts((prevAll) => prevAll.filter((d) => d !== dept));
        return prev.filter((d) => d !== dept);
      }
      return [...prev, dept];
    });
  };

  const toggleShowAllCategories = (dept: string) => {
    setShowAllCategoriesDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const isSilentRef = useRef(false);
  const isFetchingRef = useRef(false);

  const triggerSilentRefresh = () => {
    isSilentRef.current = true;
    setRefreshKey((k) => k + 1);
  };

  usePolling(triggerSilentRefresh, 120000);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        if (!isSilentRef.current) {
          setLoading(true);
          setLoadingAssignments(true);
        }

        const res = await api.get("/dashboard", { noCache: true } as any);
        const newData = res?.data?.data || null;

        if (!cancelled) {
          if (!(isSilentRef.current && isDashboardEqual(data, newData))) {
            setData(newData);
            setLastSync(new Date());
          }
          setLoading(false);
        }

        // Load Karyawan and Assignments concurrently in background
        const [_, activeAssignments] = await Promise.all([
          ensureKaryawan(),
          fetchAllActiveAssignments(),
        ]);
        
        if (!cancelled) {
          setAssignments(activeAssignments);
        }
      } catch (err) {
        console.error("ERROR fetch dashboard data:", err);
      } finally {
        isFetchingRef.current = false;
        if (!cancelled) {
          setLoading(false);
          setLoadingAssignments(false);
          isSilentRef.current = false;
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
      setToast("Data berhasil diekspor.");
    } catch (err) {
      console.error("ERROR export:", err);
      setToast("Gagal export data");
    } finally {
      setExporting(false);
    }
  };

  const stats = data?.stats;
  const plotingDeviceStats = data?.ploting_device_stats;
  const conditionChart = data?.condition_chart || [];
  const categoryChart = data?.category_chart || [];

  const conditionTotal = conditionChart.reduce((s, i) => s + i.value, 0) || 1;
  const categoryMax = Math.max(...categoryChart.map((i) => i.value), 1);

  const departmentDistribution = useMemo(() => {
    return getAssetDistributionByDepartment(assignments, karyawanList, "all");
  }, [assignments, karyawanList]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-8">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-black text-slate-800 tracking-tight">Dashboard</h2>
          <p className="text-[12px] text-slate-400 mt-1">Ringkasan data & analisis IT Asset Management</p>
          {lastSync && (
            <p className="text-[12px] text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Last Sync: {formatLastSync(lastSync)}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            title="Refresh data"
            className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 shadow-sm flex items-center justify-center transition-all duration-300 hover:shadow active:scale-95 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowExportConfirm(true)}
            disabled={exporting}
            className="flex-1 sm:flex-initial bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 h-10 px-5 rounded-full text-[12px] font-semibold shadow-sm flex items-center justify-center gap-2.5 transition-all duration-300 hover:shadow hover:border-slate-300 hover:text-emerald-600 hover:border-emerald-250 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Mengekspor..." : "Export Semua Data"}
          </button>
        </div>
      </div>

      {/* SECTION 1 - KPI SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Total Asset */}
        <div
          onClick={() => navigate("/assets")}
          className="group bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Total Asset</p>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:rotate-6">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{stats?.total_assets ?? "-"}</p>
            <p className="text-[12px] text-slate-400 mt-1">Semua tipe barang terdaftar</p>
          </div>
        </div>

        {/* Asset Dipinjam */}
        <div
          onClick={() => navigate("/assignments")}
          className="group bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Asset Dipinjam</p>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-emerald-600 tracking-tight">{stats?.total_borrowed ?? "-"}</p>
            <p className="text-[12px] text-slate-400 mt-1">Digunakan oleh karyawan</p>
          </div>
        </div>

        {/* Maintenance Aktif */}
        <div
          onClick={() => navigate("/maintenance")}
          className="group bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Maintenance Aktif</p>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center transition-all duration-300 group-hover:bg-amber-600 group-hover:text-white group-hover:rotate-12">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-amber-500 tracking-tight">{stats?.maintenance ?? "-"}</p>
            <p className="text-[12px] text-slate-400 mt-1">Sedang dalam perawatan</p>
          </div>
        </div>

        {/* Tas Tenant */}
        <div
          onClick={() => navigate("/ploting-devices")}
          className="group bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Tas Tenant</p>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{plotingDeviceStats?.total ?? "-"}</p>
            <p className="text-[12px] text-slate-400 mt-1">Tas Tenant aktif terdaftar</p>
          </div>
        </div>

      </div>

      {/* SECTION 2 - ASSET OVERVIEW (CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pie Chart — Kondisi Aset */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 flex flex-col">
          <div className="flex items-center gap-2.5 mb-6">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-[18px] font-bold text-slate-800">Distribusi Kondisi Aset</h3>
          </div>

          {conditionChart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <Package className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-slate-400 text-[12px] font-medium">Belum ada data kondisi aset.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center my-auto">
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
                          stroke={getConditionColor(item.label)}
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
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getConditionColor(item.label) }} />
                      <span className="text-[14px] font-semibold text-slate-600">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-slate-800">{item.value}</span>
                      <span className="text-[12px] font-bold text-slate-400">
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 flex flex-col">
          <div className="flex items-center gap-2.5 mb-6">
            <Tag className="w-4 h-4 text-emerald-600" />
            <h3 className="text-[18px] font-bold text-slate-800">Aset per Kategori</h3>
          </div>

          {categoryChart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <Tag className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-slate-400 text-[12px] font-medium">Belum ada data kategori.</p>
            </div>
          ) : (
            <div className="space-y-4 my-auto max-h-[250px] overflow-y-auto pr-1.5 no-scrollbar">
              {categoryChart.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <span className="text-[14px] font-semibold text-slate-600 truncate">{item.label}</span>
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
                  <span className="text-[14px] font-bold text-slate-700 w-8 text-right shrink-0">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* SECTION 3 & 4 GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SECTION 3 - DISTRIBUSI DEPARTEMEN */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-[18px] font-bold text-slate-800">Persebaran Asset per Departemen</h3>
            </div>
          </div>

          {loadingAssignments || loadingKaryawan ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2 animate-pulse pb-3">
                  <div className="flex justify-between">
                    <div className="h-4 bg-slate-100 rounded w-36" />
                    <div className="h-4 bg-slate-100 rounded w-12" />
                  </div>
                  <div className="bg-slate-100 rounded-full h-1.5 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              {departmentDistribution.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Package className="w-9 h-9 text-slate-300 mb-2.5" />
                  <p className="text-slate-400 text-[14px] font-medium">Belum ada data persebaran asset.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1.5 no-scrollbar">
                  {departmentDistribution.map((item, i) => {
                    const maxCount = departmentDistribution[0]?.count || 1;
                    const pct = (item.count / maxCount) * 100;

                    return (
                      <div
                        key={item.department}
                        onClick={() => toggleDeptExpand(item.department)}
                        className="group border border-slate-100 hover:border-slate-200/85 rounded-xl p-3 cursor-pointer transition-all duration-200 bg-white"
                      >
                        <div className="flex justify-between items-center text-[14px] mb-1.5">
                          <span className="font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">
                            {item.department}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[12px]">
                              {item.count} Asset
                            </span>
                            <div className="text-slate-400 group-hover:text-slate-650 transition-colors">
                              {expandedDepts.includes(item.department) ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: i === 0 ? "#059669" : i === 1 ? "#10b981" : i === 2 ? "#34d399" : "#cbd5e1"
                            }}
                          />
                        </div>

                        {/* Expandable Category details */}
                        {expandedDepts.includes(item.department) && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-2 animate-in fade-in duration-200"
                          >
                            {(showAllCategoriesDepts.includes(item.department)
                              ? item.categories
                              : item.categories.slice(0, 5)
                            ).map((cat) => (
                              <div
                                key={cat.categoryName}
                                className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-slate-600 flex items-center gap-1.5"
                              >
                                <span>{cat.categoryName}</span>
                                <span className="font-extrabold text-slate-700">({cat.count})</span>
                              </div>
                            ))}
                            {item.categories.length > 5 && (
                              <button
                                type="button"
                                onClick={() => toggleShowAllCategories(item.department)}
                                className="bg-slate-50 hover:bg-slate-100 hover:text-slate-650 transition-all border border-slate-200 border-dashed rounded-lg px-2.5 py-1 text-[12px] font-bold text-slate-400 cursor-pointer"
                              >
                                {showAllCategoriesDepts.includes(item.department)
                                  ? "Sembunyikan"
                                  : `+${item.categories.length - 5} kategori lainnya`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 4 - QUICK ACTIONS */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-[18px] font-bold text-slate-800">Quick Actions</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3">
            <button
              onClick={() => navigate("/assets")}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 rounded-xl text-[14px] font-semibold transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-500 group-hover:text-emerald-600">
                  <Plus className="w-4 h-4" />
                </div>
                <span>Tambah Asset</span>
              </div>
              <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-[14px]">→</span>
            </button>

            <button
              onClick={() => navigate("/assignments")}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 rounded-xl text-[14px] font-semibold transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-500 group-hover:text-emerald-600">
                  <UserCheck className="w-4 h-4" />
                </div>
                <span>Buat Assignment</span>
              </div>
              <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-[14px]">→</span>
            </button>

            <button
              onClick={() => navigate("/maintenance")}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 rounded-xl text-[14px] font-semibold transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-500 group-hover:text-emerald-600">
                  <Wrench className="w-4 h-4" />
                </div>
                <span>Buat Maintenance</span>
              </div>
              <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-[14px]">→</span>
            </button>

            <button
              onClick={() => navigate("/ploting-devices")}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 rounded-xl text-[14px] font-semibold transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-500 group-hover:text-emerald-600">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span>Kelola Tas Tenant</span>
              </div>
              <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-[14px]">→</span>
            </button>
          </div>
        </div>

      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <ExportConfirmationModal
        isOpen={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        onConfirm={handleExportAll}
      />
    </div>
  );
}