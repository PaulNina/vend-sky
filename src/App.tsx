import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import RequireAuth from "@/components/guards/RequireAuth";

// Public pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "@/pages/NotFound";

// Layouts
import VendorLayout from "@/layouts/VendorLayout";
import AdminLayout from "@/layouts/AdminLayout";

// Vendor pages
import VendorDashboard from "@/pages/VendorDashboard";
import RegisterSalePage from "@/pages/RegisterSalePage";
import MySalesPage from "@/pages/MySalesPage";
import RankingPage from "@/pages/RankingPage";

import RegistrationRequestsPage from "@/pages/admin/RegistrationRequestsPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";

const queryClient = new QueryClient();

const Placeholder = ({ title }: { title: string }) => (
  <div className="text-muted-foreground">{title} — Próximamente</div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Vendor (protected) */}
            <Route
              element={
                <RequireAuth allowedRoles={["vendedor", "admin"]}>
                  <VendorLayout />
                </RequireAuth>
              }
            >
              <Route path="/v" element={<VendorDashboard />} />
              <Route path="/v/registrar-venta" element={<RegisterSalePage />} />
              <Route path="/v/mis-ventas" element={<MySalesPage />} />
              <Route path="/v/ranking" element={<RankingPage />} />
            </Route>

            {/* Admin (protected) */}
            <Route
              element={
                <RequireAuth allowedRoles={["admin", "supervisor", "revisor_ciudad"]}>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/campanias" element={<Placeholder title="Campañas" />} />
              <Route path="/admin/solicitudes-registro" element={<RegistrationRequestsPage />} />
              <Route path="/admin/vendedores" element={<Placeholder title="Vendedores" />} />
              <Route path="/admin/productos-modelos" element={<Placeholder title="Productos y Modelos" />} />
              <Route path="/admin/seriales" element={<Placeholder title="Seriales" />} />
              <Route path="/admin/restringidos" element={<Placeholder title="Restringidos" />} />
              <Route path="/admin/revisiones" element={<Placeholder title="Revisiones" />} />
              <Route path="/admin/auditoria" element={<Placeholder title="Auditoría" />} />
              <Route path="/admin/metricas" element={<Placeholder title="Métricas" />} />
              <Route path="/admin/correos-ciudad" element={<Placeholder title="Correos por Ciudad" />} />
              <Route path="/admin/usuarios-roles" element={<Placeholder title="Usuarios y Roles" />} />
              <Route path="/admin/configuracion" element={<Placeholder title="Configuración" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
