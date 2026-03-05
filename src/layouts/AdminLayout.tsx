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
  ShieldCheck, ClipboardCheck, Mail, Settings, LogOut, UserPlus, DollarSign, FileCode,
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
  { title: "Comisiones", url: "/admin/comisiones", icon: DollarSign },
  { title: "Correos Ciudad", url: "/admin/correos-ciudad", icon: Mail },
  { title: "Plantillas Email", url: "/admin/plantillas-email", icon: FileCode },
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
        {/* Brand header */}
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center shadow-gold">
                <span className="text-sm font-bold text-primary-foreground font-display">S</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-sidebar-primary font-display tracking-wide">SKYWORTH</h2>
                <p className="text-[10px] text-sidebar-foreground/50 leading-none">Panel de Administración</p>
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-4 mb-1">
            Administración
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-0.5">
              {adminNav.map((item) => (
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

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border/50 px-4 bg-background/90 backdrop-blur-md sticky top-0 z-10">
            <SidebarTrigger className="mr-4 text-muted-foreground hover:text-foreground transition-colors" />
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-primary font-display tracking-wide">SKYWORTH</span>
              <span className="text-[11px] text-muted-foreground font-medium">Administración</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
