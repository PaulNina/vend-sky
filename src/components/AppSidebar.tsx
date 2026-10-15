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
import { SkyworthLogo } from "@/components/brand/SkyworthLogo";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
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
  Users,
  ShieldCheck,
  ClipboardCheck,
  Settings,
  LogOut,
  UserPlus,
  FileSpreadsheet,
  DollarSign,
  Store,
  Wrench,
  ChevronRight,
  Radio,
  Sparkles,
  Gift,
  Medal,
  MessageSquare,
  Bot,
  Building2,
} from "lucide-react";
import { useWhatsAppUnreadCount } from "@/components/whatsapp/WhatsAppNotificationListener";

interface NavigationButtonProps {
  item: {
    title: string;
    url: string;
    icon: LucideIcon;
    end?: boolean;
  };
  collapsed: boolean;
}

function NavigationButton({ item, collapsed }: NavigationButtonProps) {
  const Icon = item.icon;
  const unreadWa = useWhatsAppUnreadCount();
  const isWhatsApp = item.url === "/admin/whatsapp";

  return (
    <SidebarMenuItem className={collapsed ? "flex justify-center w-full" : undefined}>
      <SidebarMenuButton
        asChild
        tooltip={{ children: item.title, className: "sky-nav-tooltip" }}
        className={cn("sky-nav-button", collapsed && "is-collapsed")}
      >
        <NavLink
          to={item.url}
          end={item.end}
          className={({ isActive }) => cn(isActive && "is-active", collapsed && "is-collapsed", "relative")}
        >
          <span className="sky-nav-icon relative">
            <Icon className="h-4 w-4" />
            {collapsed && isWhatsApp && unreadWa > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </span>
          {!collapsed && (
            <>
              <span className="sky-nav-title">{item.title}</span>
              {isWhatsApp && unreadWa > 0 && (
                <span className="ml-auto mr-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] animate-pulse">
                  {unreadWa}
                </span>
              )}
              <span className="sky-nav-arrow"><ChevronRight /></span>
            </>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

const operadorBandeoNav = [
  { title: "Bandeo y Ruleta", url: "/v/bandeo-ruleta", icon: Sparkles },
  { title: "Mi Stock Premios", url: "/v/mi-inventario-premios", icon: Gift },
  { title: "Mi Perfil", url: "/v/perfil", icon: UserCircle },
];

const vendorNav = [
  { title: "Mi Panel", url: "/v", icon: LayoutDashboard, end: true },
  { title: "Registrar Venta", url: "/v/registrar-venta", icon: PlusCircle },
  { title: "Mis Ventas", url: "/v/mis-ventas", icon: List },
  { title: "Ranking", url: "/v/ranking", icon: Trophy },
  { title: "Mis Pagos", url: "/v/mis-pagos", icon: DollarSign },
  { title: "Premios y Canjes", url: "/v/canjes", icon: Gift },
  { title: "Mi Perfil", url: "/v/perfil", icon: UserCircle },

];

const adminNav = [
  // 01. Resumen
  { title: "Panel General", url: "/admin", icon: BarChart3, end: true, roles: ["admin"], section: "Resumen" },

  // 02. Clientes & Sorteos
  { title: "Campañas Cliente", url: "/admin/campanas-cliente", icon: Target, roles: ["admin"], section: "Clientes & Sorteos" },
  { title: "Revisión de Clientes", url: "/admin/supervision-clientes", icon: ShieldCheck, roles: ["admin", "supervisor", "revisor_ciudad"], section: "Clientes & Sorteos" },
  { title: "Tómbola de Sorteos", url: "/admin/tombola-sorteos", icon: Trophy, roles: ["admin", "supervisor"], section: "Clientes & Sorteos" },
  { title: "Ganadores de Sorteos", url: "/admin/ganadores-sorteos", icon: Medal, roles: ["admin", "supervisor"], section: "Clientes & Sorteos" },
  { title: "Stock Premios Ruleta", url: "/admin/inventario-premios", icon: Gift, roles: ["admin"], section: "Clientes & Sorteos" },

  // 03. Ventas & Vendedores
  { title: "Revisión de Ventas", url: "/admin/revisiones", icon: ClipboardCheck, roles: ["admin", "revisor_ciudad", "supervisor"], section: "Ventas & Vendedores" },
  { title: "Vendedores", url: "/admin/vendedores", icon: Users, roles: ["admin"], section: "Ventas & Vendedores" },
  { title: "Solicitudes Vendedores", url: "/admin/solicitudes-registro", icon: UserPlus, roles: ["admin"], requiresManualApproval: true, section: "Ventas & Vendedores" },
  { title: "Campañas Vendedor", url: "/admin/campanias", icon: Target, roles: ["admin"], section: "Ventas & Vendedores" },
  { title: "Premios Vendedor", url: "/admin/premios-vendedores", icon: Gift, roles: ["admin", "supervisor"], section: "Ventas & Vendedores" },
  { title: "Pagos a Vendedores", url: "/admin/pagos", icon: DollarSign, roles: ["admin"], section: "Ventas & Vendedores" },

  // 04. Red de Tiendas
  { title: "Tiendas", url: "/admin/tiendas", icon: Store, roles: ["admin", "supervisor"], section: "Red de Tiendas" },
  { title: "Solicitudes de Tiendas", url: "/admin/solicitudes-tiendas", icon: Building2, roles: ["admin", "supervisor"], section: "Red de Tiendas" },

  // 05. Productos & Soporte
  { title: "Catálogo de Productos", url: "/admin/productos-modelos", icon: Package, roles: ["admin"], section: "Productos & Soporte" },
  { title: "Control de Seriales", url: "/admin/seriales", icon: Hash, roles: ["admin"], section: "Productos & Soporte" },
  { title: "Equipos Dañados / ST", url: "/admin/equipos-danados", icon: Wrench, roles: ["admin", "supervisor", "tecnico"], section: "Productos & Soporte" },

  // 06. Comunicación
  { title: "WhatsApp Chat", url: "/admin/whatsapp", icon: MessageSquare, roles: ["admin", "supervisor"], section: "Comunicación" },
  { title: "Config. Chatbot", url: "/admin/whatsapp-config", icon: Bot, roles: ["admin"], section: "Comunicación" },

  // 07. Sistema & Auditoría
  { title: "Reportes y Envíos", url: "/admin/reportes", icon: FileSpreadsheet, roles: ["admin"], section: "Sistema & Auditoría" },
  { title: "Auditoría", url: "/admin/auditoria", icon: ShieldCheck, roles: ["admin", "supervisor"], section: "Sistema & Auditoría" },
  { title: "Usuarios y Roles", url: "/admin/usuarios-roles", icon: Users, roles: ["admin"], section: "Sistema & Auditoría" },
  { title: "Configuración General", url: "/admin/configuracion", icon: Settings, roles: ["admin"], section: "Sistema & Auditoría" },
];

export function AppSidebar() {
  const { signOut, user, roles } = useAuth();
  const { state } = useSidebar();
  const { permissions, loading } = useRolePermissions();
  const { autoAprobarVendedores } = useGlobalConfig();
  const collapsed = state === "collapsed";

  const isVendor = roles.includes("vendedor");
  const isOperadorBandeo = roles.includes("operador_bandeo");
  
  // Filter admin/staff navigation dynamically based on permissions
  const visibleAdminNav = adminNav.filter(item => {
    if ((item as { hidden?: boolean }).hidden) return false;
    // Hide items that require manual approval when auto-approve is enabled
    if ((item as { requiresManualApproval?: boolean }).requiresManualApproval && autoAprobarVendedores) return false;
    if (roles.includes("admin") && item.roles.includes("admin")) return true;
    if (!loading) {
      for (const role of roles) {
        if (role === "admin" || role === "vendedor") continue;
        const rawRoleName = role === "revisor_ciudad" ? "REVISOR" : role.toUpperCase();
        const allowedUrls = permissions[rawRoleName] || permissions[role.toUpperCase()] || (rawRoleName === "REVISOR" ? (permissions["REVIEWER"] || []) : []);
        if (allowedUrls.includes(item.url)) return true;
      }
    }
    return false;
  });

  const groupedAdminNav = visibleAdminNav.reduce<Record<string, typeof visibleAdminNav>>((groups, item) => {
    const section = item.section || "Administración";
    (groups[section] ||= []).push(item);
    return groups;
  }, {});

  return (
    <Sidebar collapsible="icon" className="sky-sidebar h-svh border-r-0">
      <SidebarContent className="sky-sidebar-content flex-1 overflow-y-auto">
        {/* Brand header */}
        <div className={cn("sky-sidebar-brand relative flex h-[94px] items-center overflow-hidden", collapsed ? "justify-center px-1" : "px-5")}>
          {!collapsed ? (
            <div className="relative min-w-0">
              <SkyworthLogo tone="white" className="w-[148px] max-w-full" />
              <div className="mt-2.5 flex items-center gap-2">
                <span className="sky-status-pulse" />
                <p className="truncate text-[8px] font-bold uppercase tracking-[.21em] text-slate-400">
                  {isVendor ? "Bono Vendedor" : "Panel de Administración"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex w-full justify-center items-center">
              <img src="/skyworth-app-icon.svg" alt="SKYWORTH" className="sky-sidebar-mark h-10 w-10 shrink-0" />
            </div>
          )}
        </div>

        {/* Operador de Bandeo Items */}
        {isOperadorBandeo && (
          <SidebarGroup className={cn("sky-nav-group", collapsed && "!p-0 !my-1")}>
            {!collapsed && (
              <SidebarGroupLabel className="sky-nav-section">
                <span>01</span><span>Operador de Bandeo</span><i />
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className={cn("sky-nav-list", collapsed && "!items-center !gap-1.5 !p-0")}>
                {operadorBandeoNav.map((item) => (
                  <NavigationButton key={item.url} item={item} collapsed={collapsed} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Vendor Items */}
        {isVendor && !isOperadorBandeo && (
          <SidebarGroup className={cn("sky-nav-group", collapsed && "!p-0 !my-1")}>
            {!collapsed && (
              <SidebarGroupLabel className="sky-nav-section">
                <span>01</span><span>Menú Vendedor</span><i />
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className={cn("sky-nav-list", collapsed && "!items-center !gap-1.5 !p-0")}>
                {vendorNav.map((item) => (
                  <NavigationButton key={item.url} item={item} collapsed={collapsed} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin/Staff Items */}
        {visibleAdminNav.length > 0 && Object.entries(groupedAdminNav).map(([section, items], sectionIndex) => (
          <SidebarGroup key={section} className={cn("sky-nav-group", collapsed && "!p-0 !my-1")}>
            {!collapsed && (
              <SidebarGroupLabel className="sky-nav-section">
                <span>{String(sectionIndex + 1).padStart(2, "0")}</span><span>{section}</span><i />
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className={cn("sky-nav-list", collapsed && "!items-center !gap-1.5 !p-0")}>
                {items.map((item) => (
                  <NavigationButton key={item.url} item={item} collapsed={collapsed} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className={cn("sky-sidebar-footer space-y-2", collapsed ? "!p-2 !items-center" : "p-3")}>
        {!collapsed && user && (
          <div className="sky-session-card">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[8px] font-extrabold uppercase tracking-[.17em] text-cyan-300">
                <Radio className="h-3 w-3" /> Sesión activa
              </p>
              <span>ON</span>
            </div>
            <p className="mt-2 truncate text-[10px] font-medium text-slate-300">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          aria-label="Cerrar sesión"
          title={collapsed ? "Cerrar sesión" : undefined}
          className={cn("sky-logout-button", collapsed ? "!h-10 !w-10 !p-0 mx-auto" : "w-full")}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2 text-[13px]">Cerrar sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
