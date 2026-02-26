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
import { LayoutDashboard, PlusCircle, List, Trophy, LogOut, AlertTriangle, UserCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

const vendorNav = [
  { title: "Mi Panel", url: "/v", icon: LayoutDashboard, end: true },
  { title: "Registrar Venta", url: "/v/registrar-venta", icon: PlusCircle },
  { title: "Mis Ventas", url: "/v/mis-ventas", icon: List },
  { title: "Ranking", url: "/v/ranking", icon: Trophy },
  { title: "Mi Perfil", url: "/v/perfil", icon: UserCircle },
];

function VendorSidebar() {
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
                <p className="text-[10px] text-sidebar-foreground/50 leading-none">Bono Vendedor</p>
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
            Menú
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

export default function VendorLayout() {
  const { user } = useAuth();
  const [vendorStatus, setVendorStatus] = useState<{ pending: boolean; active: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("vendors")
      .select("pending_approval, is_active")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setVendorStatus({ pending: data.pending_approval, active: data.is_active });
        } else {
          setVendorStatus({ pending: true, active: false });
        }
      });
  }, [user]);

  const isPending = vendorStatus?.pending || !vendorStatus?.active;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <VendorSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 sm:h-14 flex items-center border-b border-border/50 px-3 sm:px-4 bg-background/90 backdrop-blur-md sticky top-0 z-10">
            <SidebarTrigger className="mr-3 sm:mr-4 text-muted-foreground hover:text-foreground transition-colors" />
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-primary font-display tracking-wide">SKYWORTH</span>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium hidden xs:inline">Bono Vendedor</span>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-auto">
            {isPending ? (
              <Card className="max-w-lg mx-auto mt-12 border-warning/30 bg-warning/5">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-7 w-7 text-warning" />
                  </div>
                  <h2 className="text-xl font-bold font-display">Cuenta pendiente de aprobación</h2>
                  <p className="text-muted-foreground text-sm">
                    Tu registro está siendo revisado por un administrador. 
                    Una vez aprobado, podrás registrar ventas y acceder a todas las funciones.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
