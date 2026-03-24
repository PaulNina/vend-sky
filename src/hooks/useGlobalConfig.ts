import { useState, useEffect } from "react";
import { apiGetPublic } from "@/lib/api";

interface GlobalConfig {
  auto_aprobar_vendedores?: string;
  venta_fecha_max_semanas?: string;
}

interface UseGlobalConfigResult {
  autoAprobarVendedores: boolean;
  ventaFechaMaxSemanas: number;
  loading: boolean;
}

// Use window-level cache so we can invalidate it from other components (like ConfigurationPage)
const getCachedConfig = () =>
  (window as unknown as { __globalConfigCache: GlobalConfig | null })
    .__globalConfigCache;
const setCachedConfig = (val: GlobalConfig | null) =>
  ((
    window as unknown as { __globalConfigCache: GlobalConfig | null }
  ).__globalConfigCache = val);

// We still keep a module-level promise to avoid duplicate simultaneous fetches
let fetchPromise: Promise<GlobalConfig> | null = null;

export function useGlobalConfig(): UseGlobalConfigResult {
  const [config, setConfig] = useState<GlobalConfig | null>(getCachedConfig());
  const [loading, setLoading] = useState(!getCachedConfig());

  useEffect(() => {
    const cached = getCachedConfig();
    if (cached) {
      setConfig(cached);
      setLoading(false);
      return;
    }

    // We still keep a module-level promise to avoid duplicate simultaneous fetches
    if (!fetchPromise) {
      fetchPromise = apiGetPublic<GlobalConfig>("/config/public")
        .then((data) => {
          setCachedConfig(data);
          fetchPromise = null;
          return data;
        })
        .catch(() => {
          fetchPromise = null;
          return {};
        });
    }

    fetchPromise.then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  return {
    autoAprobarVendedores: config?.auto_aprobar_vendedores === "true",
    ventaFechaMaxSemanas: parseInt(config?.venta_fecha_max_semanas || "0"),
    loading,
  };
}
