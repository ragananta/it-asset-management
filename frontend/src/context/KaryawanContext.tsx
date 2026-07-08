import { createContext, useContext, useRef, useState, useCallback, ReactNode } from "react";
import api from "../api/axios";

export interface Karyawan {
  username: string;
  name: string;
  departemen: string;
  pos: string;
  email: string;
}

interface KaryawanContextValue {
  karyawanList: Karyawan[];
  loadingKaryawan: boolean;
  ensureKaryawan: () => Promise<void>; // fetch hanya jika belum ada data
}

const KaryawanContext = createContext<KaryawanContextValue>({
  karyawanList: [],
  loadingKaryawan: false,
  ensureKaryawan: async () => {},
});

export function KaryawanProvider({ children }: { children: ReactNode }) {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [loadingKaryawan, setLoadingKaryawan] = useState(false);
  const fetched = useRef(false);
  const activePromiseRef = useRef<Promise<void> | null>(null);

  const ensureKaryawan = useCallback(async () => {
    if (fetched.current) return;
    if (activePromiseRef.current) {
      return activePromiseRef.current;
    }

    activePromiseRef.current = (async () => {
      try {
        setLoadingKaryawan(true);
        const res = await api.get("/karyawan?limit=200");
        const data = res?.data?.data || [];
        setKaryawanList(Array.isArray(data) ? data : []);
        fetched.current = true;
      } catch (err) {
        console.error("ERROR fetch karyawan:", err);
      } finally {
        setLoadingKaryawan(false);
        activePromiseRef.current = null;
      }
    })();

    return activePromiseRef.current;
  }, []);

  return (
    <KaryawanContext.Provider value={{ karyawanList, loadingKaryawan, ensureKaryawan }}>
      {children}
    </KaryawanContext.Provider>
  );
}

export function useKaryawan() {
  return useContext(KaryawanContext);
}