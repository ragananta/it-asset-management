import { useEffect, useState } from "react";
import api from "@/api/axios";

export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
      <p className="text-gray-500 mb-6">
        Selamat datang, gibral 👋
      </p>

      {/* CARD */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Total Assets</p>
          <h3 className="text-xl font-bold">120</h3>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Good Condition</p>
          <h3 className="text-xl font-bold text-green-600">100</h3>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Maintenance</p>
          <h3 className="text-xl font-bold text-orange-500">20</h3>
        </div>

      </div>
    </div>
  );
}