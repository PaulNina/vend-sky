import { useState, useEffect, useMemo } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  ShieldCheck, Loader2, CheckCheck, XCircle, Search, Sparkles,
  BarChart3, Target, Gift, UserPlus, Users, Store, Package,
  Hash, Wrench, ClipboardCheck, FileSpreadsheet, DollarSign,
  Trophy, Medal, MessageSquare, Bot, Settings, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RolPermiso {
  rol: string;
  modulosPermitidos: string;
}

interface PageModule {
  url: string;
  label: string;
  description: string;
  icon: typeof BarChart3;
  section: string;
}

const ALL_SYSTEM_PAGES: PageModule[] = [
  // Resumen
  { url: "/admin", label: "Panel General / Dashboard", description: "Vista consolidada de métricas en tiempo real", icon: BarChart3, section: "Resumen" },

  // Comercial
  { url: "/admin/campanias", label: "Campañas Vendedor", description: "Configuración y calendario de incentivos", icon: Target, section: "Comercial" },
  { url: "/admin/premios-vendedores", label: "Premios Vendedor", description: "Catálogo de premios canjeables por puntos", icon: Gift, section: "Comercial" },
  { url: "/admin/solicitudes-registro", label: "Solicitudes de Registro", description: "Aprobación de nuevos vendedores", icon: UserPlus, section: "Comercial" },
  { url: "/admin/vendedores", label: "Vendedores", description: "Directorio general de vendedores registrados", icon: Users, section: "Comercial" },
  { url: "/admin/tiendas", label: "Tiendas", description: "Puntos de venta autorizados y exclusiones", icon: Store, section: "Comercial" },
  { url: "/admin/productos-modelos", label: "Productos y Modelos", description: "Catálogo oficial de productos bonificables", icon: Package, section: "Comercial" },

  // Operación
  { url: "/admin/seriales", label: "Lotes de Seriales", description: "Gestión de números de serie y disponibilidad", icon: Hash, section: "Operación" },
  { url: "/admin/equipos-danados", label: "Equipos Dañados", description: "Módulo técnico para diagnóstico y sustitución", icon: Wrench, section: "Operación" },
  { url: "/admin/revisiones", label: "Revisiones Bono / Ventas", description: "Mesa de control de facturas y aprobación de bonos", icon: ClipboardCheck, section: "Operación" },

  // Control & Finanzas
  { url: "/admin/auditoria", label: "Bitácora / Auditoría", description: "Registro histórico inmutable de eventos", icon: ShieldCheck, section: "Control" },
  { url: "/admin/reportes", label: "Reportes y Envíos", description: "Exportación de datos a Excel y reportes oficiales", icon: FileSpreadsheet, section: "Control" },
  { url: "/admin/pagos", label: "Pagos a Vendedores", description: "Liquidación y órdenes de transferencias bancarias", icon: DollarSign, section: "Control" },

  // Cliente Final & Sorteos
  { url: "/admin/supervision-clientes", label: "Revisión de Clientes", description: "Verificación de registros de clientes finales", icon: ShieldCheck, section: "Cliente Final & Sorteos" },
  { url: "/admin/tombola-sorteos", label: "Tómbola de Sorteos", description: "Ejecución de sorteos de cupones y tómbolas", icon: Trophy, section: "Cliente Final & Sorteos" },
  { url: "/admin/ganadores-sorteos", label: "Ganadores de Sorteos", description: "Historial de ganadores y actas oficiales", icon: Medal, section: "Cliente Final & Sorteos" },
  { url: "/admin/campanas-cliente", label: "Campañas Cliente", description: "Promociones y dinámicas para consumidores finales", icon: Target, section: "Cliente Final & Sorteos" },
  { url: "/admin/inventario-premios", label: "Stock de Premios", description: "Inventario físico de regalos y souvenirs", icon: Gift, section: "Cliente Final & Sorteos" },
  { url: "/admin/whatsapp", label: "WhatsApp Chat", description: "Bandeja de atención en vivo vía WhatsApp", icon: MessageSquare, section: "Cliente Final & Sorteos" },
  { url: "/admin/whatsapp-config", label: "Configuración Chatbot", description: "Flujos automatizados y respuestas rápidas", icon: Bot, section: "Cliente Final & Sorteos" },

  // Sistema
  { url: "/admin/usuarios-roles", label: "Usuarios y Roles", description: "Administración de cuentas y asignación de roles", icon: Users, section: "Sistema" },
  { url: "/admin/configuracion", label: "Configuración Global", description: "Parámetros del sistema y permisos", icon: Settings, section: "Sistema" },
];

const CONFIGURABLE_ROLES = [
  { rol: "SUPERVISOR", label: "Supervisor Regional", description: "Supervisión territorial y aprobación de operaciones" },
  { rol: "REVISOR", label: "Revisor de Ventas", description: "Mesa de control, validación de facturas y seriales" },
  { rol: "ENCARGADO_TIENDA", label: "Encargado de Tienda", description: "Monitoreo y consulta de ventas en su tienda asignada" },
  { rol: "VISOR", label: "Visor / Auditor", description: "Modo solo lectura para reportes y estadísticas ejecutivas" },
  { rol: "TECNICO", label: "Técnico (Equipos)", description: "Diagnóstico y control de equipos con fallas" },
  { rol: "OPERADOR_BANDEO", label: "Operador de Bandeo", description: "Activación en tienda, ruleta y tómbola de clientes" },
];

export default function RolePermissionsSection() {
  const [rolesData, setRolesData] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState<string>("SUPERVISOR");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const data = await apiGet<RolPermiso[]>("/admin/config/roles");
      const mapped: Record<string, string[]> = {};
      (data || []).forEach(item => {
        mapped[item.rol] = (item.modulosPermitidos || "").split(",").map(s => s.trim()).filter(Boolean);
      });
      // Fallback aliases
      if (mapped["REVIEWER"] && !mapped["REVISOR"]) {
        mapped["REVISOR"] = mapped["REVIEWER"];
      }
      setRolesData(mapped);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los permisos por rol", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const currentAllowed = useMemo(() => {
    return rolesData[selectedRole] || [];
  }, [rolesData, selectedRole]);

  const saveRolePermissions = async (rol: string, newAllowed: string[]) => {
    const payload = newAllowed.join(",");
    setSavingKey(rol);
    try {
      await apiPut(`/admin/config/roles/${rol}`, { modulosPermitidos: payload });
      // Keep alias in sync if REVISOR
      if (rol === "REVISOR") {
        await apiPut(`/admin/config/roles/REVIEWER`, { modulosPermitidos: payload }).catch(() => {});
      }
      setRolesData(prev => ({ ...prev, [rol]: newAllowed }));
      // Notify sidebar listeners immediately
      window.dispatchEvent(new Event("permissions-updated"));
      toast({
        title: "Permisos actualizados",
        description: `Se guardaron los accesos para el rol ${selectedRoleInfo?.label || rol}.`,
      });
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error al guardar", description: error.message || "Error inesperado", variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  };

  const togglePage = (url: string) => {
    const isAllowed = currentAllowed.includes(url);
    const updated = isAllowed ? currentAllowed.filter(u => u !== url) : [...currentAllowed, url];
    saveRolePermissions(selectedRole, updated);
  };

  const toggleSection = (sectionPages: PageModule[], enableAll: boolean) => {
    const sectionUrls = sectionPages.map(p => p.url);
    let updated: string[];
    if (enableAll) {
      const combined = new Set([...currentAllowed, ...sectionUrls]);
      updated = Array.from(combined);
    } else {
      updated = currentAllowed.filter(url => !sectionUrls.includes(url));
    }
    saveRolePermissions(selectedRole, updated);
  };

  const toggleAllRole = (enableAll: boolean) => {
    const updated = enableAll ? ALL_SYSTEM_PAGES.map(p => p.url) : [];
    saveRolePermissions(selectedRole, updated);
  };

  const filteredPages = useMemo(() => {
    if (!search.trim()) return ALL_SYSTEM_PAGES;
    const q = search.toLowerCase();
    return ALL_SYSTEM_PAGES.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.url.toLowerCase().includes(q) ||
      p.section.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }, [search]);

  const sections = useMemo(() => {
    const map = new Map<string, PageModule[]>();
    filteredPages.forEach(p => {
      const list = map.get(p.section) || [];
      list.push(p);
      map.set(p.section, list);
    });
    return Array.from(map.entries());
  }, [filteredPages]);

  const selectedRoleInfo = CONFIGURABLE_ROLES.find(r => r.rol === selectedRole);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-slate-400">Cargando matriz de páginas y permisos...</p>
      </div>
    );
  }

  return (
    <Card className="glass-card border-white/5 shadow-2xl">
      <CardHeader className="border-b border-white/5 pb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold font-display text-white flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Gestión Dinámica de Páginas por Rol
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-1">
              Configura de forma no estática qué páginas y módulos del menú están habilitados para cada rol del sistema.
              El Administrador tiene control total absoluto sobre todas las páginas.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleAllRole(true)}
              disabled={savingKey === selectedRole}
              className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Habilitar Todas
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleAllRole(false)}
              disabled={savingKey === selectedRole}
              className="text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Deshabilitar Todas
            </Button>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1 scrollbar-thin">
          {CONFIGURABLE_ROLES.map(r => {
            const isSelected = selectedRole === r.rol;
            const count = (rolesData[r.rol] || []).length;
            return (
              <button
                key={r.rol}
                onClick={() => setSelectedRole(r.rol)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border",
                  isSelected
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                    : "bg-white/[0.03] text-slate-400 border-white/5 hover:bg-white/[0.07] hover:text-slate-200"
                )}
              >
                <span>{r.label}</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-md text-[10px] font-mono",
                  isSelected ? "bg-black/30 text-white" : "bg-white/10 text-slate-400"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Role Summary Bar */}
        {selectedRoleInfo && (
          <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <div>
                <span className="font-bold text-white">{selectedRoleInfo.label}: </span>
                <span className="text-slate-300">{selectedRoleInfo.description}</span>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[11px] font-mono shrink-0 ml-2">
              {currentAllowed.length} de {ALL_SYSTEM_PAGES.length} páginas permitidas
            </Badge>
          </div>
        )}

        {/* Search Bar */}
        <div className="mt-3 relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar módulo o página por título o ruta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-black/20 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {sections.map(([sectionName, pages]) => {
          const sectionUrls = pages.map(p => p.url);
          const allSectionEnabled = sectionUrls.every(u => currentAllowed.includes(u));
          const someSectionEnabled = sectionUrls.some(u => currentAllowed.includes(u));
          const enabledCount = sectionUrls.filter(u => currentAllowed.includes(u)).length;

          return (
            <div key={sectionName} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{sectionName}</h3>
                  <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px] px-1.5 py-0 h-4 font-mono">
                    {enabledCount} / {pages.length}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSection(pages, true)}
                    disabled={allSectionEnabled}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:hover:text-emerald-400 transition-colors"
                  >
                    Activar sección
                  </button>
                  <span className="text-slate-600 text-xs">·</span>
                  <button
                    onClick={() => toggleSection(pages, false)}
                    disabled={!someSectionEnabled}
                    className="text-[11px] text-rose-400 hover:text-rose-300 disabled:opacity-30 disabled:hover:text-rose-400 transition-colors"
                  >
                    Desactivar sección
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pages.map(page => {
                  const Icon = page.icon;
                  const isAllowed = currentAllowed.includes(page.url);

                  return (
                    <div
                      key={page.url}
                      onClick={() => togglePage(page.url)}
                      className={cn(
                        "group p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3",
                        isAllowed
                          ? "bg-primary/[0.07] border-primary/30 hover:border-primary/50 shadow-sm"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10 opacity-75"
                      )}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isAllowed ? "bg-primary/20 text-primary" : "bg-white/5 text-slate-500 group-hover:text-slate-400"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={cn(
                            "text-xs font-semibold truncate transition-colors",
                            isAllowed ? "text-white font-medium" : "text-slate-400"
                          )}>
                            {page.label}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                            {page.url}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={isAllowed}
                          onCheckedChange={() => togglePage(page.url)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredPages.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            No se encontraron páginas coincidentes con "{search}".
          </div>
        )}
      </CardContent>
    </Card>
  );
}
