import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import { usePolling } from "@/hooks/usePolling";
import {
  Smartphone,
  Calendar,
  User,
  ArrowLeft,
  QrCode,
  Printer,
  Download,
  Layers,
  History,
  Wrench,
  Activity,
  Tag,
  Search,
  X,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import TablePagination from "../../components/pagination/TablePagination";

interface Asset {
  id: number;
  asset_name: string;
  asset_code: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  condition_status: "good" | "damaged" | "under_maintenance" | "retired";
  status: "active" | "borrowed" | "disposed";
  category?: { id: number; name: string } | null;
}

interface Assignment {
  id: number;
  asset?: { id: number; asset_name: string; asset_code: string } | null;
  user_name: string;
  phone?: string;
  assign_date: string;
  return_date: string | null;
  note?: string;
}

interface MaintenanceLog {
  id: number;
  asset?: { id: number; asset_name: string; asset_code: string } | null;
  date: string;
  description: string;
  pic: string;
  status: "ongoing" | "completed";
  cost?: number;
}

interface AuditLog {
  id: number;
  asset?: { id: number; asset_name: string; asset_code: string } | null;
  action: string;
  description: string;
  pic: string;
  created_at: string;
}

interface PlotingDeviceMembershipHistory {
  event: "ADD_ASSET" | "REMOVE_ASSET";
  asset_code: string;
  asset_name: string;
  created_at: string;
}

interface PlotingDeviceDetailPayload {
  id: number;
  code: string; // Tas Asset Code
  name: string; // Tas Asset Name
  store_name: string; // Tas Location Name
  description?: string;
  qr_code?: string;
  status: "available" | "borrowed" | "maintenance" | "lost";
  borrowed_by?: string | null;
  borrowed_at?: string | null;
  returned_at?: string | null;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  creator?: { id: number; name: string; email: string } | null;
  assets: Asset[];
  assignments: Assignment[];
  maintenance_logs: MaintenanceLog[];
  audit_logs: AuditLog[];
  membership_history: PlotingDeviceMembershipHistory[];
}

interface ApiTimelineEvent {
  id: string;
  event_type: string;
  category: "asset_in" | "assignment" | "returned" | "maintenance" | "audit" | "data_change";
  category_label: string;
  title: string;
  description: string;
  created_at: string;
  details?: Record<string, any>;
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

const statusLabel: Record<string, string> = {
  available: "Available",
  borrowed: "Borrowed",
  maintenance: "Maintenance",
  lost: "Lost",
};

const statusColor: Record<string, string> = {
  available: "text-emerald-700 bg-emerald-50 border border-emerald-250",
  borrowed: "text-blue-700 bg-blue-50 border border-blue-250",
  maintenance: "text-amber-700 bg-amber-50 border border-amber-250",
  lost: "text-rose-700 bg-rose-50 border border-rose-250",
};

const getConditionBadge = (cond: string) => {
  switch (cond) {
    case "good":
      return <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Good</span>;
    case "under_maintenance":
      return <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Maintenance</span>;
    case "damaged":
      return <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Damaged</span>;
    case "retired":
      return <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-50 text-slate-700 border border-slate-200">Retired</span>;
    default:
      return <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-50 text-gray-700 border border-gray-200">{cond}</span>;
  }
};

const timelineStyle: Record<string, { badge: string; dot: string; line: string; icon: React.ReactNode }> = {
  asset_in: {
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500 ring-emerald-100",
    line: "bg-emerald-200",
    icon: <Smartphone className="w-3.5 h-3.5" />,
  },
  assignment: {
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500 ring-blue-100",
    line: "bg-blue-200",
    icon: <User className="w-3.5 h-3.5" />,
  },
  returned: {
    badge: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    dot: "bg-indigo-500 ring-indigo-100",
    line: "bg-indigo-200",
    icon: <History className="w-3.5 h-3.5" />,
  },
  maintenance: {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500 ring-amber-100",
    line: "bg-amber-200",
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
  audit: {
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-500 ring-rose-100",
    line: "bg-rose-200",
    icon: <Activity className="w-3.5 h-3.5" />,
  },
  data_change: {
    badge: "bg-slate-50 text-slate-700 border border-slate-200",
    dot: "bg-slate-500 ring-slate-100",
    line: "bg-slate-200",
    icon: <Activity className="w-3.5 h-3.5" />,
  },
};

export default function PlotingDeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [device, setDevice] = useState<PlotingDeviceDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"assets" | "assignments" | "maintenance" | "timeline">("assets");

  // Timeline specific states
  const [timelineGroups, setTimelineGroups] = useState<TimelineYearGroup[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineSearchInput, setTimelineSearchInput] = useState("");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineType, setTimelineType] = useState<string>("all");
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineRowsPerPage, setTimelineRowsPerPage] = useState(5);
  const [timelineTotal, setTimelineTotal] = useState(0);
  const [timelineLastPage, setTimelineLastPage] = useState(1);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const timelineSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const isSilentRef = useRef(false);
  const isFetchingDetailRef = useRef(false);
  const isFetchingTimelineRef = useRef(false);

  const triggerSilentRefresh = () => {
    isSilentRef.current = true;
    setRefreshKey((k) => k + 1);
    setTimelineRefreshKey((k) => k + 1);
  };

  usePolling(triggerSilentRefresh, 60000);

  // Fetch Device details
  useEffect(() => {
    let active = true;
    const fetchDetail = async () => {
      if (isFetchingDetailRef.current) return;
      try {
        isFetchingDetailRef.current = true;
        if (!isSilentRef.current) {
          setLoading(true);
        }
        const res = await api.get(`/ploting-devices/${id}`);
        if (active && res?.data?.data) {
          setDevice(res.data.data);
        }
      } catch (err) {
        console.error("ERROR fetch detail:", err);
      } finally {
        isFetchingDetailRef.current = false;
        if (active) {
          setLoading(false);
          isSilentRef.current = false;
        }
      }
    };
    fetchDetail();
    return () => { active = false; };
  }, [id, refreshKey]);

  const formatMembershipDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr.replace(" ", "T"));
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).replace(".", ":");
    } catch {
      return dateStr;
    }
  };

  // Fetch Timeline when timeline tab is active
  useEffect(() => {
    if (activeTab !== "timeline") return;

    let active = true;
    const fetchTimeline = async () => {
      if (isFetchingTimelineRef.current) return;
      try {
        isFetchingTimelineRef.current = true;
        if (!isSilentRef.current) {
          setTimelineLoading(true);
        }
        const params = new URLSearchParams({
          page: String(timelinePage),
          per_page: String(timelineRowsPerPage),
        });
        if (timelineSearch) params.append("search", timelineSearch);
        if (timelineType !== "all") params.append("type", timelineType);

        const res = await api.get(`/ploting-devices/${id}/timeline?${params}`);
        if (!active) return;

        const payload = res?.data?.data;
        if (payload) {
          setTimelineGroups(payload.year_groups || []);
          setTimelineTotal(payload.meta?.total || 0);
          setTimelineLastPage(payload.meta?.last_page || 1);
        }
      } catch (err) {
        console.error("ERROR fetch timeline:", err);
      } finally {
        isFetchingTimelineRef.current = false;
        if (active) {
          setTimelineLoading(false);
          isSilentRef.current = false;
        }
      }
    };
    fetchTimeline();
    return () => { active = false; };
  }, [id, activeTab, timelinePage, timelineRowsPerPage, timelineSearch, timelineType, timelineRefreshKey]);

  // Debounced search for timeline
  const handleTimelineSearchInput = (val: string) => {
    setTimelineSearchInput(val);
    if (timelineSearchTimer.current) clearTimeout(timelineSearchTimer.current);
    timelineSearchTimer.current = setTimeout(() => {
      setTimelineSearch(val);
      setTimelinePage(1);
    }, 400);
  };

  // QR Code Action Handlers
  const handlePrintQR = () => {
    if (!device) return;
    const detailUrl = `${window.location.origin}/ploting-devices/${device.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(detailUrl)}`;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code - ${device.code}</title>
            <style>
              body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90vh; font-family: sans-serif; }
              img { width: 250px; height: 250px; margin-bottom: 20px; }
              h2 { margin: 0; font-size: 20px; color: #333; }
              p { margin: 5px 0 0 0; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <img src="${qrUrl}" onload="window.print();window.close();" />
            <h2>${device.name}</h2>
            <p>${device.code} - ${device.store_name}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadQR = async () => {
    if (!device) return;
    try {
      const detailUrl = `${window.location.origin}/ploting-devices/${device.id}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(detailUrl)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `qrcode-tas-${device.code}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Gagal mendownload QR Code:", err);
      const detailUrl = `${window.location.origin}/ploting-devices/${device.id}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(detailUrl)}`;
      window.open(qrUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col gap-5 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white rounded-xl border border-gray-100 p-6 shadow-sm" />
          <div className="h-72 bg-white rounded-xl border border-gray-100 p-6 shadow-sm" />
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-center flex flex-col items-center justify-center gap-3">
        <FolderOpen className="w-10 h-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Tas tidak ditemukan.</p>
        <button onClick={() => navigate(`/ploting-devices${location.search}`)} className="text-xs text-blue-600 font-bold hover:underline">
          Kembali ke daftar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col gap-6">
      
      {/* HEADER NAVBAR */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/ploting-devices${location.search}`)}
          className="w-10 h-10 border border-gray-200 bg-white rounded-full flex items-center justify-center text-gray-555 hover:bg-gray-50 transition shadow-sm hover:shadow"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Detail Asset Package</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tas: {device.code} — {device.name}</p>
        </div>
      </div>

      {/* GRID OVERVIEW & QR CODE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TAS INFO CARD */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-800">{device.name}</h3>
                <p className="text-xs text-slate-450 mt-1 font-mono font-bold">{device.code}</p>
              </div>
              <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${statusColor[device.status]}`}>
                {statusLabel[device.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Store / Lokasi</p>
                <p className="text-sm font-bold text-slate-700 mt-1">{device.store_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Kategori Kontainer</p>
                <p className="text-sm font-bold text-slate-700 mt-1">Tas</p>
              </div>
            </div>
            {device.description && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Description / Note</p>
                <p className="text-xs text-slate-660 leading-relaxed mt-1">{device.description}</p>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Terdaftar pada {device.created_at ? new Date(device.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
          </div>
        </div>

        {/* QR CODE CARD */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col items-center justify-between text-center gap-4 min-h-[300px]">
          <div className="flex items-center gap-2 self-start">
            <QrCode className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">QR Code Asset Tas</h2>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-inner flex items-center justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${window.location.origin}/ploting-devices/${device.id}`)}`}
              alt={`QR Code ${device.code}`}
              className="w-40 h-40 object-contain"
            />
          </div>

          <div className="w-full flex gap-2">
            <button
              onClick={handlePrintQR}
              className="flex-1 h-9 bg-slate-50 hover:bg-slate-100 transition text-slate-700 border border-slate-200 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak QR
            </button>
            <button
              onClick={handleDownloadQR}
              className="flex-1 h-9 bg-teal-50 hover:bg-teal-100 transition text-teal-600 border border-teal-200 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Unduh QR
            </button>
          </div>
        </div>

      </div>

      {/* TABBED DETAILS NAVIGATION */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        
        {/* Tabs Headers */}
        <div className="flex border-b border-gray-100 px-4 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition duration-200 ${
              activeTab === "assets"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-gray-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Asset Dalam Tas ({device.assets.length})
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition duration-200 ${
              activeTab === "assignments"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-gray-500 hover:text-slate-800"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Riwayat Isi Tas ({device.membership_history.length})
          </button>
          <button
            onClick={() => setActiveTab("maintenance")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition duration-200 ${
              activeTab === "maintenance"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-gray-500 hover:text-slate-800"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Maintenance Tas ({device.maintenance_logs.length})
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition duration-200 ${
              activeTab === "timeline"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-gray-500 hover:text-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Timeline Aktivitas
          </button>
        </div>

        {/* Tab Content Box */}
        <div className="p-5">
          
          {/* TAB 1: ASSETS */}
          {activeTab === "assets" && (
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                    <th className="py-2.5 px-4 w-28">Kode Aset</th>
                    <th className="py-2.5 px-4">Nama Aset</th>
                    <th className="py-2.5 px-4">Brand/Model</th>
                    <th className="py-2.5 px-4">Kategori</th>
                    <th className="py-2.5 px-4 text-center w-28">Kondisi</th>
                    <th className="py-2.5 px-4 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {device.assets.map((asset, i) => (
                    <tr key={asset.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-4 text-center text-slate-400">{i + 1}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-700">{asset.asset_code}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{asset.asset_name}</td>
                      <td className="py-2.5 px-4 text-slate-550">
                        {asset.brand || "-"} {asset.model ? `(${asset.model})` : ""}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          <Tag className="w-3.5 h-3.5 text-slate-400" /> {asset.category?.name || "-"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">{getConditionBadge(asset.condition_status)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                          asset.status === "active"
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                            : asset.status === "borrowed"
                            ? "text-blue-700 bg-blue-50 border border-blue-200"
                            : "text-gray-500 bg-gray-50 border border-gray-200"
                        }`}>
                          {asset.status === "active" ? "Aktif" : asset.status === "borrowed" ? "Dipinjam" : asset.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {device.assets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Belum ada aset pendukung dimasukkan ke dalam Tas ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}          {/* TAB 2: RIWAYAT ISI TAS */}
          {activeTab === "assignments" && (
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                    <th className="py-2.5 px-4 w-44 text-center">Timestamp</th>
                    <th className="py-2.5 px-4 w-32 text-center">Action</th>
                    <th className="py-2.5 px-4 w-40">Asset Code</th>
                    <th className="py-2.5 px-4">Asset Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs bg-white">
                  {device.membership_history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Belum ada riwayat perubahan isi Tas.
                      </td>
                    </tr>
                  ) : (
                    device.membership_history.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition">
                        <td className="py-2.5 px-4 text-center text-slate-400">{i + 1}</td>
                        <td className="py-2.5 px-4 text-center text-slate-550 font-mono text-xs">
                          {formatMembershipDate(item.created_at)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                            item.event === "ADD_ASSET"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {item.event === "ADD_ASSET" ? "Added" : "Removed"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-700">
                          {item.asset_code}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {item.asset_name}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: MAINTENANCE LOGS */}
          {activeTab === "maintenance" && (
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                    <th className="py-2.5 px-4">Teknisi / PIC</th>
                    <th className="py-2.5 px-4">Deskripsi Perbaikan</th>
                    <th className="py-2.5 px-4 text-center w-32">Tanggal</th>
                    <th className="py-2.5 px-4 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {device.maintenance_logs.map((maint, i) => (
                    <tr key={maint.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-4 text-center text-slate-400">{i + 1}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{maint.pic}</td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-[250px] truncate" title={maint.description}>
                        {maint.description}
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-500">
                        {new Date(maint.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold rounded-full ${
                          maint.status === "completed"
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                            : "text-amber-700 bg-amber-50 border border-amber-250 animate-pulse"
                        }`}>
                          {maint.status === "completed" ? "Selesai" : "Berlangsung"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {device.maintenance_logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Belum ada riwayat perbaikan terdaftar untuk Tas ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: ACTIVITY HISTORY TIMELINE */}
          {activeTab === "timeline" && (
            <div className="space-y-5">
              
              {/* Timeline Toolbar Filter */}
              <div className="flex flex-wrap items-center gap-3 justify-between bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <select
                    value={timelineType}
                    onChange={(e) => { setTimelineType(e.target.value); setTimelinePage(1); }}
                    className="border border-gray-200 rounded-full px-4 py-1.5 text-xs bg-white cursor-pointer shadow-sm focus:outline-none"
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="asset_in">Tas Terdaftar</option>
                    <option value="assignment">Peminjaman</option>
                    <option value="returned">Pengembalian</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="audit">Audit Log</option>
                  </select>

                  <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input
                      placeholder="Cari timeline..."
                      value={timelineSearchInput}
                      onChange={(e) => handleTimelineSearchInput(e.target.value)}
                      className="w-full h-8 pl-8 pr-8 rounded-full border border-gray-200 bg-white text-xs focus:outline-none focus:border-brand-500 shadow-sm"
                    />
                    {timelineSearchInput && (
                      <button
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
                        onClick={() => { setTimelineSearchInput(""); setTimelineSearch(""); setTimelinePage(1); }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setTimelineRefreshKey((k) => k + 1)}
                  className="w-8 h-8 border border-gray-200 rounded-full bg-white text-gray-500 hover:text-brand-600 transition flex items-center justify-center shadow-sm"
                  title="Muat ulang timeline"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${timelineLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* TIMELINE RENDER */}
              <div className="max-h-[480px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-gray-200">
                {timelineLoading && timelineGroups.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">Memuat timeline...</div>
                ) : timelineGroups.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">Tidak ada riwayat aktivitas.</div>
                ) : (
                  <div className="relative border-l-2 border-gray-150 ml-4.5 pl-6 space-y-6 py-2">
                    {timelineGroups.map((yearGroup) => (
                      <div key={yearGroup.year} className="space-y-4">
                        {yearGroup.months.map((monthGroup) => (
                          <div key={monthGroup.month} className="space-y-4">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest relative -left-[30px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded inline-block shadow-sm">
                              {monthGroup.month} {yearGroup.year}
                            </h4>
                            
                            {monthGroup.events.map((event) => {
                              const style = timelineStyle[event.category] || timelineStyle.data_change;
                              return (
                                <div key={event.id} className="relative group">
                                  {/* Timeline Circle Node */}
                                  <div className={`absolute -left-[32px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm ring-4 transition group-hover:scale-110 ${style.dot}`}>
                                    <div className="scale-75 text-white">{style.icon}</div>
                                  </div>

                                  <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow transition duration-200 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                                        {event.category_label}
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        {new Date(event.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                    <h5 className="text-xs font-bold text-slate-800">{event.title}</h5>
                                    <p className="text-xs text-slate-500 leading-relaxed">{event.description}</p>
                                    
                                    {event.details && Object.keys(event.details).length > 0 && (
                                      <div className="bg-slate-50 border border-slate-100/60 rounded-lg p-2.5 mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-605">
                                        {Object.entries(event.details).map(([k, v]) => (
                                          <div key={k}>
                                            <span className="font-semibold text-slate-700">{k}:</span> {String(v || "-")}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TIMELINE PAGINATION CONTROLS */}
              {timelineTotal > timelineRowsPerPage && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-400 font-medium">
                    Total {timelineTotal} riwayat
                  </span>
                  <div className="flex gap-2.5">
                    <button
                      disabled={timelinePage <= 1 || timelineLoading}
                      onClick={() => setTimelinePage((p) => p - 1)}
                      className="px-3 h-8 border border-gray-200 hover:bg-slate-50 disabled:opacity-50 transition rounded-lg font-semibold text-slate-650"
                    >
                      Sebelumnya
                    </button>
                    <button
                      disabled={timelinePage >= timelineLastPage || timelineLoading}
                      onClick={() => setTimelinePage((p) => p + 1)}
                      className="px-3 h-8 border border-gray-200 hover:bg-slate-50 disabled:opacity-50 transition rounded-lg font-semibold text-slate-650"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
