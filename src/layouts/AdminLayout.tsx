import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
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
