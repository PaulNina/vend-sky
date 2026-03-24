import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/lib/api";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";

export default function VendorLayout() {
  const { user } = useAuth();
  const [vendorPending, setVendorPending] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    apiGet<{ activo: boolean; pendingApproval: boolean }>("/vendor/me")
      .then((data) => {
        setVendorPending(!data?.activo || data?.pendingApproval);
      })
      .catch(() => setVendorPending(false));
  }, [user]);

  const isPending = vendorPending === true;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
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
