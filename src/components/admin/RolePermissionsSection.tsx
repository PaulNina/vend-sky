import { useState, useEffect } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2 } from "lucide-react";

interface RolPermiso {
  rol: string;
  modulosPermitidos: string;
}

// Full list of available routes for assignment
const availableModules = [
  { url: "/admin/campanias", label: "Campañas" },
  { url: "/admin/solicitudes-registro", label: "Solicitudes de Registro" },
  { url: "/admin/vendedores", label: "Vendedores" },
  { url: "/admin/productos-modelos", label: "Productos y Modelos" },
  { url: "/admin/seriales", label: "Lotes de Seriales" },
  { url: "/admin/restringidos", label: "Seriales Restringidos" },
  { url: "/admin/revisiones", label: "Aprobación de Ventas" },
  { url: "/admin/auditoria", label: "Bitácora / Auditoría" },
  { url: "/admin/metricas", label: "Métricas Avanzadas" },
  { url: "/admin/correos-ciudad", label: "Receptores de Correo por Ciudad" },
  { url: "/admin/usuarios-roles", label: "Gestión de Usuarios App" },
];

export default function RolePermissionsSection() {
  const [roles, setRoles] = useState<RolPermiso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await apiGet<RolPermiso[]>("/admin/config/roles");
      // filter out Admin since Admin gets full access hardcoded anyway
      setRoles((data || []).filter(r => r.rol !== "ADMIN"));
    } catch (e) {
      toast({ title: "Error", description: "No se pudieron cargar los permisos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (rolName: string, moduleUrl: string, currentState: boolean) => {
    const rol = roles.find(r => r.rol === rolName);
    if (!rol) return;
    
    let currentAllowed = rol.modulosPermitidos.split(",").filter(Boolean);
    
    if (currentState) {
      // is currently allowed, we are denying it
      currentAllowed = currentAllowed.filter(url => url !== moduleUrl);
    } else {
      // is currently denied, we are allowing it
      if (!currentAllowed.includes(moduleUrl)) {
        currentAllowed.push(moduleUrl);
      }
    }

    const payload = currentAllowed.join(",");

    try {
      await apiPut(`/admin/config/roles/${rolName}`, { modulosPermitidos: payload });
      setRoles(prev => prev.map(r => r.rol === rolName ? { ...r, modulosPermitidos: payload } : r));
      toast({ title: "Actualizado", description: `Permisos de ${rolName} actualizados.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  // Pre-fill missing roles if empty database
  const displayRoles = [...roles];
  if (!displayRoles.find(r => r.rol === "SUPERVISOR")) displayRoles.push({ rol: "SUPERVISOR", modulosPermitidos: "" });
  if (!displayRoles.find(r => r.rol === "REVIEWER")) displayRoles.push({ rol: "REVIEWER", modulosPermitidos: "" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 font-display">
          <ShieldCheck className="h-4 w-4 text-primary" /> Permisos por Rol
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Selecciona qué páginas del administrador estarán habilitadas para los Supervisores y Revisores de Ciudad.
          Los administradores tienen acceso global.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayRoles.map(rol => {
            const allowed = rol.modulosPermitidos.split(',').filter(Boolean);
            return (
              <div key={rol.rol} className="border border-border/50 rounded-xl overflow-hidden bg-muted/20">
                <div className="bg-muted/50 px-4 py-2 border-b border-border/50">
                  <h3 className="font-semibold text-sm">Rol: {rol.rol === "REVIEWER" ? "Revisor de Ciudad" : "Supervisor"}</h3>
                </div>
                <div className="p-2 space-y-1">
                  {availableModules.map(mod => {
                    const isAllowed = allowed.includes(mod.url);
                    return (
                      <div key={mod.url} className="flex justify-between items-center px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <span className={`text-[13px] ${isAllowed ? 'font-medium' : 'text-muted-foreground'}`}>
                          {mod.label}
                        </span>
                        <Switch 
                          checked={isAllowed} 
                          onCheckedChange={() => togglePermission(rol.rol, mod.url, isAllowed)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
