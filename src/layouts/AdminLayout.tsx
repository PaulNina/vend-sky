import { useAuth } from "@/contexts/AuthContext";
import { Outlet, NavLink } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
  BarChart3, Target, Package, Hash, FileText, Users,
  ShieldCheck, ClipboardCheck, Mail, Settings, LogOut, UserPlus,
} from "lucide-react";

const adminNav = [
  { title: "Dashboard", url: "/admin", icon: BarChart3, end: true },
  { title: "Campañas", url: "/admin/campanias", icon: Target },
  { title: "Solicitudes", url: "/admin/solicitudes-registro", icon: UserPlus },
  { title: "Vendedores", url: "/admin/vendedores", icon: Users },
  { title: "Productos", url: "/admin/productos-modelos", icon: Package },
  { title: "Seriales", url: "/admin/seriales", icon: Hash },
  { title: "Restringidos", url: "/admin/restringidos", icon: FileText },
  { title: "Revisiones", url: "/admin/revisiones", icon: ClipboardCheck },
  { title: "Auditoría", url: "/admin/auditoria", icon: ShieldCheck },
  { title: "Métricas", url: "/admin/metricas", icon: BarChart3 },
  { title: "Correos Ciudad", url: "/admin/correos-ciudad", icon: Mail },
  { title: "Usuarios/Roles", url: "/admin/usuarios-roles", icon: Users },
  { title: "Configuración", url: "/admin/configuracion", icon: Settings },
];


function AdminSidebar() {
  const { signOut, user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed ? (
            <div>
              <h2 className="text-lg font-bold text-sidebar-primary">SKYWORTH</h2>
              <p className="text-[10px] text-sidebar-foreground/60">Panel de Administración</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="text-lg font-bold text-sidebar-primary">S</span>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Administración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent ${
                          isActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : ""
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <p className="text-xs text-sidebar-foreground/60 truncate mb-2">{user.email}</p>
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

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">SKYWORTH</span>
              <span className="text-xs text-muted-foreground">Administración</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
