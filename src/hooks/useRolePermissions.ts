import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";

type RolePermissionMap = Record<string, string[]>;

export function useRolePermissions() {
  const [permissions, setPermissions] = useState<RolePermissionMap>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const data = await apiGet<RolePermissionMap>(
        "/admin/config/mis-permisos",
      );
      setPermissions(data || {});
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  return { permissions, loading, refreshPermissions: fetchPermissions };
}
