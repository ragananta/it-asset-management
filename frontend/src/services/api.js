import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

// 🔥 WAJIB INI
api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("token");

  console.log("TOKEN DIKIRIM:", token); // 🔥 DEBUG

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;