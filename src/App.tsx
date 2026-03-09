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
import CampaignLandingPage from "@/pages/CampaignLandingPage";
import NotFound from "@/pages/NotFound";

// Layouts
import VendorLayout from "@/layouts/VendorLayout";
import AdminLayout from "@/layouts/AdminLayout";

// Vendor pages
import VendorDashboard from "@/pages/VendorDashboard";
import RegisterSalePage from "@/pages/RegisterSalePage";
import MySalesPage from "@/pages/MySalesPage";
import RankingPage from "@/pages/RankingPage";
import VendorProfilePage from "@/pages/VendorProfilePage";
import InstallAppPage from "@/pages/InstallAppPage";

// Admin pages
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import CampaignsPage from "@/pages/admin/CampaignsPage";

import VendorsPage from "@/pages/admin/VendorsPage";
import ProductsPage from "@/pages/admin/ProductsPage";
import SerialsPage from "@/pages/admin/SerialsPage";
import RestrictedPage from "@/pages/admin/RestrictedPage";
import ReviewsPage from "@/pages/admin/ReviewsPage";
import AuditPage from "@/pages/admin/AuditPage";
import EmailRecipientsPage from "@/pages/admin/EmailRecipientsPage";
import UsersRolesPage from "@/pages/admin/UsersRolesPage";
import ConfigurationPage from "@/pages/admin/ConfigurationPage";
import MetricsPage from "@/pages/admin/MetricsPage";
import CommissionsPage from "@/pages/admin/CommissionsPage";
import EmailTemplatesPage from "@/pages/admin/EmailTemplatesPage";
import EnrollmentReportPage from "@/pages/admin/EnrollmentReportPage";
import CampaignComparePage from "@/pages/admin/CampaignComparePage";
import AdminManualPage from "@/pages/admin/AdminManualPage";

const queryClient = new QueryClient();

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
            <Route path="/c/:slug" element={<CampaignLandingPage />} />
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
              <Route path="/v/perfil" element={<VendorProfilePage />} />
              <Route path="/v/instalar" element={<InstallAppPage />} />
            </Route>

            {/* Admin — shared routes (admin, supervisor, revisor_ciudad) */}
            <Route
              element={
                <RequireAuth allowedRoles={["admin", "supervisor", "revisor_ciudad"]}>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/revisiones" element={<ReviewsPage />} />
              <Route path="/admin/metricas" element={<MetricsPage />} />
              <Route path="/admin/manual" element={<AdminManualPage />} />

              {/* Supervisor + Admin only */}
              <Route path="/admin/auditoria" element={
                <RequireAuth allowedRoles={["admin", "supervisor"]}>
                  <AuditPage />
                </RequireAuth>
              } />

              {/* Admin-only routes */}
              <Route path="/admin/campanias" element={
                <RequireAuth allowedRoles={["admin"]}><CampaignsPage /></RequireAuth>
              } />
              <Route path="/admin/vendedores" element={
                <RequireAuth allowedRoles={["admin"]}><VendorsPage /></RequireAuth>
              } />
              <Route path="/admin/productos-modelos" element={
                <RequireAuth allowedRoles={["admin"]}><ProductsPage /></RequireAuth>
              } />
              <Route path="/admin/seriales" element={
                <RequireAuth allowedRoles={["admin"]}><SerialsPage /></RequireAuth>
              } />
              <Route path="/admin/restringidos" element={
                <RequireAuth allowedRoles={["admin"]}><RestrictedPage /></RequireAuth>
              } />
              <Route path="/admin/comisiones" element={
                <RequireAuth allowedRoles={["admin"]}><CommissionsPage /></RequireAuth>
              } />
              <Route path="/admin/plantillas-email" element={
                <RequireAuth allowedRoles={["admin"]}><EmailTemplatesPage /></RequireAuth>
              } />
              <Route path="/admin/inscripciones" element={
                <RequireAuth allowedRoles={["admin"]}><EnrollmentReportPage /></RequireAuth>
              } />
              <Route path="/admin/comparar-campanias" element={
                <RequireAuth allowedRoles={["admin"]}><CampaignComparePage /></RequireAuth>
              } />
              <Route path="/admin/correos-ciudad" element={
                <RequireAuth allowedRoles={["admin"]}><EmailRecipientsPage /></RequireAuth>
              } />
              <Route path="/admin/usuarios-roles" element={
                <RequireAuth allowedRoles={["admin"]}><UsersRolesPage /></RequireAuth>
              } />
              <Route path="/admin/configuracion" element={
                <RequireAuth allowedRoles={["admin"]}><ConfigurationPage /></RequireAuth>
              } />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
