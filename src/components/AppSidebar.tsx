import { useAuth } from "@/contexts/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useGlobalConfig } from "@/hooks/useGlobalConfig";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  Trophy,
  UserCircle,
  BarChart3,
  Target,
  Package,
  Hash,
  FileText,
  Users,
  ShieldCheck,
  ClipboardCheck,
  Settings,
  LogOut,
  UserPlus,
  FileSpreadsheet,
  DollarSign,
  Store
} from "lucide-react";

const vendorNav = [
  { title: "Mi Panel", url: "/v", icon: LayoutDashboard, end: true },
  { title: "Registrar Venta", url: "/v/registrar-venta", icon: PlusCircle },
  { title: "Mis Ventas", url: "/v/mis-ventas", icon: List },
  { title: "Ranking", url: "/v/ranking", icon: Trophy },
  { title: "Mis Pagos", url: "/v/mis-pagos", icon: DollarSign },
  { title: "Mi Perfil", url: "/v/perfil", icon: UserCircle },
];

const adminNav = [
  { title: "Panel General", url: "/admin", icon: BarChart3, end: true, roles: ["admin"] },
  { title: "Campañas", url: "/admin/campanias", icon: Target, roles: ["admin"] },
  { title: "Solicitudes", url: "/admin/solicitudes-registro", icon: UserPlus, roles: ["admin"], requiresManualApproval: true },
  { title: "Vendedores", url: "/admin/vendedores", icon: Users, roles: ["admin"] },
  { title: "Tiendas", url: "/admin/tiendas", icon: Store, roles: ["admin"] },
  { title: "Productos", url: "/admin/productos-modelos", icon: Package, roles: ["admin"] },
  { title: "Seriales", url: "/admin/seriales", icon: Hash, roles: ["admin"] },
  { title: "Revisiones", url: "/admin/revisiones", icon: ClipboardCheck, roles: ["admin", "revisor_ciudad", "supervisor"] },
  { title: "Auditoría", url: "/admin/auditoria", icon: ShieldCheck, roles: ["admin", "supervisor"] },
  { title: "Reportes y Envíos", url: "/admin/reportes", icon: FileSpreadsheet, roles: ["admin"] },
  { title: "Pagos a Vendedores", url: "/admin/pagos", icon: DollarSign, roles: ["admin"] },
  { title: "Usuarios/Roles", url: "/admin/usuarios-roles", icon: Users, roles: ["admin"] },
  { title: "Configuración", url: "/admin/configuracion", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const { signOut, user, roles } = useAuth();
  const { state } = useSidebar();
  const { permissions, loading } = useRolePermissions();
  const { autoAprobarVendedores } = useGlobalConfig();
  const collapsed = state === "collapsed";

  const isVendor = roles.includes("vendedor");
  
  // Filter admin/staff navigation dynamically based on permissions
  const visibleAdminNav = adminNav.filter(item => {
    // Hide items that require manual approval when auto-approve is enabled
    if ((item as { requiresManualApproval?: boolean }).requiresManualApproval && autoAprobarVendedores) return false;
    if (roles.includes("admin") && item.roles.includes("admin")) return true;
    if (!loading) {
      for (const role of roles) {
        if (role === "admin" || role === "vendedor") continue;
        const rawRoleName = role === "revisor_ciudad" ? "REVIEWER" : role.toUpperCase();
        const allowedUrls = permissions[rawRoleName] || [];
        if (allowedUrls.includes(item.url)) return true;
      }
    }
    return false;
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border h-svh">
      <SidebarContent className="flex-1 overflow-y-auto">
        {/* Brand header */}
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center shadow-gold">
                <span className="text-sm font-bold text-primary-foreground font-display">S</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-sidebar-primary font-display tracking-wide">SKYWORTH</h2>
                <p className="text-[10px] text-sidebar-foreground/50 leading-none">
                  {isVendor ? "Bono Vendedor" : "Panel de Administración"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center shadow-gold">
                <span className="text-sm font-bold text-primary-foreground font-display">S</span>
              </div>
            </div>
          )}
        </div>

        {/* Vendor Items */}
        {isVendor && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-4 mb-1">
              Menú Vendedor
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="px-2 space-y-0.5">
                {vendorNav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 ${
                            isActive
                              ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-sm"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin/Staff Items */}
        {visibleAdminNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-4 mb-1">
              Administración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="px-2 space-y-0.5">
                {visibleAdminNav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 ${
                            isActive
                              ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-sm"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="px-2 py-1.5 rounded-md bg-sidebar-accent/50">
            <p className="text-[11px] text-sidebar-foreground/60 truncate">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2 text-[13px]">Cerrar sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
