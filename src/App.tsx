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

// Admin pages
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import CampaignsPage from "@/pages/admin/CampaignsPage";
import RegistrationRequestsPage from "@/pages/admin/RegistrationRequestsPage";
import VendorsPage from "@/pages/admin/VendorsPage";
import ProductsPage from "@/pages/admin/ProductsPage";
import SerialsPage from "@/pages/admin/SerialsPage";
import RestrictedPage from "@/pages/admin/RestrictedPage";
import ReviewsPage from "@/pages/admin/ReviewsPage";
import AuditPage from "@/pages/admin/AuditPage";
import EmailRecipientsPage from "@/pages/admin/EmailRecipientsPage";
import UsersRolesPage from "@/pages/admin/UsersRolesPage";

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
                <RequireAuth allowedRoles={["vendedor"]}>
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
              <Route path="/admin/campanias" element={<CampaignsPage />} />
              <Route path="/admin/solicitudes-registro" element={<RegistrationRequestsPage />} />
              <Route path="/admin/vendedores" element={<VendorsPage />} />
              <Route path="/admin/productos-modelos" element={<ProductsPage />} />
              <Route path="/admin/seriales" element={<SerialsPage />} />
              <Route path="/admin/restringidos" element={<RestrictedPage />} />
              <Route path="/admin/revisiones" element={<ReviewsPage />} />
              <Route path="/admin/auditoria" element={<AuditPage />} />
              <Route path="/admin/metricas" element={<Placeholder title="Métricas" />} />
              <Route path="/admin/correos-ciudad" element={<EmailRecipientsPage />} />
              <Route path="/admin/usuarios-roles" element={<UsersRolesPage />} />
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
