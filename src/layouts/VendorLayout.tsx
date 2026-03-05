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
import { LayoutDashboard, PlusCircle, List, Trophy, LogOut, UserCircle, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; read: boolean; created_at: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Load notifications
    const loadNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.read).length);
    };
    loadNotifications();

    // Realtime subscription
    const channel = supabase
      .channel("vendor-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as any;
        setNotifications((prev) => [{ id: n.id, title: n.title, body: n.body, read: n.read, created_at: n.created_at }, ...prev].slice(0, 10));
        setUnreadCount((prev) => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <VendorSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 sm:h-14 flex items-center justify-between border-b border-border/50 px-3 sm:px-4 bg-background/90 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center">
              <SidebarTrigger className="mr-3 sm:mr-4 text-muted-foreground hover:text-foreground transition-colors" />
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-primary font-display tracking-wide">SKYWORTH</span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium hidden xs:inline">Bono Vendedor</span>
              </div>
            </div>

            {/* Notification Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <span className="text-sm font-medium">Notificaciones</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={markAllRead}>
                      Marcar leídas
                    </Button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Sin notificaciones</div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 px-3 py-2 cursor-default">
                      <div className="flex items-center gap-2 w-full">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        <span className={`text-xs font-medium truncate flex-1 ${n.read ? "text-muted-foreground" : ""}`}>{n.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 pl-3.5">{n.body}</p>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
