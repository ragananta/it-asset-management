import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api", // sesuaikan backend kamu
});

// 🔐 otomatis kirim token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const getCache = new Map<string, { expiresAt: number; response: AxiosResponse }>();
const pendingGets = new Map<string, Promise<AxiosResponse>>();
const originalGet = api.get.bind(api);
const CACHE_TTL_MS = 5000;

function getCacheKey(url: string, config?: AxiosRequestConfig) {
  return JSON.stringify({
    url,
    params: config?.params ?? null,
    responseType: config?.responseType ?? null,
  });
}

api.get = function cachedGet<T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  config?: AxiosRequestConfig<D>
): Promise<R> {
  if (config?.responseType === "blob" || (config as any)?.noCache) {
    return originalGet<T, R, D>(url, config);
  }

  const key = getCacheKey(url, config);
  const now = Date.now();
  const cached = getCache.get(key);

  if (cached && cached.expiresAt > now) {
    return Promise.resolve(cached.response as R);
  }

  const pending = pendingGets.get(key);
  if (pending) {
    return pending as Promise<R>;
  }

  const request = originalGet<T, R, D>(url, config)
    .then((response) => {
      getCache.set(key, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        response: response as AxiosResponse,
      });

      return response;
    })
    .finally(() => {
      pendingGets.delete(key);
    });

  pendingGets.set(key, request as Promise<AxiosResponse>);

  return request;
};

api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase();
    if (method && method !== "get") {
      getCache.clear();
    }

    return response;
  },
  (error) => Promise.reject(error)
);

export default api;
