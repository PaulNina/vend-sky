import {
  LayoutDashboard,
  PlusCircle,
  List,
  Trophy,
  ClipboardCheck,
  BarChart3,
  Settings,
  Package,
  Hash,
  Users,
  FileText,
  ShieldCheck,
  LogOut,
  Target,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const vendedorItems = [
  { title: "Mi Panel", url: "/", icon: LayoutDashboard },
  { title: "Registrar Venta", url: "/registrar-venta", icon: PlusCircle },
  { title: "Mis Ventas", url: "/mis-ventas", icon: List },
  { title: "Ranking", url: "/ranking", icon: Trophy },
];

const revisorItems = [
  { title: "Pendientes", url: "/revisor/pendientes", icon: ClipboardCheck },
];

const supervisorItems = [
  { title: "Auditoría", url: "/supervisor/auditoria", icon: ShieldCheck },
  { title: "Métricas", url: "/supervisor/metricas", icon: BarChart3 },
];

const adminItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: BarChart3 },
  { title: "Campañas", url: "/admin/campanias", icon: Target },
  { title: "Productos", url: "/admin/productos", icon: Package },
  { title: "Seriales", url: "/admin/seriales", icon: Hash },
  { title: "Restringidos", url: "/admin/restringidos", icon: FileText },
  { title: "Usuarios", url: "/admin/usuarios", icon: Users },
  { title: "Reportes", url: "/admin/reportes", icon: FileText },
];

export function AppSidebar() {
  const { roles, signOut, user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const hasRole = (role: string) => roles.includes(role as any);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Brand */}
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold text-sidebar-primary">SKYWORTH</h2>
              <p className="text-[10px] text-sidebar-foreground/60 leading-tight">
                Bono Vendedor El Sueño del Hincha
              </p>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <span className="text-lg font-bold text-sidebar-primary">S</span>
            </div>
          )}
        </div>

        {/* Vendedor menu - always shown */}
        {(hasRole("vendedor") || hasRole("admin")) && (
          <SidebarGroup>
            <SidebarGroupLabel>Vendedor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {vendedorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Revisor */}
        {(hasRole("revisor_ciudad") || hasRole("admin")) && (
          <SidebarGroup>
            <SidebarGroupLabel>Revisor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {revisorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Supervisor */}
        {(hasRole("supervisor") || hasRole("admin")) && (
          <SidebarGroup>
            <SidebarGroupLabel>Supervisor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {supervisorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin */}
        {hasRole("admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
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

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <p className="text-xs text-sidebar-foreground/60 truncate mb-2">
            {user.email}
          </p>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full text-sidebar-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Cerrar sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
