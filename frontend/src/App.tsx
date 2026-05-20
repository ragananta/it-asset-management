import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import AssetList from "./pages/Assets/AssetList";
import AssetDetail from "./pages/Assets/AssetDetail";
import CategoryList from "./pages/Categories/CategoryList";
import MaintenanceList from "./pages/Maintenance/MaintenanceList";
import AssignmentList from "./pages/Assignments/AssignmentList";
import AuditLogList from "./pages/AuditLogs/AuditLogList";
import ActivityLogList from "./pages/ActivityLogs/ActivityLogList";

import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* DEFAULT */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* PROTECTED AREA */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* DASHBOARD */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* ASSETS */}
          <Route path="/assets" element={<AssetList />} />
          <Route path="/assets/:id" element={<AssetDetail />} />

          {/* CATEGORIES */}
          <Route path="/categories" element={<CategoryList />} />

          {/* MAINTENANCE */}
          <Route path="/maintenance" element={<MaintenanceList />} />

          {/* ASSIGNMENTS */}
          <Route path="/assignments" element={<AssignmentList />} />

          {/* AUDIT LOGS */}
          <Route path="/audit-logs" element={<AuditLogList />} />

          {/* ACTIVITY LOGS */}
          <Route path="/logs" element={<ActivityLogList />} />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}