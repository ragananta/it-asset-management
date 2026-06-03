import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  Search, Package, ChevronDown, ChevronUp,
  ShoppingCart, UserCheck, UserX, Wrench,
  ClipboardCheck, RefreshCw, Trash2, Tag, Info,
  X, CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Asset {
  id: number;
  asset_code: string;
  asset_name: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  purchase_price?: number;
  condition_status?: string;
  status?: string;
  category?: { id: number; name: string };
  assigned_user?: { id: number; name: string };
  assignments?: Assignment[];
  maintenance_logs?: MaintenanceLog[];
  audit_logs?: AuditLogItem[];
}

interface AssetSummary {
  id: number;
  asset_code: string;
  asset_name: string;
}

interface Assignment {
  id: number;
  user_name: string;
  assign_date: string;
  return_date?: string | null;
  note?: string;
}

interface MaintenanceLog {
  id: number;
  date: string;
  description: string;
  cost?: number;
  pic?: string;
  status?: "ongoing" | "completed"; // ← tambah
}

interface AuditLogItem {
  id: number;
  action: string;
  description: string;
  pic?: string;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  type: "purchase" | "assigned" | "returned" | "maintenance" | "audit";
  title: string;
  description?: string;
  meta?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const auditActionLabel: Record<string, string> = {
  check:    "Pengecekan",
  replace:  "Penggantian",
  repair:   "Perbaikan",
  update:   "Pembaruan Data",
  disposal: "Disposal",
  other:    "Lainnya",
};

const conditionLabel: Record<string, string> = {
  good: "Good", damaged: "Damaged", under_maintenance: "Maintenance",
};
const conditionColor: Record<string, string> = {
  good: "text-green-600 bg-green-50",
  damaged: "text-red-600 bg-red-50",
  under_maintenance: "text-yellow-600 bg-yellow-50",
};
const statusLabel: Record<string, string> = {
  active: "Aktif", borrowed: "Dipinjam", disposed: "Disposed",
};
const statusColor: Record<string, string> = {
  active: "text-teal-700 bg-teal-50",
  borrowed: "text-blue-600 bg-blue-50",
  disposed: "text-gray-500 bg-gray-100",
};

// ─── YearGroups ───────────────────────────────────────────────────────────────

function YearGroups({
  years, groups, latestYear, expandedId, setExpandedId,
}: {
  years: string[];
  groups: Record<string, TimelineEvent[]>;
  latestYear: string;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  const [openYears, setOpenYears] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    years.forEach((y) => { init[y] = y === latestYear; });
    return init;
  });

  const toggleYear = (year: string) =>
    setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }));

  return (
    <div className="space-y-3">
      {years.map((year) => {
        const isOpen = openYears[year];
        return (
          <div key={year} className="rounded-xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => toggleYear(year)}
              className={`w-full flex items-center justify-between px-4 py-2.5 transition ${
                isOpen ? "bg-gray-50" : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 tracking-widest">{year}</span>
                <span className="text-xs text-gray-300">{groups[year].length} event</span>
              </div>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition ${
                isOpen ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-600"
              }`}>
                {isOpen ? "−" : "+"}
              </span>
            </button>

            {isOpen && (
              <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-100">
                {groups[year].map((event) => {
                  const isExpanded = expandedId === event.id;
                  return (
                    <div
                      key={event.id}
                      className={`rounded-xl border transition cursor-pointer ${
                        isExpanded ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${event.bg} ${event.border} ${event.color}`}>
                          {event.icon}
                        </div>
                        <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${event.bg} ${event.color}`}>
                            {event.title}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(event.date.length === 10 ? `${event.date}T00:00:00Z` : event.date)
                              .toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                          </span>
                        </div>
                        {(event.description || event.meta) && (
                          isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        )}
                      </div>
                      {isExpanded && (event.description || event.meta) && (
                        <div className="px-3 pb-3 border-t border-gray-100 space-y-1">
                          {event.description && (
                            <p className="text-xs text-gray-600 leading-relaxed pt-2">{event.description}</p>
                          )}
                          {event.meta && (
                            <p className="text-xs text-gray-400">{event.meta}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (val?: string | null) => {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

const fmtCurrency = (val?: number | string | null) => {
  if (!val) return null;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val));
};

const buildTimeline = (asset: Asset): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  events.push({
    id: "purchase",
    date: asset.purchase_date || asset.assignments?.[0]?.assign_date || "0000-01-01",
    type: "purchase",
    title: "Aset Masuk ke IT",
    description: `${asset.asset_name} (${asset.asset_code}) terdaftar di sistem`,
    meta: [
      asset.brand && `Brand: ${asset.brand}`,
      asset.model && `Model: ${asset.model}`,
      asset.purchase_date && `Tgl Beli: ${fmtDate(asset.purchase_date)}`,
      fmtCurrency(asset.purchase_price) && `Harga: ${fmtCurrency(asset.purchase_price)}`,
    ].filter(Boolean).join(" · ") || undefined,
    icon: <ShoppingCart className="w-4 h-4" />,
    color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200",
  });

  asset.assignments?.forEach((a) => {
    events.push({
      id: `assign-${a.id}`,
      date: a.assign_date,
      type: "assigned",
      title: `Dipegang oleh ${a.user_name}`,
      description: a.note || undefined,
      meta: `Mulai: ${fmtDate(a.assign_date)}`,
      icon: <UserCheck className="w-4 h-4" />,
      color: "text-indigo-600", bg: "bg-indigo-100", border: "border-indigo-200",
    });

    if (a.return_date) {
      events.push({
        id: `return-${a.id}`,
        date: a.return_date,
        type: "returned",
        title: `Dikembalikan oleh ${a.user_name}`,
        meta: `Kembali: ${fmtDate(a.return_date)}`,
        icon: <UserX className="w-4 h-4" />,
        color: "text-gray-500", bg: "bg-gray-100", border: "border-gray-200",
      });
    }
  });

  // ── Maintenance dengan status ─────────────────────────────────────────────
  asset.maintenance_logs?.forEach((m) => {
    const isCompleted = m.status === "completed";
    events.push({
      id: `maint-${m.id}`,
      date: m.date,
      type: "maintenance",
      title: isCompleted ? "Maintenance Selesai" : "Maintenance / Servis",
      description: m.description,
      meta: [
        m.pic && `Teknisi: ${m.pic}`,
        fmtCurrency(m.cost) && `Biaya: ${fmtCurrency(m.cost)}`,
        isCompleted ? "✓ Selesai" : "⏳ Berlangsung",
      ].filter(Boolean).join(" · ") || undefined,
      icon: isCompleted
        ? <CheckCircle2 className="w-4 h-4" />
        : <Wrench className="w-4 h-4" />,
      color: isCompleted ? "text-teal-600" : "text-orange-600",
      bg: isCompleted ? "bg-teal-100" : "bg-orange-100",
      border: isCompleted ? "border-teal-200" : "border-orange-200",
    });
  });

  asset.audit_logs?.forEach((al) => {
    const actionIconMap: Record<string, React.ReactNode> = {
      check:    <ClipboardCheck className="w-4 h-4" />,
      replace:  <RefreshCw className="w-4 h-4" />,
      repair:   <Wrench className="w-4 h-4" />,
      update:   <Tag className="w-4 h-4" />,
      disposal: <Trash2 className="w-4 h-4" />,
      other:    <Info className="w-4 h-4" />,
    };
    const actionColorMap: Record<string, { color: string; bg: string; border: string }> = {
      check:    { color: "text-blue-600",   bg: "bg-blue-100",   border: "border-blue-200" },
      replace:  { color: "text-orange-600", bg: "bg-orange-100", border: "border-orange-200" },
      repair:   { color: "text-yellow-600", bg: "bg-yellow-100", border: "border-yellow-200" },
      update:   { color: "text-teal-600",   bg: "bg-teal-100",   border: "border-teal-200" },
      disposal: { color: "text-red-600",    bg: "bg-red-100",    border: "border-red-200" },
      other:    { color: "text-gray-600",   bg: "bg-gray-100",   border: "border-gray-200" },
    };
    const c = actionColorMap[al.action] || actionColorMap.other;

    events.push({
      id: `audit-${al.id}`,
      date: al.created_at,
      type: "audit",
      title: auditActionLabel[al.action] || al.action,
      description: al.description,
      meta: al.pic ? `PIC: ${al.pic}` : undefined,
      icon: actionIconMap[al.action] || <Info className="w-4 h-4" />,
      ...c,
    });
  });

  const toTs = (d: string) => {
    if (!d || d === "0000-01-01") return 0;
    const normalized = d.length === 10 ? `${d}T00:00:00.000Z` : d;
    return new Date(normalized).getTime();
  };

  events.sort((a, b) => toTs(b.date) - toTs(a.date));
  return events;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditLogList() {
  const navigate = useNavigate();

  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setCurrentPage(1); }, 400);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchAssets = async () => {
      try {
        setLoadingAssets(true);
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(rowsPerPage),
        });
        if (search) params.append("search", search);

        const res = await api.get(`/assets?${params}`);
        if (cancelled) return;

        const payload = res?.data?.data;
        if (payload?.data) {
          setAssets(payload.data);
          setTotalData(payload.total);
          setTotalPages(payload.last_page);
        } else {
          const data = Array.isArray(payload) ? payload : [];
          setAssets(data);
          setTotalData(data.length);
          setTotalPages(1);
        }
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoadingAssets(false);
      }
    };

    fetchAssets();
    return () => { cancelled = true; };
  }, [currentPage, rowsPerPage, search]);

  const detailCache = useRef<Record<number, Asset>>({});

  const selectAsset = useCallback(async (id: number) => {
    if (selectedAsset?.id === id) {
      setSelectedAsset(null);
      setExpandedId(null);
      return;
    }

    if (detailCache.current[id]) {
      setSelectedAsset(detailCache.current[id]);
      setExpandedId(null);
      return;
    }

    try {
      setLoadingDetail(true);
      setExpandedId(null);
      const res = await api.get(`/assets/${id}`);
      const data: Asset = res?.data?.data || res?.data || null;
      if (data) {
        detailCache.current[id] = data;
        setSelectedAsset(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedAsset?.id]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const timeline = selectedAsset ? buildTimeline(selectedAsset) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
          <Package className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-800">Riwayat Aset</h1>
          <p className="text-xs text-gray-400">Pilih aset untuk melihat history lengkap dari awal masuk hingga sekarang</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Kiri: Daftar Aset */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                placeholder="Cari aset..."
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
          </div>

          <div className="flex justify-between items-center mb-3 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-200 rounded-md px-2 py-1 text-gray-700 text-sm focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {totalData === 0 ? "0" : `${startIndex + 1}–${Math.min(startIndex + rowsPerPage, totalData)} of ${totalData}`}
              </span>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
              >‹</button>
              <button
                disabled={currentPage === totalPages || totalData === 0}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition disabled:opacity-40"
              >›</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingAssets ? (
              <div className="py-16 text-center text-gray-400 text-sm">Loading...</div>
            ) : assets.length === 0 ? (
              <div className="py-16 text-center text-gray-300 text-sm">Data aset belum tersedia</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {assets.map((a) => {
                  const isSelected = selectedAsset?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => selectAsset(a.id)}
                      className={`w-full flex items-center justify-between px-5 py-4 text-left transition ${
                        isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isSelected ? "bg-blue-600" : "bg-gray-100"
                        }`}>
                          <Package className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-400"}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                            {a.asset_name}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{a.asset_code}</p>
                        </div>
                      </div>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition shrink-0 ${
                        isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        {isSelected ? "−" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Kanan: Timeline */}
        <div>
          {!selectedAsset && !loadingDetail ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">Pilih aset di sebelah kiri</p>
              <p className="text-gray-300 text-xs mt-1">untuk melihat history lengkap aset</p>
            </div>
          ) : loadingDetail ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center py-20">
              <p className="text-gray-400 text-sm">Memuat history...</p>
            </div>
          ) : selectedAsset && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-base">{selectedAsset.asset_name}</p>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{selectedAsset.asset_code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedAsset.condition_status && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${conditionColor[selectedAsset.condition_status] || "text-gray-500 bg-gray-100"}`}>
                        {conditionLabel[selectedAsset.condition_status] || selectedAsset.condition_status}
                      </span>
                    )}
                    {selectedAsset.status && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[selectedAsset.status] || "text-gray-500 bg-gray-100"}`}>
                        {statusLabel[selectedAsset.status] || selectedAsset.status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  {selectedAsset.category && <span>📁 {selectedAsset.category.name}</span>}
                  {selectedAsset.assigned_user && <span>👤 {selectedAsset.assigned_user.name}</span>}
                  {selectedAsset.brand && <span>🏷 {selectedAsset.brand}</span>}
                </div>
                <button
                  onClick={() => navigate(`/assets/${selectedAsset.id}`)}
                  className="mt-3 text-xs text-blue-600 hover:underline"
                >
                  Lihat detail aset →
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">
                  Timeline History
                  <span className="text-xs text-gray-400 font-normal ml-2">({timeline.length} event)</span>
                </p>

                {timeline.length === 0 ? (
                  <p className="text-center text-gray-300 text-sm py-8">Belum ada history untuk aset ini</p>
                ) : (() => {
                  const groups: Record<string, TimelineEvent[]> = {};
                  timeline.forEach((ev) => {
                    const year = ev.date && ev.date !== "0000-01-01"
                      ? new Date(ev.date.length === 10 ? `${ev.date}T00:00:00Z` : ev.date).getFullYear().toString()
                      : "—";
                    if (!groups[year]) groups[year] = [];
                    groups[year].push(ev);
                  });

                  const years = Object.keys(groups).sort((a, b) => Number(b) - Number(a));
                  const latestYear = years[0];

                  return (
                    <YearGroups
                      years={years}
                      groups={groups}
                      latestYear={latestYear}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                    />
                  );
                })()}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}