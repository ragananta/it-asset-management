import { useState } from "react";
import { login } from "../../services/login";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import logo from "../../assets/logo-saloka.png";
import "./login.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // 🔥 FIX WAJIB (TRIM)
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();

      console.log("LOGIN:", cleanEmail, cleanPassword);

      const data = await login(cleanEmail, cleanPassword);

      localStorage.setItem("token", data.token);

      onLogin(); // pindah ke dashboard
    } catch (err) {
      console.log("ERROR:", err.response?.data);
      setError(err.response?.data?.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">

        {/* LOGO */}
        <img src={logo} alt="logo" className="logo" />

        <h2>Login AppSys</h2>
        <p>Silakan login untuk mengakses sistem</p>

        {/* ERROR */}
        {error && <div className="error-box">{error}</div>}

        {/* EMAIL */}
        <div className="input-group">
          <User size={18} className="icon" />
          <input
            type="email"
            placeholder="Masukkan email"
            value={email} // 🔥 WAJIB
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* PASSWORD */}
        <div className="input-group">
          <Lock size={18} className="icon" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Masukkan password"
            value={password} // 🔥 WAJIB
            onChange={(e) => setPassword(e.target.value)}
          />
          <span
            className="eye"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>

        {/* BUTTON */}
        <button onClick={handleLogin} disabled={loading}>
          {loading ? (
            <span className="spinner">
              <Loader2 className="spin" size={18} />
            </span>
          ) : (
            "Login"
          )}
        </button>

      </div>
    </div>
  );
}

export default Login;