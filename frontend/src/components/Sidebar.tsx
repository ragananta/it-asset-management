import {
  LayoutDashboard,
  Package,
  Tag,
  Wrench,
  UserCheck,
  Users,
  ClipboardList,
  ActivitySquare,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo-saloka.png";

export default function Sidebar() {
  const location = useLocation();

  const menus = [
    { name: "Dashboard",      path: "/dashboard",    icon: LayoutDashboard },
    { name: "Categories",     path: "/categories",   icon: Tag },
    { name: "Assets",         path: "/assets",       icon: Package },
    { name: "Maintenance",    path: "/maintenance",  icon: Wrench },
    { name: "Assignments",    path: "/assignments",  icon: UserCheck },
    { name: "Employee Assets", path: "/employee-assets", icon: Users },
    { name: "Audit Logs",     path: "/audit-logs",   icon: ClipboardList },
    { name: "Activity Logs",  path: "/logs",         icon: ActivitySquare },
  ];

  return (
    <div className="w-64 bg-white border-r h-full flex flex-col shrink-0">

      {/* LOGO — selaras dengan tinggi header (h-16) */}
      <div className="h-16 shrink-0 px-4 flex items-center justify-center border-b border-gray-100">
        <img
          src={logo}
          alt="Saloka"
          className="h-8 object-contain"
        />
      </div>

      {/* MENU */}
      <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {menus.map((menu, i) => {
          const Icon = menu.icon;
          // Aktif jika path persis cocok, atau jika sub-route (e.g. /assets/123)
          const active =
            location.pathname === menu.path ||
            (menu.path !== "/dashboard" && location.pathname.startsWith(menu.path + "/"));

          return (
            <Link
              key={i}
              to={menu.path}
              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all
              ${active
                ? "bg-brand-50 text-brand-700 font-semibold"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}
            `}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-500" />
              )}
              <Icon size={17} className={active ? "text-brand-600" : ""} />
              {menu.name}
            </Link>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="p-4 text-[11px] text-gray-300 border-t border-gray-100 text-center tracking-wide">
        IT Asset Management © {new Date().getFullYear()}
      </div>

    </div>
  );
}
