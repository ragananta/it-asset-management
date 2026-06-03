import { createContext, useContext, useRef, useState, useCallback, ReactNode } from "react";
import api from "../api/axios";

interface Asset {
  id: number;
  asset_name: string;
  asset_code: string;
  status?: string;
}

interface AssetsContextValue {
  assets: Asset[];
  loadingAssets: boolean;
  ensureAssets: () => Promise<void>;
  refetchAssets: () => Promise<void>;
}

const AssetsContext = createContext<AssetsContextValue>({
  assets: [],
  loadingAssets: false,
  ensureAssets: async () => {},
  refetchAssets: async () => {},
});

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const fetched = useRef(false);
  const fetchingRef = useRef(false);

  const fetchAssets = useCallback(async () => {
    if (fetchingRef.current) return;
    try {
      fetchingRef.current = true;
      setLoadingAssets(true);
      const res = await api.get("/assets?per_page=100");
      const data = res?.data?.data?.data || res?.data?.data || res?.data || [];
      setAssets(Array.isArray(data) ? data : []);
      fetched.current = true;
    } catch (err) {
      console.error("ERROR fetch assets (context):", err);
    } finally {
      setLoadingAssets(false);
      fetchingRef.current = false;
    }
  }, []);

  const ensureAssets = useCallback(async () => {
    if (fetched.current) return;
    await fetchAssets();
  }, [fetchAssets]);

  return (
    <AssetsContext.Provider value={{
      assets,
      loadingAssets,
      ensureAssets,
      refetchAssets: fetchAssets,
    }}>
      {children}
    </AssetsContext.Provider>
  );
}

export function useAssets() {
  return useContext(AssetsContext);
}
