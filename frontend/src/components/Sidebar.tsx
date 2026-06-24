import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Tag,
  Wrench,
  UserCheck,
  Users,
  ClipboardList,
  ActivitySquare,
  Boxes,
  ChevronDown,
  Store,
  Laptop,
  Barcode,
  BarChart3,
  Settings,
  History,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo-saloka.png";

export default function Sidebar() {
  const location = useLocation();

  // State to track open dropdown menus
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(() => {
    return {
      "Inventory":
        location.pathname.startsWith("/assets") ||
        location.pathname.startsWith("/categories"),
      "Operations":
        location.pathname.startsWith("/assignments") ||
        location.pathname.startsWith("/maintenance") ||
        location.pathname.startsWith("/ploting-devices") ||
        location.pathname.startsWith("/ploting_devices") ||
        location.pathname.startsWith("/store-packages"),
      "Reports":
        location.pathname.startsWith("/employee-assets") ||
        location.pathname.startsWith("/audit-logs"),
      "System":
        location.pathname.startsWith("/logs")
    };
  });

  useEffect(() => {
    setOpenDropdowns((prev) => {
      const next = { ...prev };
      if (
        location.pathname.startsWith("/assets") ||
        location.pathname.startsWith("/categories")
      ) {
        next["Inventory"] = true;
      }
      if (
        location.pathname.startsWith("/assignments") ||
        location.pathname.startsWith("/maintenance") ||
        location.pathname.startsWith("/ploting-devices") ||
        location.pathname.startsWith("/ploting_devices") ||
        location.pathname.startsWith("/store-packages")
      ) {
        next["Operations"] = true;
      }
      if (
        location.pathname.startsWith("/employee-assets") ||
        location.pathname.startsWith("/audit-logs")
      ) {
        next["Reports"] = true;
      }
      if (location.pathname.startsWith("/logs")) {
        next["System"] = true;
      }
      return next;
    });
  }, [location.pathname]);

  const menus = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    {
      name: "Inventory",
      icon: Package,
      children: [
        { name: "Categories", path: "/categories", icon: Tag },
        { name: "Asset List", path: "/assets", icon: Laptop },
      ]
    },
    {
      name: "Operations",
      icon: Boxes,
      children: [
        { name: "Asset Assignments", path: "/assignments", icon: UserCheck },
        { name: "Maintenance", path: "/maintenance", icon: Wrench },
        { name: "Tas Package", path: "/ploting-devices", icon: Barcode },
        { name: "Store Package", path: "/store-packages", icon: Store },
      ]
    },
    {
      name: "Reports",
      icon: BarChart3,
      children: [
        { name: "Asset By Employee", path: "/employee-assets", icon: Users },
        { name: "Audit Logs", path: "/audit-logs", icon: History },
      ]
    },
    {
      name: "System",
      icon: Settings,
      children: [
        { name: "Activity Logs", path: "/logs", icon: ActivitySquare },
      ]
    }
  ];

  return (
    <div className="w-64 bg-white h-full flex flex-col shrink-0">

      {/* LOGO — selaras dengan tinggi header (h-16) */}
      <div className="h-16 shrink-0 px-4 flex items-center justify-center">
        <img
          src={logo}
          alt="Saloka"
          className="h-11 object-contain"
        />
      </div>

      {/* MENU */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menus.map((menu, i) => {
          if ('children' in menu && menu.children) {
            const Icon = menu.icon;
            const isDropdownOpen = !!openDropdowns[menu.name];
            const hasActiveChild = menu.children.some(child =>
              location.pathname === child.path ||
              location.pathname.startsWith(child.path + "/")
            );

            return (
              <div key={i} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setOpenDropdowns(prev => ({ ...prev, [menu.name]: !prev[menu.name] }))}
                  className={`w-full relative flex items-center justify-between px-4 py-2 rounded-lg text-[13.5px] transition-all group
                    ${hasActiveChild
                      ? "text-brand-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
                  `}
                >
                  {hasActiveChild && !isDropdownOpen && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-500" />
                  )}
                  <div className="flex items-center gap-3">
                    <Icon 
                      size={18} 
                      className={`transition-colors duration-200 
                        ${hasActiveChild 
                          ? "text-brand-600" 
                          : "text-slate-400 group-hover:text-slate-600"}`} 
                    />
                    <span>{menu.name}</span>
                  </div>
                  <ChevronDown 
                    size={14} 
                    className={`text-slate-400 transition-transform duration-200 group-hover:text-slate-600
                      ${isDropdownOpen ? "rotate-0" : "-rotate-90"}`} 
                  />
                </button>

                {isDropdownOpen && (
                  <div className="ml-[24px] pl-4 border-l border-gray-100 space-y-1 mt-0.5 mb-1.5">
                    {menu.children.map((child, ci) => {
                      const childActive =
                        location.pathname === child.path ||
                        location.pathname.startsWith(child.path + "/");
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={ci}
                          to={child.path}
                          className={`relative flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12.5px] transition-all group
                            ${childActive
                              ? "bg-brand-50/70 text-brand-700 font-semibold"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}
                          `}
                        >
                          {ChildIcon && (
                            <ChildIcon 
                              size={14} 
                              className={`transition-colors duration-200 
                                ${childActive 
                                  ? "text-brand-600" 
                                  : "text-slate-400 group-hover:text-slate-500"}`} 
                            />
                          )}
                          <span>{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const Icon = menu.icon;
          const active =
            location.pathname === menu.path ||
            (menu.path !== "/dashboard" && location.pathname.startsWith(menu.path + "/"));

          return (
            <Link
              key={i}
              to={menu.path}
              className={`relative flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] transition-all group
              ${active
                ? "bg-brand-50/70 text-brand-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
            `}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-500" />
              )}
              <Icon 
                size={18} 
                className={`transition-colors duration-200 
                  ${active 
                    ? "text-brand-600" 
                    : "text-slate-400 group-hover:text-slate-600"}`} 
              />
              {menu.name}
            </Link>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="p-4 text-[11px] text-gray-300 text-center tracking-wide">
        IT Asset Management © {new Date().getFullYear()}
      </div>

    </div>
  );
}
