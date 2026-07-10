import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { useKaryawan } from "../../context/KaryawanContext";
import TablePagination from "../../components/pagination/TablePagination";
import { useRowsPerPage } from "../../hooks/useRowsPerPage";
import {
  Users,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Phone,
  Calendar,
  Tag,
  Briefcase,
  MapPin,
  FileSpreadsheet,
  Search,
  X
} from "lucide-react";
import ExportConfirmationModal from "../../components/ExportConfirmationModal";

interface EmployeeAsset {
  id: number;
  asset_code: string;
  asset_name: string;
  category: string;
  condition_status: "good" | "damaged" | "under_maintenance" | "retired";
  status: "active" | "borrowed" | "disposed";
  purchase_price: number;
  assign_date: string;
}

interface GroupedEmployee {
  user_name: string;
  phone: string | null;
  total_assets: number;
  total_value: number;
  assets: EmployeeAsset[];
}

interface PaginationInfo {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export default function AssetsByEmployee() {
  const { karyawanList, ensureKaryawan } = useKaryawan();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State data
  const [employees, setEmployees] = useState<GroupedEmployee[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1
  });
  
  // UI and Filters
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [filterDept, setFilterDept] = useState(() => searchParams.get("department") || "");
  const initialSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(searchParams.get("page") || "1", 10);
  });
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "user_name");
  const [sortOrder, setSortOrder] = useState(() => searchParams.get("order") || "asc");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);


  useEffect(() => {
    const params: Record<string, string> = {};
    if (currentPage > 1) params.page = String(currentPage);
    if (search) params.search = search;
    if (filterDept) params.department = filterDept;
    if (sortBy && sortBy !== "user_name") params.sort = sortBy;
    if (sortOrder && sortOrder !== "asc") params.order = sortOrder;
    setSearchParams(params, { replace: true });
  }, [currentPage, search, filterDept, rowsPerPage, sortBy, sortOrder, setSearchParams]);

  const [refreshKey, setRefreshKey] = useState(0);

  const isSilentRef = useRef(false);
  const isFetchingRef = useRef(false);



  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 400);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Accordion state (expanded employee names)
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});

  // Ensure Karyawan context is loaded (for department mapping)
  useEffect(() => {
    ensureKaryawan();
  }, [ensureKaryawan]);

  // Map employee name -> department & position map for quick access
  const employeeDetailsMap = useMemo(() => {
    const detailsMap = new Map<string, { department: string; pos: string }>();
    karyawanList.forEach((k) => {
      if (k.name) {
        detailsMap.set(k.name.toLowerCase(), {
          department: k.departemen,
          pos: k.pos
        });
      }
    });
    return detailsMap;
  }, [karyawanList]);

  // Extract unique departments from Karyawan list for the filter dropdown
  const departmentOptions = useMemo(() => {
    const depts = new Set<string>();
    karyawanList.forEach((k) => {
      if (k.departemen) depts.add(k.departemen);
    });
    return Array.from(depts).sort();
  }, [karyawanList]);

  const filteredDeptOptions = useMemo(() => {
    if (!deptSearchQuery) return departmentOptions;
    return departmentOptions.filter((dept) =>
      dept.toLowerCase().includes(deptSearchQuery.toLowerCase())
    );
  }, [departmentOptions, deptSearchQuery]);

  const sortedEmployees = useMemo(() => {
    const list = [...employees];
    list.sort((a, b) => {
      const valA = a[sortBy as keyof GroupedEmployee] ?? "";
      const valB = b[sortBy as keyof GroupedEmployee] ?? "";

      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB as string)
          : (valB as string).localeCompare(valA);
      } else {
        return sortOrder === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });
    return list;
  }, [employees, sortBy, sortOrder]);

  // Fetch report data
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      if (isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        if (!isSilentRef.current) {
          setLoading(true);
        }
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(rowsPerPage)
        });
        if (filterDept) params.append("department", filterDept);
        if (search) params.append("search", search);

        const res = await api.get(`/reports/assets-by-employee?${params}`, {
          signal: controller.signal,
          noCache: true
        } as any);

        const payload = res?.data?.data;
        if (payload) {
          setEmployees(payload.employees || []);
          setPagination(payload.pagination || { current_page: 1, per_page: 10, total: 0, last_page: 1 });
        }
      } catch (err: any) {
        if (err.name !== "CanceledError") {
          console.error("ERROR fetch assets-by-employee:", err);
        }
      } finally {
        isFetchingRef.current = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          if (!isSilentRef.current) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          isSilentRef.current = false;
        }
      }
    };
    fetchData();
    return () => {
      controller.abort();
      isFetchingRef.current = false;
    };
  }, [currentPage, rowsPerPage, filterDept, search, refreshKey]);

  // Expand / collapse all toggle helper
  const toggleAll = (expand: boolean) => {
    const nextState: Record<string, boolean> = {};
    employees.forEach((emp) => {
      nextState[emp.user_name] = expand;
    });
    setExpandedEmployees(nextState);
  };

  const isAllExpanded = useMemo(() => {
    if (employees.length === 0) return false;
    return employees.every((emp) => expandedEmployees[emp.user_name]);
  }, [employees, expandedEmployees]);

  // Export to Excel
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (filterDept) params.append("department", filterDept);
      if (search) params.append("search", search);
      if (sortBy) params.append("sort_by", sortBy);
      if (sortOrder) params.append("sort_order", sortOrder);
      
      const res = await api.get(`/reports/assets-by-employee/export?${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `laporan-aset-karyawan-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast("Data berhasil diekspor.");
    } catch (err) {
      console.error("ERROR export assets-by-employee:", err);
      setToast("Gagal melakukan export data");
    } finally {
      setExporting(false);
    }
  };

  const toggleExpand = (userName: string) => {
    setExpandedEmployees((prev) => ({
      ...prev,
      [userName]: !prev[userName]
    }));
  };

  // Helper formatter for currency
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Condition Badges styling helper
  const getConditionBadge = (cond: string) => {
    switch (cond) {
      case "good":
        return <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-250">Bagus</span>;
      case "under_maintenance":
        return <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-250">Maintenance</span>;
      case "damaged":
        return <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-255">Rusak</span>;
      case "retired":
        return <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-50 text-slate-700 border border-slate-250">Diarsipkan</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-50 text-gray-700 border border-gray-250">{cond}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Department Filter */}
          <div className="relative w-full sm:w-64">
            <button
              type="button"
              onClick={() => setShowDeptDropdown(!showDeptDropdown)}
              className="w-full h-10 px-5 flex items-center justify-between rounded-full border border-gray-250 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm cursor-pointer"
            >
              <span className={filterDept ? "text-slate-800 font-semibold" : "text-gray-400"}>
                {filterDept || "Semua Departemen"}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </button>

            {showDeptDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setShowDeptDropdown(false);
                    setDeptSearchQuery("");
                  }}
                />
                <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-lg z-20 flex flex-col">
                  <div className="p-2 border-b border-gray-150 bg-slate-50/50 relative flex items-center">
                    <input
                      type="text"
                      placeholder="Cari departemen..."
                      value={deptSearchQuery}
                      onChange={(e) => setDeptSearchQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-gray-255 rounded-lg outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 transition placeholder:text-gray-400"
                      autoFocus
                    />
                    <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
                    {deptSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setDeptSearchQuery("")}
                        className="absolute right-3 text-gray-400 hover:text-gray-650"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto divide-y divide-gray-100 flex-1 max-h-48 bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterDept("");
                        setCurrentPage(1);
                        setShowDeptDropdown(false);
                        setDeptSearchQuery("");
                      }}
                      className={`w-full text-left p-3 text-xs transition hover:bg-slate-50 ${
                        !filterDept ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                      }`}
                    >
                      Semua Departemen
                    </button>
                    {filteredDeptOptions.length === 0 ? (
                      <div className="p-3 text-xs text-gray-450 font-medium text-center">
                        Tidak ada departemen ditemukan.
                      </div>
                    ) : (
                      filteredDeptOptions.map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => {
                            setFilterDept(dept);
                            setCurrentPage(1);
                            setShowDeptDropdown(false);
                            setDeptSearchQuery("");
                          }}
                          className={`w-full text-left p-3 text-xs transition hover:bg-slate-50 ${
                            filterDept === dept ? "bg-brand-50/50 font-semibold text-brand-700" : "text-slate-700"
                          }`}
                        >
                          {dept}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              placeholder="Cari karyawan, nama atau kode aset..."
              className="w-full h-10 pl-9 pr-9 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15 shadow-sm"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
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
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Toggle Expand/Collapse All */}
          <button
            onClick={() => toggleAll(!isAllExpanded)}
            className="h-10 px-5 border border-gray-200 rounded-full text-sm font-medium text-gray-650 bg-white hover:bg-gray-50 transition flex items-center gap-1.5 shadow-sm"
          >
            {isAllExpanded ? "Collapse Semua" : "Expand Semua"}
          </button>

          {/* Export to Excel */}
          <button
            onClick={() => setShowExportConfirm(true)}
            disabled={exporting || loading}
            className="h-10 px-5 bg-brand-50 border border-brand-200 rounded-full text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-brand-600" />
            {exporting ? "Mengekspor..." : "Export Excel"}
          </button>
        </div>
      </div>

      {/* PAGINATION TOP */}
      {!loading && pagination.total > 0 && (
        <TablePagination
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          totalData={pagination.total}
          totalPages={pagination.last_page}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
          className="mb-0"
        />
      )}

      {/* Table-like headers for sorting */}
      {!loading && employees.length > 0 && (
        <div className="bg-white rounded-xl px-6 py-3.5 flex items-center justify-between text-slate-500 font-semibold text-xs uppercase tracking-wider select-none border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 shrink-0" />
            <button 
              onClick={() => handleSort("user_name")}
              className="font-semibold cursor-pointer hover:text-slate-800 transition flex items-center gap-1 focus:outline-none truncate"
            >
              <span>Nama Karyawan</span>
            </button>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <button 
              onClick={() => handleSort("total_value")}
              className="hidden sm:flex w-32 justify-end font-semibold cursor-pointer hover:text-slate-850 transition items-center gap-1 focus:outline-none"
            >
              <span>Total Nilai</span>
            </button>
            <button 
              onClick={() => handleSort("total_assets")}
              className="w-24 justify-end font-semibold cursor-pointer hover:text-slate-850 transition flex items-center gap-1 focus:outline-none"
            >
              <span>Total Aset</span>
            </button>
            <div className="w-8 shrink-0" />
          </div>
        </div>
      )}

      {/* GROUPED CONTENT CARDS */}
      <div className="flex flex-col gap-4">
        {loading ? (
          // Skeleton loader
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="h-5 bg-slate-200 rounded-lg w-1/3" />
                <div className="h-4 bg-slate-200 rounded-lg w-24" />
              </div>
              <div className="h-4 bg-slate-100 rounded-lg w-1/4 mb-4" />
              <div className="h-12 bg-slate-50 rounded-lg w-full" />
            </div>
          ))
        ) : employees.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Tidak Ada Data Aset Karyawan</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {filterDept || search
                ? "Tidak ada hasil yang cocok dengan kriteria pencarian atau filter Anda."
                : "Saat ini tidak ada aset yang sedang aktif dipinjam atau digunakan oleh karyawan."}
            </p>
            {(filterDept || search) && (
              <button
                onClick={() => {
                  setFilterDept("");
                  setSearchInput("");
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-850 underline"
              >
                Clear semua filter & pencarian
              </button>
            )}
          </div>
        ) : (
          // Data list
          sortedEmployees.map((emp) => {
            const isExpanded = !!expandedEmployees[emp.user_name];
            
            // Resolve department details from map
            const details = employeeDetailsMap.get(emp.user_name.toLowerCase());
            const department = details?.department || "Unknown Dept";
            const position = details?.pos || "Karyawan";

            return (
              <div
                key={emp.user_name}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition duration-300"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleExpand(emp.user_name)}
                  className="px-6 py-5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/50 transition duration-150"
                >
                  {/* Left section: Avatar + Nama Karyawan */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Circle avatar badge */}
                    <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-100 shrink-0">
                      <Users className="w-5.5 h-5.5 text-brand-600" />
                    </div>

                    <div className="flex flex-col gap-0.5 min-w-0">
                      <h4 className="font-bold text-slate-800 text-base flex items-center gap-2 truncate">
                        <span className="truncate">{emp.user_name}</span>
                        {emp.phone && (
                          <a
                            href={`https://wa.me/${emp.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition shrink-0"
                            title={`Hubungi WhatsApp: ${emp.phone}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 truncate">
                        <span className="flex items-center gap-1 font-semibold text-slate-600 truncate">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" /> <span className="truncate">{position}</span>
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /> <span className="truncate">{department}</span>
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right section: Total Nilai + Total Aset + Chevron icon */}
                  <div className="flex items-center gap-6 shrink-0">
                    {/* Total Nilai Value (w-32) */}
                    <div className="hidden sm:flex flex-col items-end w-32 justify-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Total Nilai</span>
                      <span className="text-sm font-bold text-brand-600">{formatRupiah(emp.total_value)}</span>
                    </div>

                    {/* Total Aset Badge (w-24) */}
                    <div className="w-24 flex justify-end">
                      <div className="bg-brand-50 border border-brand-100 rounded-full px-3 py-1 flex items-center gap-2 shadow-sm text-xs font-semibold text-brand-700 select-none">
                        <span className="text-brand-600 text-[10px] font-bold uppercase tracking-wider">Aset</span>
                        <span className="bg-brand-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                          {emp.total_assets}
                        </span>
                      </div>
                    </div>

                    {/* Expand/Collapse Chevron Button (w-8) */}
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 transition-transform duration-300 hover:bg-gray-100 border border-gray-200 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 transition-transform duration-300" />
                      ) : (
                        <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Accordion Content Table */}
                {isExpanded && (
                  <div className="border-t border-gray-50 bg-gray-50/10 p-5 transition-all duration-300">
                    <div className="overflow-x-auto bg-white rounded-lg border border-gray-100 shadow-sm">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                            <th className="py-3 px-4 font-bold">Kode Aset</th>
                            <th className="py-3 px-4 font-bold">Nama Aset</th>
                            <th className="py-3 px-4 font-bold">Kategori</th>
                            <th className="py-3 px-4 font-bold">Kondisi</th>
                            <th className="py-3 px-4 font-bold text-right">Nilai Aset</th>
                            <th className="py-3 px-4 font-bold text-center">Tgl Pinjam</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {emp.assets.map((asset) => (
                            <tr key={asset.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3.5 px-4 font-semibold text-slate-700 font-mono text-xs">
                                {asset.asset_code}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-800">
                                {asset.asset_name}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <Tag className="w-3.5 h-3.5 text-gray-400" /> {asset.category}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {getConditionBadge(asset.condition_status)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                                {formatRupiah(asset.purchase_price)}
                              </td>
                              <td className="py-3.5 px-4 text-center text-slate-500 text-xs">
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                  {new Date(asset.assign_date).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
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
        onConfirm={handleExport}
      />
    </div>
  );
}
