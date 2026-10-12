import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import RequireAuth from "@/components/guards/RequireAuth";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

// Public pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
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
import VendorProfilePage from "@/pages/VendorProfilePage";
import MyPaymentsPage from "@/pages/MyPaymentsPage";

// Admin pages
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import CampaignsPage from "@/pages/admin/CampaignsPage";
import RegistrationRequestsPage from "@/pages/admin/RegistrationRequestsPage";
import VendorsPage from "@/pages/admin/VendorsPage";
import ProductsPage from "@/pages/admin/ProductsPage";
import SerialsPage from "@/pages/admin/SerialsPage";
import ReviewsPage from "@/pages/admin/ReviewsPage";
import AuditPage from "@/pages/admin/AuditPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import UsersRolesPage from "@/pages/admin/UsersRolesPage";
import ConfigurationPage from "@/pages/admin/ConfigurationPage";
import PaymentsAdminPage from "@/pages/PaymentsAdminPage";
import TiendasPage from "@/pages/admin/TiendasPage";
import DamagedEquipmentListPage from "@/pages/admin/damaged/DamagedEquipmentListPage";
import DamagedEquipmentRegisterPage from "@/pages/admin/damaged/DamagedEquipmentRegisterPage";

// Módulos Nuevos: Cliente Final, Ruleta, Supervisión y Sorteos
import LandingCampanaClientePage from "@/pages/LandingCampanaClientePage";
import ConsultaTicketsPage from "@/pages/ConsultaTicketsPage";
import BandeoRuletaPage from "@/pages/BandeoRuletaPage";
import InventarioImpulsadorPage from "@/pages/InventarioImpulsadorPage";
import SupervisorClientePage from "@/pages/admin/SupervisorClientePage";
import TombolaSorteoPage from "@/pages/admin/TombolaSorteoPage";
import AdminCampanasClientePage from "@/pages/admin/AdminCampanasClientePage";
import AdminInventariosPremiosPage from "@/pages/admin/AdminInventariosPremiosPage";
import AdminGanadoresPage from "@/pages/admin/AdminGanadoresPage";
import WhatsappPage from "@/pages/admin/WhatsappPage";
import WhatsappConfigPage from "@/pages/admin/WhatsappConfigPage";
import AdminPremiosVendedoresPage from "@/pages/admin/AdminPremiosVendedoresPage";
import VendorCanjesPage from "@/pages/VendorCanjesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/sorteo" element={<LandingCampanaClientePage />} />
            <Route path="/registro-cliente" element={<LandingCampanaClientePage />} />
            <Route path="/mis-tickets" element={<ConsultaTicketsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Vendor & Operador Bandeo (protected layout) */}
            <Route
              element={
                <RequireAuth allowedRoles={["vendedor", "operador_bandeo"]}>
                  <VendorLayout />
                </RequireAuth>
              }
            >
              {/* Exclusivo Operador de Bandeo */}
              <Route
                path="/v/bandeo-ruleta"
                element={
                  <RequireAuth allowedRoles={["operador_bandeo", "admin"]}>
                    <BandeoRuletaPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/v/mi-inventario-premios"
                element={
                  <RequireAuth allowedRoles={["operador_bandeo", "admin"]}>
                    <InventarioImpulsadorPage />
                  </RequireAuth>
                }
              />

              {/* Exclusivo Vendedor de Tienda */}
              <Route
                path="/v"
                element={
                  <RequireAuth allowedRoles={["vendedor", "admin"]}>
                    <VendorDashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/v/registrar-venta"
                element={
                  <RequireAuth allowedRoles={["vendedor", "admin"]}>
                    <RegisterSalePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/v/mis-ventas"
                element={
                  <RequireAuth allowedRoles={["vendedor", "admin"]}>
                    <MySalesPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/v/ranking"
                element={
                  <RequireAuth allowedRoles={["vendedor", "admin"]}>
                    <RankingPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/v/mis-pagos"
                element={
                  <RequireAuth allowedRoles={["vendedor", "admin"]}>
                    <MyPaymentsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/v/canjes"
                element={
                  <RequireAuth allowedRoles={["vendedor", "admin"]}>
                    <VendorCanjesPage />
                  </RequireAuth>
                }
              />
              <Route path="/v/perfil" element={<VendorProfilePage />} />

            </Route>

            {/* Admin & Staff (protected) */}
            <Route
              element={
                <RequireAuth allowedRoles={["admin", "supervisor", "revisor_ciudad", "tecnico"]}>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/supervision-clientes" element={<SupervisorClientePage />} />
              <Route path="/admin/tombola-sorteos" element={<TombolaSorteoPage />} />
              <Route path="/admin/campanas-cliente" element={<AdminCampanasClientePage />} />
              <Route path="/admin/inventario-premios" element={<AdminInventariosPremiosPage />} />
              <Route path="/admin/ganadores-sorteos" element={<AdminGanadoresPage />} />
              <Route path="/admin/campanias" element={<CampaignsPage />} />
              <Route path="/admin/premios-vendedores" element={<AdminPremiosVendedoresPage />} />

              <Route path="/admin/solicitudes-registro" element={<RegistrationRequestsPage />} />
              <Route path="/admin/vendedores" element={<VendorsPage />} />
              <Route path="/admin/productos-modelos" element={<ProductsPage />} />
              <Route path="/admin/seriales" element={<SerialsPage />} />
              <Route path="/admin/equipos-danados" element={<DamagedEquipmentListPage />} />
              <Route path="/admin/equipos-danados/nuevo" element={<DamagedEquipmentRegisterPage />} />
              <Route path="/admin/revisiones" element={<ReviewsPage />} />
              <Route path="/admin/auditoria" element={<AuditPage />} />
              <Route path="/admin/reportes" element={<ReportsPage />} />
              <Route path="/admin/usuarios-roles" element={<UsersRolesPage />} />
              <Route path="/admin/configuracion" element={<ConfigurationPage />} />
              <Route path="/admin/pagos" element={<PaymentsAdminPage />} />
              <Route path="/admin/tiendas" element={<TiendasPage />} />
              <Route path="/admin/whatsapp" element={<WhatsappPage />} />
              <Route path="/admin/whatsapp-config" element={<WhatsappConfigPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
