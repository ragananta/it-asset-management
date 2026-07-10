import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Loader2 } from 'lucide-react';

export default function LoginFromSaloka() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const password = params.get('password');

    if (!email || !password) {
      setErrorMsg('Email atau password tidak ditemukan.');
      const timer = setTimeout(() => navigate('/login', { replace: true }), 3000);
      return () => clearTimeout(timer);
    }

    const autoLogin = async () => {
      try {
        const res = await api.post('/auth/login', { email, password });
        
        // Save Sanctum token
        localStorage.setItem("token", res.data.data.token);
        
        // Redirect to dashboard
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Login gagal.';
        setErrorMsg(msg);
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    autoLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-sm w-full mx-4">
        {errorMsg ? (
          <div>
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold mb-4">
              !
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Login Gagal</h2>
            <p className="text-slate-500 text-sm mt-2">{errorMsg}</p>
            <p className="text-slate-400 text-xs mt-4">Mengalihkan ke halaman login...</p>
          </div>
        ) : (
          <div>
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-emerald-600" />
            <h2 className="mt-5 text-xl font-semibold text-slate-800">Login dari Saloka...</h2>
            <p className="text-slate-500 mt-2 text-sm">Mohon tunggu sebentar, sistem sedang melakukan autentikasi.</p>
          </div>
        )}
      </div>
    </div>
  );
}
