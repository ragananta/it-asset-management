import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { User, Key, Eye, EyeOff, Monitor } from "lucide-react";

const SALOKA_GREEN       = "#2BA56E";
const SALOKA_GREEN_DARK  = "#228A5A";
const SALOKA_GREEN_LIGHT = "#E8F7F1";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const res = await api.post("/auth/login", form);
      localStorage.setItem("token", res.data.data.token);
      navigate("/dashboard"); // ← tidak reload halaman
    } catch (err: any) {
      alert(err.response?.data?.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="h-screen flex items-center justify-center relative overflow-hidden bg-white">

      {/* BACKGROUND PATTERN */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/background.jpg')",
          backgroundRepeat: "repeat",
          backgroundSize: "1500px",
          opacity: 0.50,
        }}
      />

      {/* subtle green accent blobs */}
      <div
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: SALOKA_GREEN_LIGHT, filter: "blur(60px)", opacity: 0.7 }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: SALOKA_GREEN_LIGHT, filter: "blur(80px)", opacity: 0.6 }}
      />

      {/* WRAPPER — logo + card stacked */}
      <div className="relative z-10 flex flex-col items-center">

        {/* LOGO — outside card */}
        <img
          src="/logo-saloka.png"
          alt="Saloka"
          className="h-14 object-contain mb-6 drop-shadow"
        />

        {/* CARD */}
        <div className="bg-white w-[360px] rounded-2xl shadow-2xl overflow-hidden">

          {/* card top accent bar */}
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${SALOKA_GREEN}, #F59E0B)` }} />

          <div className="px-8 py-8">

            {/* SYSTEM BADGE */}
            <div
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{ background: SALOKA_GREEN_LIGHT, color: SALOKA_GREEN }}
            >
              <Monitor className="w-3.5 h-3.5" />
              IT Asset Management System
            </div>

            {/* TITLE */}
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              Selamat Datang 👋
            </h2>
            <p className="text-sm text-gray-400 mb-7">
              Silakan masuk untuk mengelola aset IT Saloka
            </p>

            {/* USERNAME */}
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <div
              className="flex items-center rounded-xl px-3 mb-4 transition-all duration-150"
              style={{ border: "2px solid #E5E7EB" }}
              onFocusCapture={(e) => (e.currentTarget.style.borderColor = SALOKA_GREEN)}
              onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            >
              <User className="w-4 h-4 shrink-0" style={{ color: SALOKA_GREEN }} />
              <input
                type="text"
                placeholder="Masukkan username"
                className="w-full px-2.5 py-2.5 outline-none text-sm text-gray-700 bg-transparent"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* PASSWORD */}
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div
              className="flex items-center rounded-xl px-3 mb-8 transition-all duration-150"
              style={{ border: "2px solid #E5E7EB" }}
              onFocusCapture={(e) => (e.currentTarget.style.borderColor = SALOKA_GREEN)}
              onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            >
              <Key className="w-4 h-4 shrink-0" style={{ color: SALOKA_GREEN }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                className="w-full px-2.5 py-2.5 outline-none text-sm text-gray-700 bg-transparent"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword
                  ? <Eye className="w-4 h-4" />
                  : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* BUTTON */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full text-white py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-150 disabled:opacity-60 shadow-md"
              style={{
                background: `linear-gradient(135deg, ${SALOKA_GREEN}, ${SALOKA_GREEN_DARK})`,
                boxShadow: `0 4px 14px 0 ${SALOKA_GREEN}55`,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = `linear-gradient(135deg, ${SALOKA_GREEN_DARK}, #1a6e47)`)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = `linear-gradient(135deg, ${SALOKA_GREEN}, ${SALOKA_GREEN_DARK})`)
              }
            >
              {loading ? "Memuat..." : "Masuk"}
            </button>

          </div>

          {/* FOOTER */}
          <div
            className="px-8 py-3 text-center text-xs text-gray-400"
            style={{ borderTop: "1px solid #F3F4F6" }}
          >
            © {new Date().getFullYear()} Saloka Theme Park · IT Division
          </div>

        </div>
      </div>
    </div>
  );
}