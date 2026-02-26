import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import AppLayout from "@/layouts/AppLayout";
import VendorDashboard from "@/pages/VendorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<VendorDashboard />} />
              {/* Vendor routes */}
              <Route path="/registrar-venta" element={<div className="text-muted-foreground">Registrar Venta — Próximamente</div>} />
              <Route path="/mis-ventas" element={<div className="text-muted-foreground">Mis Ventas — Próximamente</div>} />
              <Route path="/ranking" element={<div className="text-muted-foreground">Ranking — Próximamente</div>} />
              {/* Revisor routes */}
              <Route path="/revisor/pendientes" element={<div className="text-muted-foreground">Pendientes — Próximamente</div>} />
              {/* Supervisor routes */}
              <Route path="/supervisor/auditoria" element={<div className="text-muted-foreground">Auditoría — Próximamente</div>} />
              <Route path="/supervisor/metricas" element={<div className="text-muted-foreground">Métricas — Próximamente</div>} />
              {/* Admin routes */}
              <Route path="/admin/dashboard" element={<div className="text-muted-foreground">Dashboard Admin — Próximamente</div>} />
              <Route path="/admin/campanias" element={<div className="text-muted-foreground">Campañas — Próximamente</div>} />
              <Route path="/admin/productos" element={<div className="text-muted-foreground">Productos — Próximamente</div>} />
              <Route path="/admin/seriales" element={<div className="text-muted-foreground">Seriales — Próximamente</div>} />
              <Route path="/admin/restringidos" element={<div className="text-muted-foreground">Restringidos — Próximamente</div>} />
              <Route path="/admin/usuarios" element={<div className="text-muted-foreground">Usuarios — Próximamente</div>} />
              <Route path="/admin/reportes" element={<div className="text-muted-foreground">Reportes — Próximamente</div>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
