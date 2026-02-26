import { useAuth } from "@/contexts/AuthContext";
import { Outlet, NavLink } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
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
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed ? (
            <div>
              <h2 className="text-lg font-bold text-sidebar-primary">SKYWORTH</h2>
              <p className="text-[10px] text-sidebar-foreground/60">Bono Vendedor El Sueño del Hincha</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="text-lg font-bold text-sidebar-primary">S</span>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {vendorNav.map((item) => (
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
          <header className="h-14 flex items-center border-b border-border px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">SKYWORTH</span>
              <span className="text-xs text-muted-foreground">Bono Vendedor</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {isPending ? (
              <Card className="max-w-lg mx-auto mt-12 border-warning/30 bg-warning/5">
                <CardContent className="p-8 text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
                  <h2 className="text-xl font-bold">Cuenta pendiente de aprobación</h2>
                  <p className="text-muted-foreground">
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
