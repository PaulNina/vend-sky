import { useState, useEffect } from "react";
import { apiGet, apiPut } from "@/lib/api";

export interface City {
  id: string;
  nombre: string; // backend field
  departamento: string;
  activo: boolean; // backend field (was isActive)
  orden: number; // backend field (was displayOrder)
}

// Convenience: returns full city objects and distinct departments
export function useCities(onlyActive = true) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet<City[]>(
        onlyActive ? "/cities/active" : "/cities",
      );
      setCities(Array.isArray(data) ? data : []);
    } catch {
      setCities([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive]);

  // Simple list of city names for dropdowns
  const cityNames = cities.map((c) => c.nombre);

  // List of distinct departments
  const departments = Array.from(
    new Set(cities.map((c) => c.departamento).filter(Boolean)),
  );

  return { cities, cityNames, departments, loading, reload: load };
}
