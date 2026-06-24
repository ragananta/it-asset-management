import { Suspense, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { LogOut, Menu } from "lucide-react";

// ── Decode JWT tanpa library eksternal ──────────────────────────────────────
function getUserFromToken(): string {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "User";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.name || payload.username || payload.email?.split("@")[0] || "User";
  } catch {
    return "User";
  }
}

// ── Nama halaman berdasarkan path ────────────────────────────────────────────
const PAGE_NAMES: Record<string, string> = {
  "/dashboard":   "Dashboard",
  "/assets":      "Assets",
  "/categories":  "Categories",
  "/maintenance": "Maintenance",
  "/assignments": "Assignments",
  "/employee-assets": "Employee Assets",
  "/ploting-devices": "Tas Package",
  "/store-packages": "Store Package",
  "/audit-logs":  "Audit Logs",
  "/logs":        "Activity Logs",
};

// ── Resolve page name ────────────────────────────────────────────────────────
function getPageName(pathname: string): string {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
  // Sub-route: /assets/123 → "Assets"
  const base = "/" + pathname.split("/")[1];
  return PAGE_NAMES[base] || "IT Asset Management";
}

function InnerPageLoader() {
  return (
    <div className="w-full min-h-[400px] flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-gray-400 font-medium">Memuat halaman...</p>
    </div>
  );
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const userName = useMemo(() => getUserFromToken(), []);
  const pageName = getPageName(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* SIDEBAR */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* BACKDROP OVERLAY FOR MOBILE */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* HEADER */}
        <div className="h-16 shrink-0 bg-white px-6 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-800 text-sm">{pageName}</h1>
              <p className="text-xs text-gray-400">IT Asset Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold uppercase">
                {userName.charAt(0)}
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-gray-700">{userName}</p>
                <p className="text-[10px] text-gray-400">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1 min-h-0 overflow-auto">
          <Suspense fallback={<InnerPageLoader />}>
            <Outlet />
          </Suspense>
        </div>

      </div>

    </div>
  );
}
