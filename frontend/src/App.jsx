import { useState } from "react";

import Login from "./pages/Login/login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Assets from "./pages/Assets/Assets";
import Users from "./pages/Users/Users";

import MainLayout from "./layout/MainLayout";

function App() {
  // 🔐 cek login dari token
  const [isLogin, setIsLogin] = useState(
    !!localStorage.getItem("token")
  );

  // 📄 kontrol halaman
  const [page, setPage] = useState("dashboard");

  // 🔓 logout
  const logout = () => {
    localStorage.removeItem("token");
    setIsLogin(false);
  };

  // 🔁 render halaman sesuai menu
  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard />;
      case "assets":
        return <Assets />;
      case "users":
        return <Users />;
      default:
        return <Dashboard />;
    }
  };

  return isLogin ? (
    <MainLayout
      onLogout={logout}
      page={page}
      setPage={setPage}
    >
      {renderPage()}
    </MainLayout>
  ) : (
    <Login onLogin={() => setIsLogin(true)} />
  );
}

export default App;