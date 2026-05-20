import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-100">

      {/* SIDEBAR */}
      <Sidebar />

      {/* CONTENT */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
          <h1 className="font-semibold text-gray-700">IT Asset Management</h1>

          <div className="text-sm text-gray-500">
            Halo, User 👋
          </div>
        </div>

        {/* MAIN */}
        <div className="p-6 overflow-auto">
          <Outlet /> {/* 🔥 INI FIX UTAMA */}
        </div>

      </div>
    </div>
  );
}