import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface City {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

export function useCities(onlyActive = true) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let q = supabase.from("cities").select("*").order("display_order");
    if (onlyActive) q = q.eq("is_active", true);
    const { data } = await q;
    setCities(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [onlyActive]);

  const cityNames = cities.map((c) => c.name);

  return { cities, cityNames, loading, reload: load };
}
