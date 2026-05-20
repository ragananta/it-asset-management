import {
  LayoutDashboard,
  Package,
  Tag,
  Wrench,
  UserCheck,
  ClipboardList,
  ActivitySquare,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo-saloka.png";

export default function Sidebar() {
  const location = useLocation();

  const menus = [
    { name: "Dashboard",      path: "/dashboard",    icon: LayoutDashboard },
    { name: "Assets",         path: "/assets",       icon: Package },
    { name: "Categories",     path: "/categories",   icon: Tag },
    { name: "Maintenance",    path: "/maintenance",  icon: Wrench },
    { name: "Assignments",    path: "/assignments",  icon: UserCheck },
    { name: "Audit Logs",     path: "/audit-logs",   icon: ClipboardList },
    { name: "Activity Logs",  path: "/logs",         icon: ActivitySquare },
  ];

  return (
    <div className="w-64 bg-white border-r h-full flex flex-col">

      {/* LOGO */}
      <div className="px-4 py-5 flex items-center justify-center border-b border-gray-100">
        <img
          src={logo}
          alt="Saloka"
          className="h-10 object-contain"
        />
      </div>

      {/* MENU */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menus.map((menu, i) => {
          const Icon = menu.icon;
          const active = location.pathname === menu.path;

          return (
            <Link
              key={i}
              to={menu.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition
              ${active
                ? "bg-green-100 text-green-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"}
              `}
            >
              <Icon size={18} />
              {menu.name}
            </Link>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="p-4 text-xs text-gray-400 border-t border-gray-100">
        IT Asset System
      </div>

    </div>
  );
}