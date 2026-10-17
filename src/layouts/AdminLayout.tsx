import { Outlet, Link, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { SkyworthLogo } from "@/components/brand/SkyworthLogo";
import { CircleCheck, Command, MessageSquare } from "lucide-react";
import { WhatsAppNotificationListener, useWhatsAppUnreadCount } from "@/components/whatsapp/WhatsAppNotificationListener";
import { VersionBadge } from "@/components/common/VersionBadge";

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const unreadWa = useWhatsAppUnreadCount();
  const isRemoteData = String(import.meta.env.VITE_API_URL || "").startsWith("https://");
  const isWhatsappRoute = location.pathname.startsWith("/admin/whatsapp");

  return (
    <SidebarProvider style={{ "--sidebar-width": "17.5rem", "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}>
      <WhatsAppNotificationListener />
      <div className="admin-shell min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex min-w-0 flex-col">
          <header className="h-14 sm:h-16 flex items-center justify-between border-b border-white/[0.06] px-4 sm:px-6 lg:px-8 bg-[#0a0d11]/85 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center min-w-0 gap-3">
              <SidebarTrigger className="sky-sidebar-trigger h-9 w-9 rounded-xl shrink-0" />
              <div className="h-5 w-px bg-white/[0.08] hidden sm:block" />
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400">
                <SkyworthLogo tone="white" className="w-24 sm:w-28 hidden sm:block" />
                <span className="text-slate-600 hidden sm:inline">/</span>
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Command className="h-3.5 w-3.5 text-primary" /> Panel de Administración
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Acceso rápido a WhatsApp con contador de no leídos */}
              <Link
                to="/admin/whatsapp"
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 transition-all text-xs"
                title="Abrir Chat de WhatsApp"
              >
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span className="hidden md:inline font-medium text-[11px]">WhatsApp</span>
                {unreadWa > 0 && (
                  <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950 animate-pulse">
                    {unreadWa}
                  </span>
                )}
              </Link>

              <VersionBadge compact className="hidden sm:inline-flex" />
              <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.12em] sm:text-[10px] sm:tracking-[.14em] ${isRemoteData ? "text-amber-400" : "text-emerald-400/80"}`} title={isRemoteData ? "Las acciones realizadas aquí afectan la base de datos remota" : "Entorno local"}>
                <span className="relative flex h-2 w-2"><span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-30 ${isRemoteData ? "bg-amber-400" : "bg-emerald-400"}`} /><span className={`relative inline-flex h-2 w-2 rounded-full ${isRemoteData ? "bg-amber-400" : "bg-emerald-400"}`} /></span>
                {isRemoteData ? "Datos en línea" : "Entorno local"}
              </div>
              <div className="h-7 w-px bg-white/[0.07] hidden sm:block" />
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:block text-right leading-tight">
                  <p className="text-[11px] font-semibold text-slate-200">{user?.name || "Administrador"}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Control maestro</p>
                </div>
                <div className="h-9 w-9 rounded-full border border-primary/20 bg-primary/10 grid place-items-center text-primary">
                  <CircleCheck className="h-4 w-4" />
                </div>
              </div>
            </div>
          </header>
          <main className={`admin-workspace flex-1 ${isWhatsappRoute ? "p-1 sm:p-2 overflow-hidden flex flex-col" : "p-4 sm:p-6 lg:p-8 xl:p-10 overflow-auto"}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
