import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Auth/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import { AssetsProvider } from "./context/AssetsContext";
import { KaryawanProvider } from "./context/KaryawanContext";

// ── Lazy load semua halaman — hanya di-load saat dibutuhkan ──────────────────
const Dashboard      = lazy(() => import("./pages/Dashboard/Dashboard"));
const AssetList      = lazy(() => import("./pages/Assets/AssetList"));
const AssetDetail    = lazy(() => import("./pages/Assets/AssetDetail"));
const CategoryList   = lazy(() => import("./pages/Categories/CategoryList"));
const MaintenanceList = lazy(() => import("./pages/Maintenance/MaintenanceList"));
const AssignmentList = lazy(() => import("./pages/Assignments/AssignmentList"));
const AssetsByEmployee = lazy(() => import("./pages/Reports/AssetsByEmployee"));
const AuditLogList   = lazy(() => import("./pages/AuditLogs/AuditLogList"));
const ActivityLogList = lazy(() => import("./pages/ActivityLogs/ActivityLogList"));
const PlotingDeviceList = lazy(() => import("./pages/PlotingDevice/PlotingDeviceList"));
const PlotingDeviceDetail = lazy(() => import("./pages/PlotingDevice/PlotingDeviceDetail"));
const StorePackageList = lazy(() => import("./pages/StorePackage/StorePackageList"));
const StorePackageDetail = lazy(() => import("./pages/StorePackage/StorePackageDetail"));
const LoginFromSaloka = lazy(() => import("./pages/Auth/LoginFromSaloka"));

// ── Loading fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Memuat halaman...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* DEFAULT */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* LOGIN */}
          <Route path="/login" element={<Login />} />

          {/* LOGIN FROM SALOKA */}
          <Route path="/auth" element={<LoginFromSaloka />} />

          {/* PROTECTED AREA */}
          <Route
            element={
              <ProtectedRoute>
                <AssetsProvider>
                  <KaryawanProvider>
                    <MainLayout />
                  </KaryawanProvider>
                </AssetsProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/assets"      element={<AssetList />} />
            <Route path="/assets/:id"  element={<AssetDetail />} />
            <Route path="/categories"  element={<CategoryList />} />
            <Route path="/maintenance" element={<MaintenanceList />} />
            <Route path="/assignments" element={<AssignmentList />} />
            <Route path="/employee-assets" element={<AssetsByEmployee />} />
            <Route path="/ploting-devices" element={<PlotingDeviceList />} />
            <Route path="/ploting-devices/:id" element={<PlotingDeviceDetail />} />
            <Route path="/ploting_devices" element={<PlotingDeviceList />} />
            <Route path="/ploting_devices/:id" element={<PlotingDeviceDetail />} />
            <Route path="/store-packages" element={<StorePackageList />} />
            <Route path="/store-packages/:storeCode" element={<StorePackageDetail />} />
            <Route path="/audit-logs"  element={<AuditLogList />} />
            <Route path="/logs"        element={<ActivityLogList />} />
          </Route>

          {/* FALLBACK REDIRECT */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}