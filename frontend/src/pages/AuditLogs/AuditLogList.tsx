import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import {
  Search, Package, ChevronDown, ChevronUp,
  ShoppingCart, UserCheck, UserX, Wrench,
  ClipboardCheck, RefreshCw, Trash2, Tag, Info,
  X, CheckCircle2,
} from "lucide-react";
import TablePagination from "../../components/pagination/TablePagination";
import { useRowsPerPage } from "../../hooks/useRowsPerPage";

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

interface ApiTimelineEvent {
  id: string;
  event_type: string;
  category: TimelineCategory;
  category_label: string;
  title: string;
  description?: string | null;
  created_at: string;
  details?: Record<string, string | number | null>;
}

interface TimelineMonthGroup {
  month: string;
  month_number: number;
  events: ApiTimelineEvent[];
}

interface TimelineYearGroup {
  year: number;
  months: TimelineMonthGroup[];
}

type TimelineCategory =
  | "all"
  | "asset_in"
  | "assignment"
  | "returned"
  | "maintenance"
  | "data_change"
  | "status_change"
  | "audit";

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

const timelineFilters: { value: TimelineCategory; label: string }[] = [
  { value: "all", label: "Semua Aktivitas" },
  { value: "asset_in", label: "Asset Masuk" },
  { value: "assignment", label: "Assignment" },
  { value: "returned", label: "Pengembalian" },
  { value: "maintenance", label: "Maintenance" },
];

const timelineStyle: Record<TimelineCategory, { badge: string; dot: string; line: string; icon: React.ReactNode }> = {
  all: { badge: "text-gray-600 bg-gray-100", dot: "bg-gray-400", line: "border-gray-200", icon: <Info className="w-4 h-4" /> },
  asset_in: { badge: "text-cyan-700 bg-cyan-50", dot: "bg-cyan-500", line: "border-cyan-200", icon: <ShoppingCart className="w-4 h-4" /> },
  assignment: { badge: "text-blue-700 bg-blue-50", dot: "bg-blue-500", line: "border-blue-200", icon: <UserCheck className="w-4 h-4" /> },
  returned: { badge: "text-purple-700 bg-purple-50", dot: "bg-purple-500", line: "border-purple-200", icon: <UserX className="w-4 h-4" /> },
  maintenance: { badge: "text-orange-700 bg-orange-50", dot: "bg-orange-500", line: "border-orange-200", icon: <Wrench className="w-4 h-4" /> },
  data_change: { badge: "text-orange-700 bg-orange-50", dot: "bg-orange-500", line: "border-orange-200", icon: <Tag className="w-4 h-4" /> },
  status_change: { badge: "text-orange-700 bg-orange-50", dot: "bg-orange-500", line: "border-orange-200", icon: <RefreshCw className="w-4 h-4" /> },
  audit: { badge: "text-gray-700 bg-gray-100", dot: "bg-gray-500", line: "border-gray-200", icon: <ClipboardCheck className="w-4 h-4" /> },
};

const maintenanceCompletedStyle = {
  badge: "text-green-700 bg-green-50",
  dot: "bg-green-500",
  line: "border-green-200",
  icon: <Wrench className="w-4 h-4" />,
};

const getTimelineEventStyle = (event: ApiTimelineEvent) => {
  if (event.category === "maintenance" && /selesai|completed/i.test(event.title || event.event_type || "")) {
    return maintenanceCompletedStyle;
  }

  return timelineStyle[event.category] || timelineStyle.audit;
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

function TimelineYearGroups({
  groups, expandedId, setExpandedId,
}: {
  groups: TimelineYearGroup[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  const [openYears, setOpenYears] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setOpenYears((prev) => {
      const next: Record<number, boolean> = {};
      groups.forEach((group, index) => {
        next[group.year] = prev[group.year] ?? index === 0;
      });
      return next;
    });
  }, [groups]);

  const formatEventDate = (value: string) =>
    new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
    });

  const formatEventTime = (value: string) =>
    new Date(value).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      {groups.map((yearGroup) => {
        const isYearOpen = openYears[yearGroup.year] ?? false;
        const eventCount = yearGroup.months.reduce((sum, month) => sum + month.events.length, 0);

        return (
          <div key={yearGroup.year} className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => setOpenYears((prev) => ({ ...prev, [yearGroup.year]: !isYearOpen }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-800">{yearGroup.year}</span>
                <span className="text-xs text-gray-400">{eventCount} event</span>
              </div>
              {isYearOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {isYearOpen && (
              <div className="px-4 py-4 space-y-5">
                {yearGroup.months.map((month) => (
                  <div key={`${yearGroup.year}-${month.month_number}`} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{month.month}</p>
                      <span className="h-px flex-1 bg-gray-100" />
                    </div>

                    <div className="relative pl-5 space-y-3 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                      {month.events.map((event) => {
                        const style = getTimelineEventStyle(event);
                        const isExpanded = expandedId === event.id;
                        const details = Object.entries(event.details || {}).filter(([, value]) => value !== null && value !== "");

                        return (
                          <div key={event.id} className="relative">
                            <span className={`absolute -left-[18px] top-4 w-3 h-3 rounded-full ring-4 ring-white ${style.dot}`} />
                            <div className={`rounded-lg border bg-white transition ${isExpanded ? `${style.line} shadow-sm` : "border-gray-100 hover:border-gray-250"}`}>
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : event.id)}
                                className="w-full px-4 py-3 text-left"
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${style.badge}`}>
                                    {style.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-gray-800">{event.title}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                          {formatEventDate(event.created_at)} · {formatEventTime(event.created_at)}
                                        </p>
                                      </div>
                                      <span className={`text-[11px] px-2 py-1 rounded-full font-medium whitespace-nowrap ${style.badge}`}>
                                        {event.category_label}
                                      </span>
                                    </div>
                                    {event.description && (
                                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{event.description}</p>
                                    )}
                                  </div>
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />}
                                </div>
                              </button>

                              {isExpanded && details.length > 0 && (
                                <div className="border-t border-gray-100 px-4 pb-4 pt-3 ml-12">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {details.map(([key, value]) => (
                                      <div key={key}>
                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">{key}</p>
                                        <p className="text-xs font-medium text-gray-700 mt-0.5">{String(value)}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
      check:    { color: "text-brand-600",   bg: "bg-brand-50",   border: "border-brand-200" },
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const initialSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(searchParams.get("page") || "1", 10);
  });
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "created_at");
  const [sortOrder, setSortOrder] = useState(() => searchParams.get("order") || "desc");

  useEffect(() => {
    const params: Record<string, string> = {};
    if (currentPage > 1) params.page = String(currentPage);
    if (search) params.search = search;
    if (sortBy && sortBy !== "created_at") params.sort = sortBy;
    if (sortOrder && sortOrder !== "desc") params.order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [currentPage, search, rowsPerPage, sortBy, sortOrder, setSearchParams]);

  const [totalData, setTotalData] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timelineGroups, setTimelineGroups] = useState<TimelineYearGroup[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineType, setTimelineType] = useState<TimelineCategory>("all");
  const [timelineSearchInput, setTimelineSearchInput] = useState("");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineRowsPerPage, setTimelineRowsPerPage] = useState(5);
  const [timelineTotal, setTimelineTotal] = useState(0);
  const [timelineLastPage, setTimelineLastPage] = useState(1);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [typeSearchQuery, setTypeSearchQuery] = useState("");
  const timelineSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setCurrentPage(1); }, 400);
  };

  const handleTimelineSearchInput = (val: string) => {
    setTimelineSearchInput(val);
    if (timelineSearchTimer.current) clearTimeout(timelineSearchTimer.current);
    timelineSearchTimer.current = setTimeout(() => {
      setTimelineSearch(val);
      setTimelinePage(1);
    }, 350);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const isFetchingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAssets = async () => {
      if (isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        setLoadingAssets(true);
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(rowsPerPage),
        });
        if (search) params.append("search", search);
        if (sortBy) params.append("sort_by", sortBy);
        if (sortOrder) params.append("sort_order", sortOrder);

        const res = await api.get(`/assets?${params}`, { signal: controller.signal });

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
      } catch (err: any) {
        if (err.name !== "CanceledError") {
          console.error(err);
        }
      } finally {
        isFetchingRef.current = false;
        if (!controller.signal.aborted) {
          setLoadingAssets(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };

    fetchAssets();
    return () => {
      controller.abort();
      isFetchingRef.current = false;
    };
  }, [currentPage, rowsPerPage, search, sortBy, sortOrder]);

  const detailCache = useRef<Record<number, Asset>>({});

  const selectAsset = useCallback(async (id: number) => {
    if (selectedAsset?.id === id) {
      setSelectedAsset(null);
      setExpandedId(null);
      setTimelineGroups([]);
      setTimelineTotal(0);
      return;
    }

    setTimelineType("all");
    setTimelineSearchInput("");
    setTimelineSearch("");
    setTimelinePage(1);
    setTimelineGroups([]);
    setTimelineTotal(0);
    setExpandedId(null);

    if (detailCache.current[id]) {
      setSelectedAsset(detailCache.current[id]);
      return;
    }

    try {
      setLoadingDetail(true);
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

  const isFetchingTimelineRef = useRef(false);

  useEffect(() => {
    if (!selectedAsset?.id) return;

    const controller = new AbortController();
    const fetchTimeline = async () => {
      if (isFetchingTimelineRef.current) return;
      try {
        isFetchingTimelineRef.current = true;
        setTimelineLoading(true);
        const params = new URLSearchParams({
          page: String(timelinePage),
          per_page: String(timelineRowsPerPage),
          sort: "desc",
        });
        if (timelineType !== "all") params.append("type", timelineType);
        if (timelineSearch) params.append("search", timelineSearch);

        const res = await api.get(`/assets/${selectedAsset.id}/timeline?${params}`, { signal: controller.signal });

        const payload = res?.data?.data || {};
        setTimelineGroups(payload.year_groups || []);
        setTimelineTotal(payload.meta?.total || 0);
        setTimelineLastPage(payload.meta?.last_page || 1);
        setExpandedId(null);
      } catch (err: any) {
        if (err.name !== "CanceledError") {
          console.error(err);
          setTimelineGroups([]);
          setTimelineTotal(0);
          setTimelineLastPage(1);
        }
      } finally {
        isFetchingTimelineRef.current = false;
        if (!controller.signal.aborted) {
          setTimelineLoading(false);
        }
      }
    };

    fetchTimeline();
    return () => {
      controller.abort();
      isFetchingTimelineRef.current = false;
    };
  }, [selectedAsset?.id, timelineType, timelineSearch, timelinePage, timelineRowsPerPage, timelineRefreshKey]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const timeline = selectedAsset ? buildTimeline(selectedAsset) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
          <Package className="w-4 h-4 text-brand-600" />
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
                className="w-full pl-9 pr-9 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm"
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

          <TablePagination
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            totalData={totalData}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
            className="mb-3"
          />

          <div className="flex items-center justify-between px-5 py-2.5 text-xs font-semibold text-slate-500 bg-gray-100/50 border border-gray-250/20 rounded-lg mb-3 select-none">
            <button
              onClick={() => handleSort("asset_name")}
              className="flex items-center gap-1 hover:text-slate-800 focus:outline-none font-semibold"
            >
              <span>Nama Aset</span>
              {sortBy === "asset_name" && (
                sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-gray-750" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-750" />
              )}
            </button>
            <button
              onClick={() => handleSort("asset_code")}
              className="flex items-center gap-1 hover:text-slate-800 focus:outline-none font-semibold"
            >
              <span>Kode Aset</span>
              {sortBy === "asset_code" && (
                sortOrder === "asc" ? <ChevronUp className="w-3 h-3 text-gray-750" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-750" />
              )}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                        isSelected ? "bg-brand-50/50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-brand-600" : "bg-gray-100"
                        }`}>
                          <Package className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-400"}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isSelected ? "text-brand-700 font-semibold" : "text-gray-800"}`}>
                            {a.asset_name}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{a.asset_code}</p>
                        </div>
                      </div>
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold transition shrink-0 ${
                        isSelected ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"
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
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-700">
                      Timeline History
                      <span className="text-xs text-gray-400 font-normal ml-2">({timelineTotal} event)</span>
                    </p>
                    <button
                      onClick={() => setTimelineRefreshKey((key) => key + 1)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 flex items-center justify-center transition"
                      title="Refresh timeline"
                    >
                      <RefreshCw className={`w-4 h-4 ${timelineLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative sm:w-48 w-full">
                      <button
                        type="button"
                        onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                        className="w-full h-10 px-5 flex items-center justify-between rounded-full border border-gray-200 bg-white text-sm text-gray-705 hover:bg-gray-50 focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm cursor-pointer transition-all"
                      >
                        <span className={timelineType !== "all" ? "text-brand-600 font-semibold truncate" : "text-slate-700 truncate"}>
                          {timelineFilters.find(f => f.value === timelineType)?.label || "Semua Aktivitas"}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
                      </button>

                      {showTypeDropdown && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => {
                              setShowTypeDropdown(false);
                              setTypeSearchQuery("");
                            }}
                          />
                          <div className="absolute left-0 mt-1.5 w-56 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-lg z-20 flex flex-col animate-in fade-in slide-in-from-top-1 duration-100">
                            <div className="p-2 border-b border-gray-150 bg-slate-50/50 relative flex items-center">
                              <input
                                type="text"
                                placeholder="Cari aktivitas..."
                                value={typeSearchQuery}
                                onChange={(e) => setTypeSearchQuery(e.target.value)}
                                className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-gray-255 rounded-lg outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 transition placeholder:text-gray-400"
                                autoFocus
                              />
                              <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
                              {typeSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setTypeSearchQuery("")}
                                  className="absolute right-3 text-gray-400 hover:text-gray-650"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="overflow-y-auto divide-y divide-gray-100 flex-1 max-h-48 bg-white">
                              {timelineFilters
                                .filter((filter) =>
                                  filter.label.toLowerCase().includes(typeSearchQuery.toLowerCase())
                                )
                                .length === 0 ? (
                                <div className="p-3 text-xs text-gray-400 font-medium text-center">
                                  Tidak ada aktivitas ditemukan.
                                </div>
                              ) : (
                                timelineFilters
                                  .filter((filter) =>
                                    filter.label.toLowerCase().includes(typeSearchQuery.toLowerCase())
                                  )
                                  .map((filter) => (
                                    <button
                                      key={filter.value}
                                      type="button"
                                      onClick={() => {
                                        setTimelineType(filter.value);
                                        setTimelinePage(1);
                                        setShowTypeDropdown(false);
                                        setTypeSearchQuery("");
                                      }}
                                      className={`w-full text-left p-3 text-xs transition hover:bg-slate-50 ${
                                        timelineType === filter.value ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                                      }`}
                                    >
                                      {filter.label}
                                    </button>
                                  ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        placeholder="Cari aktivitas..."
                        className="w-full pl-9 pr-9 py-2 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm"
                        value={timelineSearchInput}
                        onChange={(e) => handleTimelineSearchInput(e.target.value)}
                      />
                      {timelineSearchInput && (
                        <button
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            setTimelineSearchInput("");
                            setTimelineSearch("");
                            setTimelinePage(1);
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {timelineLoading ? (
                  <div className="py-14 text-center text-gray-400 text-sm">Memuat timeline...</div>
                ) : timelineTotal === 0 ? (
                  <div className="py-14 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-300 flex items-center justify-center mx-auto mb-3">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <p className="text-gray-400 text-sm">Belum ada aktivitas untuk aset ini.</p>
                    <button
                      onClick={() => {
                        setTimelinePage(1);
                        setTimelineRefreshKey((key) => key + 1);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Refresh
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="max-h-[480px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-gray-200">
                      <TimelineYearGroups
                        groups={timelineGroups}
                        expandedId={expandedId}
                        setExpandedId={setExpandedId}
                      />
                    </div>

                    <TablePagination
                      currentPage={timelinePage}
                      rowsPerPage={timelineRowsPerPage}
                      totalData={timelineTotal}
                      totalPages={timelineLastPage}
                      onPageChange={setTimelinePage}
                      onRowsPerPageChange={setTimelineRowsPerPage}
                      className="mt-4 pt-4 border-t border-gray-100"
                    />
                  </>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
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
                  className="mt-3 text-xs text-brand-600 hover:underline"
                >
                  Lihat detail aset →
                </button>
              </div>

              <div className="hidden">
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
