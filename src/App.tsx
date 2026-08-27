import { Suspense } from 'react'
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry'
import { Navigate, Route, Routes } from 'react-router-dom'
import { McAuthProvider } from '@/auth/McAuthContext'
import { McPostLoginRedirect } from '@/app/McPostLoginRedirect'
import { RequireMcAuth } from '@/app/RequireMcAuth'
import { RequireMcSalesRep } from '@/app/RequireMcSalesRep'
import { RequireMcLiveAccess } from '@/app/RequireMcLiveAccess'
import { RequireMcShowroomAccess } from '@/app/RequireMcShowroomAccess'
import { RequireMcStoreOwner } from '@/app/RequireMcStoreOwner'
import { McRouteAnalyticsTracker } from '@/lib/McRouteAnalyticsTracker'
import { parseStoreSlugFromHostname, resolveAppSurface } from '@/lib/storePublicUrl'
import { LandingPage } from '@/landing/LandingPage'
import { LegacyCatalogGateway } from '@/public/LegacyCatalogGateway'
import { PublicStoreProvider } from '@/public/PublicStoreContext'
import { McPublicPageLoadingFallback } from '@/components/McPublicPageLoadingFallback'
import { McPageLoadingFallback } from '@/components/McPageLoadingFallback'
import { RequireMcPosAccess } from '@/pos/RequireMcPosAccess'
import { RequireMcPosAdmin } from '@/pos/RequireMcPosAdmin'
import { RequireMcPosVendor } from '@/pos/RequireMcPosVendor'

const LoginPage = lazy(() =>
  import('@/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const FaqPage = lazy(() =>
  import('@/landing/FaqPage').then((m) => ({ default: m.FaqPage })),
)
const VerifyEmailPage = lazy(() =>
  import('@/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
)
const AppShell = lazy(() =>
  import('@/app/AppShell').then((m) => ({ default: m.AppShell })),
)
const DashboardPage = lazy(() =>
  import('@/app/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const InventarioPage = lazy(() =>
  import('@/app/InventarioPage').then((m) => ({ default: m.InventarioPage })),
)
const CategoriasPage = lazy(() =>
  import('@/app/CategoriasPage').then((m) => ({ default: m.CategoriasPage })),
)
const ProveedoresHubPage = lazy(() =>
  import('@/app/proveedores/ProveedoresHubPage').then((m) => ({ default: m.ProveedoresHubPage })),
)
const ProveedorBodegaPage = lazy(() =>
  import('@/app/proveedores/ProveedorBodegaPage').then((m) => ({ default: m.ProveedorBodegaPage })),
)
const ProveedorOnboardingPage = lazy(() =>
  import('@/app/proveedores/ProveedorOnboardingPage').then((m) => ({
    default: m.ProveedorOnboardingPage,
  })),
)
const ProveedorPortalPage = lazy(() =>
  import('@/app/proveedores/ProveedorPortalPage').then((m) => ({ default: m.ProveedorPortalPage })),
)
const PedidosPage = lazy(() =>
  import('@/app/PedidosPage').then((m) => ({ default: m.PedidosPage })),
)
const CuentaPage = lazy(() =>
  import('@/app/CuentaPage').then((m) => ({ default: m.CuentaPage })),
)
const CuentaEnvioPage = lazy(() =>
  import('@/app/CuentaEnvioPage').then((m) => ({ default: m.CuentaEnvioPage })),
)
const CuentaEnvioAutomaticoPage = lazy(() =>
  import('@/app/CuentaEnvioAutomaticoPage').then((m) => ({ default: m.CuentaEnvioAutomaticoPage })),
)
const CuentaEnvioManualPage = lazy(() =>
  import('@/app/CuentaEnvioManualPage').then((m) => ({ default: m.CuentaEnvioManualPage })),
)
const CuentaCuponesPage = lazy(() =>
  import('@/app/CuentaCuponesPage').then((m) => ({ default: m.CuentaCuponesPage })),
)
const CuentaEstiloPage = lazy(() =>
  import('@/app/CuentaEstiloPage').then((m) => ({ default: m.CuentaEstiloPage })),
)
const CuentaFuentesPage = lazy(() =>
  import('@/app/CuentaFuentesPage').then((m) => ({ default: m.CuentaFuentesPage })),
)
const CuentaLogoPage = lazy(() =>
  import('@/app/CuentaLogoPage').then((m) => ({ default: m.CuentaLogoPage })),
)
const CuentaBannerTemporadaPage = lazy(() =>
  import('@/app/CuentaBannerTemporadaPage').then((m) => ({ default: m.CuentaBannerTemporadaPage })),
)
const CuentaShowroomPage = lazy(() =>
  import('@/app/CuentaShowroomPage').then((m) => ({ default: m.CuentaShowroomPage })),
)
const PublicShowroomPage = lazy(() =>
  import('@/public/showroom/PublicShowroomPage').then((m) => ({ default: m.PublicShowroomPage })),
)
const CuentaSobreMarcaPage = lazy(() =>
  import('@/app/CuentaSobreMarcaPage').then((m) => ({ default: m.CuentaSobreMarcaPage })),
)
const CuentaAnnouncementBarPage = lazy(() =>
  import('@/app/CuentaAnnouncementBarPage').then((m) => ({ default: m.CuentaAnnouncementBarPage })),
)
const CuentaCabeceraPage = lazy(() =>
  import('@/app/CuentaCabeceraPage').then((m) => ({ default: m.CuentaCabeceraPage })),
)
const PersonalizarMiTiendaPage = lazy(() =>
  import('@/app/PersonalizarMiTiendaPage').then((m) => ({ default: m.PersonalizarMiTiendaPage })),
)
const CarritosAbandonadosPage = lazy(() =>
  import('@/app/CarritosAbandonadosPage').then((m) => ({ default: m.CarritosAbandonadosPage })),
)
const CuentaPerfilPage = lazy(() =>
  import('@/app/CuentaPerfilPage').then((m) => ({ default: m.CuentaPerfilPage })),
)
const CuentaTiendaPage = lazy(() =>
  import('@/app/CuentaTiendaPage').then((m) => ({ default: m.CuentaTiendaPage })),
)
const CuentaIdentidadTiendaPage = lazy(() =>
  import('@/app/CuentaIdentidadTiendaPage').then((m) => ({ default: m.CuentaIdentidadTiendaPage })),
)
const CuentaWhatsAppPage = lazy(() =>
  import('@/app/CuentaWhatsAppPage').then((m) => ({ default: m.CuentaWhatsAppPage })),
)
const CuentaCheckoutVentasPage = lazy(() =>
  import('@/app/CuentaCheckoutVentasPage').then((m) => ({ default: m.CuentaCheckoutVentasPage })),
)
const CuentaCheckoutVentasSeleccionPage = lazy(() =>
  import('@/app/CuentaCheckoutVentasSeleccionPage').then((m) => ({
    default: m.CuentaCheckoutVentasSeleccionPage,
  })),
)
const CuentaPoliticasPage = lazy(() =>
  import('@/app/CuentaPoliticasPage').then((m) => ({ default: m.CuentaPoliticasPage })),
)
const CuentaResumenVentasPage = lazy(() =>
  import('@/app/CuentaResumenVentasPage').then((m) => ({ default: m.CuentaResumenVentasPage })),
)
const CuentaTutorialesPage = lazy(() =>
  import('@/app/CuentaTutorialesPage').then((m) => ({ default: m.CuentaTutorialesPage })),
)
const PagosPasarelaPage = lazy(() =>
  import('@/app/PagosPasarelaPage').then((m) => ({ default: m.PagosPasarelaPage })),
)
const PagosAddiPage = lazy(() =>
  import('@/app/PagosAddiPage').then((m) => ({ default: m.PagosAddiPage })),
)
const OnepayPasarelaResumenPage = lazy(() =>
  import('@/app/OnepayPasarelaResumenPage').then((m) => ({ default: m.OnepayPasarelaResumenPage })),
)
const VentasSaldoPage = lazy(() =>
  import('@/app/VentasSaldoPage').then((m) => ({ default: m.VentasSaldoPage })),
)
const OnepayRetiroFondosPage = lazy(() =>
  import('@/app/OnepayRetiroFondosPage').then((m) => ({ default: m.OnepayRetiroFondosPage })),
)
const PlanUpgradePage = lazy(() =>
  import('@/app/PlanUpgradePage').then((m) => ({ default: m.PlanUpgradePage })),
)
const AdminWhatsNewPage = lazy(() =>
  import('@/app/AdminWhatsNewPage').then((m) => ({ default: m.AdminWhatsNewPage })),
)
const AdminCatalogPreviewLayout = lazy(() =>
  import('@/app/AdminCatalogPreviewLayout').then((m) => ({ default: m.AdminCatalogPreviewLayout })),
)
const EstadisticasPage = lazy(() =>
  import('@/app/EstadisticasPage').then((m) => ({ default: m.EstadisticasPage })),
)
const CatalogReportesHubPage = lazy(() =>
  import('@/app/reportes/CatalogReportesHubPage').then((m) => ({ default: m.CatalogReportesHubPage })),
)
const CatalogReporteDetailPage = lazy(() =>
  import('@/app/reportes/CatalogReporteDetailPage').then((m) => ({ default: m.CatalogReporteDetailPage })),
)
const LiveSessionsPage = lazy(() =>
  import('@/live/admin/LiveSessionsPage').then((m) => ({ default: m.LiveSessionsPage })),
)
const LiveStudioPage = lazy(() =>
  import('@/live/admin/LiveStudioPage').then((m) => ({ default: m.LiveStudioPage })),
)
const SuperAdminPage = lazy(() =>
  import('@/superadmin/SuperAdminPage').then((m) => ({
    default: m.SuperAdminPage,
  })),
)
const SuperAdminPasarelaMicatalogoPage = lazy(() =>
  import('@/superadmin/SuperAdminPasarelaMicatalogoPage').then((m) => ({
    default: m.SuperAdminPasarelaMicatalogoPage,
  })),
)
const SuperAdminEnviosMicatalogoPage = lazy(() =>
  import('@/superadmin/SuperAdminEnviosMicatalogoPage').then((m) => ({
    default: m.SuperAdminEnviosMicatalogoPage,
  })),
)
const SuperAdminPlanesPage = lazy(() =>
  import('@/superadmin/SuperAdminPlanesPage').then((m) => ({
    default: m.SuperAdminPlanesPage,
  })),
)
const SuperAdminDescuentosPage = lazy(() =>
  import('@/superadmin/SuperAdminDescuentosPage').then((m) => ({
    default: m.SuperAdminDescuentosPage,
  })),
)
const SuperAdminAnalyticsPage = lazy(() =>
  import('@/superadmin/SuperAdminAnalyticsPage').then((m) => ({
    default: m.SuperAdminAnalyticsPage,
  })),
)
const SuperAdminTerminosPage = lazy(() =>
  import('@/superadmin/SuperAdminTerminosPage').then((m) => ({
    default: m.SuperAdminTerminosPage,
  })),
)
const SuperAdminTutorialesPage = lazy(() =>
  import('@/superadmin/SuperAdminTutorialesPage').then((m) => ({
    default: m.SuperAdminTutorialesPage,
  })),
)
const SuperAdminTalleresPage = lazy(() =>
  import('@/superadmin/SuperAdminTalleresPage').then((m) => ({
    default: m.SuperAdminTalleresPage,
  })),
)
const TallerEventPage = lazy(() =>
  import('@/taller/TallerEventPage').then((m) => ({
    default: m.TallerEventPage,
  })),
)
const TallerRegistrationPage = lazy(() =>
  import('@/taller/TallerRegistrationPage').then((m) => ({
    default: m.TallerRegistrationPage,
  })),
)
const TallerPitchPage = lazy(() =>
  import('@/taller/TallerPitchPage').then((m) => ({
    default: m.TallerPitchPage,
  })),
)
const SuperAdminTenantOnepayPage = lazy(() =>
  import('@/superadmin/SuperAdminTenantOnepayPage').then((m) => ({
    default: m.SuperAdminTenantOnepayPage,
  })),
)
const SuperAdminTenantDetailPage = lazy(() =>
  import('@/superadmin/SuperAdminTenantDetailPage').then((m) => ({
    default: m.SuperAdminTenantDetailPage,
  })),
)
const SuperAdminVendedoresPage = lazy(() =>
  import('@/superadmin/SuperAdminVendedoresPage').then((m) => ({
    default: m.SuperAdminVendedoresPage,
  })),
)
const VendedorShell = lazy(() =>
  import('@/vendedor/VendedorShell').then((m) => ({ default: m.VendedorShell })),
)
const VendedorDashboardPage = lazy(() =>
  import('@/vendedor/VendedorDashboardPage').then((m) => ({ default: m.VendedorDashboardPage })),
)
const VendedorPitchPage = lazy(() =>
  import('@/vendedor/VendedorPitchPage').then((m) => ({ default: m.VendedorPitchPage })),
)
const VendedorCapacitacionPage = lazy(() =>
  import('@/vendedor/VendedorCapacitacionPage').then((m) => ({ default: m.VendedorCapacitacionPage })),
)
const VendedorPendientesPage = lazy(() =>
  import('@/vendedor/VendedorVisitasListPage').then((m) => ({ default: m.VendedorPendientesPage })),
)
const VendedorVendidasPage = lazy(() =>
  import('@/vendedor/VendedorVisitasListPage').then((m) => ({ default: m.VendedorVendidasPage })),
)
const VendedorRechazosPage = lazy(() =>
  import('@/vendedor/VendedorVisitasListPage').then((m) => ({ default: m.VendedorRechazosPage })),
)
const VendedorDemoAdminLayout = lazy(() =>
  import('@/vendedor/demo-admin/DemoAdminLayout').then((m) => ({ default: m.DemoAdminLayout })),
)
const DemoAdminDashboardPage = lazy(() =>
  import('@/vendedor/demo-admin/pages/DemoAdminDashboardPage').then((m) => ({
    default: m.DemoAdminDashboardPage,
  })),
)
const DemoAdminInventarioPage = lazy(() =>
  import('@/vendedor/demo-admin/pages/DemoAdminInventarioPage').then((m) => ({
    default: m.DemoAdminInventarioPage,
  })),
)
const DemoAdminPedidosPage = lazy(() =>
  import('@/vendedor/demo-admin/pages/DemoAdminPedidosPage').then((m) => ({
    default: m.DemoAdminPedidosPage,
  })),
)
const DemoAdminCuentaPage = lazy(() =>
  import('@/vendedor/demo-admin/pages/DemoAdminCuentaPage').then((m) => ({
    default: m.DemoAdminCuentaPage,
  })),
)
const DemoAdminEstadisticasPage = lazy(() =>
  import('@/vendedor/demo-admin/pages/DemoAdminEstadisticasPage').then((m) => ({
    default: m.DemoAdminEstadisticasPage,
  })),
)
const DemoAdminReportesHubPage = lazy(() =>
  import('@/vendedor/demo-admin/pages/DemoAdminReportesHubPage').then((m) => ({
    default: m.DemoAdminReportesHubPage,
  })),
)
const DemoAdminReporteDetailPage = lazy(() =>
  import('@/vendedor/demo-admin/pages/DemoAdminReporteDetailPage').then((m) => ({
    default: m.DemoAdminReporteDetailPage,
  })),
)
const DemoPosAdminLayout = lazy(() =>
  import('@/vendedor/demo-pos/DemoPosAdminLayout').then((m) => ({ default: m.DemoPosAdminLayout })),
)
const DemoPosVendorLayout = lazy(() =>
  import('@/vendedor/demo-pos/DemoPosVendorLayout').then((m) => ({ default: m.DemoPosVendorLayout })),
)
const DemoPosAdminDashboardPage = lazy(() =>
  import('@/vendedor/demo-pos/pages/DemoPosAdminDashboardPage').then((m) => ({
    default: m.DemoPosAdminDashboardPage,
  })),
)
const DemoPosAdminVentasPage = lazy(() =>
  import('@/vendedor/demo-pos/pages/DemoPosAdminVentasPage').then((m) => ({
    default: m.DemoPosAdminVentasPage,
  })),
)
const DemoPosAdminReportesPage = lazy(() =>
  import('@/vendedor/demo-pos/pages/DemoPosAdminReportesPage').then((m) => ({
    default: m.DemoPosAdminReportesPage,
  })),
)
const DemoPosAdminInventarioPage = lazy(() =>
  import('@/vendedor/demo-pos/pages/DemoPosAdminInventarioPage').then((m) => ({
    default: m.DemoPosAdminInventarioPage,
  })),
)
const DemoPosVendorHomePage = lazy(() =>
  import('@/vendedor/demo-pos/pages/DemoPosVendorHomePage').then((m) => ({
    default: m.DemoPosVendorHomePage,
  })),
)
const DemoPosVendorVentasPage = lazy(() =>
  import('@/vendedor/demo-pos/pages/DemoPosVendorVentasPage').then((m) => ({
    default: m.DemoPosVendorVentasPage,
  })),
)
const PublicCatalogLayout = lazy(() =>
  import('@/public/PublicCatalogLayout').then((m) => ({
    default: m.PublicCatalogLayout,
  })),
)
const PublicCatalogListPage = lazy(() =>
  import('@/public/PublicCatalogListPage').then((m) => ({
    default: m.PublicCatalogListPage,
  })),
)
const PublicProductDetailPage = lazy(() =>
  import('@/public/PublicProductDetailPage').then((m) => ({
    default: m.PublicProductDetailPage,
  })),
)
const PublicCheckoutPage = lazy(() =>
  import('@/public/PublicCheckoutPage').then((m) => ({
    default: m.PublicCheckoutPage,
  })),
)
const LiveViewerPage = lazy(() =>
  import('@/live/viewer/LiveViewerPage').then((m) => ({ default: m.LiveViewerPage })),
)
const PublicCheckoutPagoValidandoPage = lazy(() =>
  import('@/public/PublicCheckoutPagoValidandoPage').then((m) => ({
    default: m.PublicCheckoutPagoValidandoPage,
  })),
)
const PublicCheckoutSuccessPage = lazy(() =>
  import('@/public/PublicCheckoutSuccessPage').then((m) => ({
    default: m.PublicCheckoutSuccessPage,
  })),
)
const PublicOrderTrackingPage = lazy(() =>
  import('@/public/PublicOrderTrackingPage').then((m) => ({
    default: m.PublicOrderTrackingPage,
  })),
)
const PublicPoliciesPage = lazy(() =>
  import('@/public/PublicPoliciesPage').then((m) => ({
    default: m.PublicPoliciesPage,
  })),
)
const PublicFavoritesPage = lazy(() =>
  import('@/public/PublicFavoritesPage').then((m) => ({
    default: m.PublicFavoritesPage,
  })),
)
const PublicWishlistPage = lazy(() =>
  import('@/public/PublicWishlistPage').then((m) => ({
    default: m.PublicWishlistPage,
  })),
)
const PublicWishlistManagePage = lazy(() =>
  import('@/public/PublicWishlistManagePage').then((m) => ({
    default: m.PublicWishlistManagePage,
  })),
)
const PublicMisPedidosPage = lazy(() =>
  import('@/public/PublicMisPedidosPage').then((m) => ({
    default: m.PublicMisPedidosPage,
  })),
)
const CuentaResenasPage = lazy(() =>
  import('@/app/CuentaResenasPage').then((m) => ({
    default: m.CuentaResenasPage,
  })),
)
const PosLandingPage = lazy(() =>
  import('@/pos/PosLandingPage').then((m) => ({ default: m.PosLandingPage })),
)
const PosAdminShell = lazy(() =>
  import('@/pos/admin/PosAdminShell').then((m) => ({ default: m.PosAdminShell })),
)
const PosVendorShell = lazy(() =>
  import('@/pos/vendor/PosVendorShell').then((m) => ({ default: m.PosVendorShell })),
)
const PosAdminDashboardPage = lazy(() =>
  import('@/pos/admin/PosAdminDashboardPage').then((m) => ({ default: m.PosAdminDashboardPage })),
)
const PosSedesPage = lazy(() =>
  import('@/pos/admin/PosSedesPage').then((m) => ({ default: m.PosSedesPage })),
)
const PosVendedoresPage = lazy(() =>
  import('@/pos/admin/PosVendedoresPage').then((m) => ({ default: m.PosVendedoresPage })),
)
const PosReportesHubPage = lazy(() =>
  import('@/pos/admin/PosReportesHubPage').then((m) => ({ default: m.PosReportesHubPage })),
)
const PosReporteDetailPage = lazy(() =>
  import('@/pos/admin/PosReporteDetailPage').then((m) => ({ default: m.PosReporteDetailPage })),
)
const PosVentasDelDiaAdminPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosAdminVentasPage })),
)
const PosCajaPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosAdminCajaPage })),
)
const PosInventarioPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosAdminInventarioPage })),
)
const PosDevolucionesPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosAdminDevolucionesPage })),
)
const PosAdminMovimientosPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosAdminMovimientosPage })),
)
const PosAdminCajasPage = lazy(() =>
  import('@/pos/admin/PosAdminCajasPage').then((m) => ({ default: m.PosAdminCajasPage })),
)
const PosClientesPage = lazy(() =>
  import('@/pos/admin/PosClientesPage').then((m) => ({ default: m.PosClientesPage })),
)
const PosClienteComprasPage = lazy(() =>
  import('@/pos/admin/PosClienteComprasPage').then((m) => ({ default: m.PosClienteComprasPage })),
)
const PosVentasDelDiaPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosVendorVentasDelDiaPage })),
)
const PosVendorVentasPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosVendorVentasPage })),
)
const PosVendorCajaPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosVendorCajaPage })),
)
const PosVendorInventarioPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosVendorInventarioPage })),
)
const PosVendorDevolucionesPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosVendorDevolucionesPage })),
)
const PosVendorMovimientosPage = lazy(() =>
  import('@/pos/PosRoutePages').then((m) => ({ default: m.PosVendorMovimientosPage })),
)

function RouteFallback() {
  const storeHost =
    typeof window !== 'undefined' &&
    resolveAppSurface() === 'store' &&
    Boolean(parseStoreSlugFromHostname(window.location.hostname))
  if (storeHost) return <McPublicPageLoadingFallback />
  return <McPageLoadingFallback />
}

const publicCatalogRouteElements = (
  <>
    <Route index element={<PublicCatalogListPage />} />
    <Route path="p/:productId" element={<PublicProductDetailPage />} />
    <Route path="checkout/pago-validando" element={<PublicCheckoutPagoValidandoPage />} />
    <Route path="checkout/exito" element={<PublicCheckoutSuccessPage />} />
    <Route path="checkout" element={<PublicCheckoutPage />} />
    <Route path="seguimiento" element={<PublicOrderTrackingPage />} />
    <Route path="mis-pedidos" element={<PublicMisPedidosPage />} />
    <Route path="favoritos" element={<PublicFavoritesPage />} />
    <Route path="lista/:wishlistId/gestionar" element={<PublicWishlistManagePage />} />
    <Route path="lista/:wishlistId" element={<PublicWishlistPage />} />
    <Route path="politicas" element={<PublicPoliciesPage />} />
    <Route path="live/:sessionId" element={<LiveViewerPage />} />
    <Route path="coleccion" element={<PublicShowroomPage />} />
  </>
)

function PlatformRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/preguntas-frecuentes" element={<FaqPage />} />
      <Route path="/faq" element={<Navigate to="/preguntas-frecuentes" replace />} />
      <Route path="/verificar-email" element={<VerifyEmailPage />} />
      <Route
        path="/vendedor"
        element={
          <RequireMcAuth>
            <RequireMcSalesRep>
              <VendedorShell />
            </RequireMcSalesRep>
          </RequireMcAuth>
        }
      >
        <Route index element={<VendedorDashboardPage />} />
        <Route path="pitch" element={<VendedorPitchPage />} />
        <Route path="capacitacion" element={<VendedorCapacitacionPage />} />
        <Route path="pendientes" element={<VendedorPendientesPage />} />
        <Route path="vendidas" element={<VendedorVendidasPage />} />
        <Route path="rechazos" element={<VendedorRechazosPage />} />
      </Route>
      <Route
        path="/vendedor/demo-admin/:demoId"
        element={
          <RequireMcAuth>
            <RequireMcSalesRep>
              <VendedorDemoAdminLayout />
            </RequireMcSalesRep>
          </RequireMcAuth>
        }
      >
        <Route index element={<DemoAdminDashboardPage />} />
        <Route path="inventario" element={<DemoAdminInventarioPage />} />
        <Route path="pedidos" element={<DemoAdminPedidosPage />} />
        <Route path="reportes" element={<DemoAdminReportesHubPage />} />
        <Route path="reportes/:reportId" element={<DemoAdminReporteDetailPage />} />
        <Route path="cuenta" element={<DemoAdminCuentaPage />} />
        <Route path="estadisticas" element={<DemoAdminEstadisticasPage />} />
      </Route>
      <Route
        path="/vendedor/demo-pos-admin/:demoId"
        element={
          <RequireMcAuth>
            <RequireMcSalesRep>
              <DemoPosAdminLayout />
            </RequireMcSalesRep>
          </RequireMcAuth>
        }
      >
        <Route index element={<DemoPosAdminDashboardPage />} />
        <Route path="ventas" element={<DemoPosAdminVentasPage />} />
        <Route path="reportes" element={<DemoPosAdminReportesPage />} />
        <Route path="inventario" element={<DemoPosAdminInventarioPage />} />
      </Route>
      <Route
        path="/vendedor/demo-pos-vendor/:demoId"
        element={
          <RequireMcAuth>
            <RequireMcSalesRep>
              <DemoPosVendorLayout />
            </RequireMcSalesRep>
          </RequireMcAuth>
        }
      >
        <Route index element={<DemoPosVendorHomePage />} />
        <Route path="ventas" element={<DemoPosVendorVentasPage />} />
      </Route>
      <Route
        path="/app"
        element={
          <RequireMcAuth>
            <RequireMcStoreOwner>
              <AppShell />
            </RequireMcStoreOwner>
          </RequireMcAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="inventario" element={<InventarioPage />} />
        <Route path="inventario/categorias" element={<CategoriasPage />} />
        <Route path="proveedores" element={<ProveedoresHubPage />} />
        <Route path="proveedores/:proveedorId" element={<ProveedorBodegaPage />} />
        <Route path="proveedor/onboarding" element={<ProveedorOnboardingPage />} />
        <Route path="proveedor" element={<ProveedorPortalPage />} />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="reportes" element={<CatalogReportesHubPage />} />
        <Route path="reportes/:reportId" element={<CatalogReporteDetailPage />} />
        <Route path="plan" element={<PlanUpgradePage />} />
        <Route path="novedades" element={<AdminWhatsNewPage />} />
        <Route path="estadisticas" element={<EstadisticasPage />} />
        <Route path="cuenta" element={<CuentaPage />} />
        <Route path="cuenta/perfil" element={<CuentaPerfilPage />} />
        <Route path="cuenta/tienda" element={<CuentaTiendaPage />} />
        <Route path="cuenta/identidad-tienda" element={<CuentaIdentidadTiendaPage />} />
        <Route path="cuenta/whatsapp" element={<CuentaWhatsAppPage />} />
        <Route path="cuenta/checkout-ventas" element={<CuentaCheckoutVentasPage />} />
        <Route path="cuenta/checkout-ventas/seleccion" element={<CuentaCheckoutVentasSeleccionPage />} />
        <Route path="cuenta/politicas" element={<CuentaPoliticasPage />} />
        <Route path="cuenta/resenas" element={<CuentaResenasPage />} />
        <Route path="cuenta/resumen-ventas" element={<CuentaResumenVentasPage />} />
        <Route path="cuenta/envio" element={<CuentaEnvioPage />} />
        <Route path="cuenta/envio/automatico" element={<CuentaEnvioAutomaticoPage />} />
        <Route path="cuenta/envio/manual" element={<CuentaEnvioManualPage />} />
        <Route path="cuenta/cupones" element={<CuentaCuponesPage />} />
        <Route path="personalizar" element={<PersonalizarMiTiendaPage />} />
        <Route path="cuenta/estilo" element={<CuentaEstiloPage />} />
        <Route path="cuenta/fuentes" element={<CuentaFuentesPage />} />
        <Route path="cuenta/logo" element={<CuentaLogoPage />} />
        <Route path="cuenta/banner-temporada" element={<CuentaBannerTemporadaPage />} />
        <Route
          path="cuenta/showroom"
          element={
            <RequireMcShowroomAccess>
              <CuentaShowroomPage />
            </RequireMcShowroomAccess>
          }
        />
        <Route path="cuenta/sobre-marca" element={<CuentaSobreMarcaPage />} />
        <Route path="cuenta/barra-anuncio" element={<CuentaAnnouncementBarPage />} />
        <Route path="cuenta/cabecera" element={<CuentaCabeceraPage />} />
        <Route path="cuenta/carritos-abandonados" element={<CarritosAbandonadosPage />} />
        <Route path="cuenta/tutoriales" element={<CuentaTutorialesPage />} />
        <Route path="pagos-pasarela" element={<PagosPasarelaPage />} />
        <Route path="pagos-pasarela/onepay" element={<OnepayPasarelaResumenPage />} />
        <Route path="pagos-addi" element={<PagosAddiPage />} />
        <Route path="mi-saldo" element={<VentasSaldoPage />} />
        <Route path="mi-saldo/retirar" element={<OnepayRetiroFondosPage />} />
        <Route
          path="live"
          element={
            <RequireMcLiveAccess>
              <LiveSessionsPage />
            </RequireMcLiveAccess>
          }
        />
        <Route
          path="live/:sessionId"
          element={
            <RequireMcLiveAccess>
              <LiveStudioPage />
            </RequireMcLiveAccess>
          }
        />
        <Route path="vista-previa" element={<AdminCatalogPreviewLayout />}>
          <Route index element={<PublicCatalogListPage />} />
          <Route path="p/:productId" element={<PublicProductDetailPage />} />
          <Route path="checkout" element={<PublicCheckoutPage />} />
          <Route path="favoritos" element={<PublicFavoritesPage />} />
          <Route path="lista/:wishlistId/gestionar" element={<PublicWishlistManagePage />} />
          <Route path="lista/:wishlistId" element={<PublicWishlistPage />} />
          <Route path="politicas" element={<PublicPoliciesPage />} />
          <Route path="coleccion" element={<PublicShowroomPage />} />
        </Route>
      </Route>
      <Route
        path="/superadmin"
        element={
          <RequireMcAuth>
            <SuperAdminPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/pasarela-micatalogo"
        element={
          <RequireMcAuth>
            <SuperAdminPasarelaMicatalogoPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/envios-micatalogo"
        element={
          <RequireMcAuth>
            <SuperAdminEnviosMicatalogoPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/planes"
        element={
          <RequireMcAuth>
            <SuperAdminPlanesPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/descuentos"
        element={
          <RequireMcAuth>
            <SuperAdminDescuentosPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/analytics"
        element={
          <RequireMcAuth>
            <SuperAdminAnalyticsPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/terminos"
        element={
          <RequireMcAuth>
            <SuperAdminTerminosPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/tutoriales"
        element={
          <RequireMcAuth>
            <SuperAdminTutorialesPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/talleres"
        element={
          <RequireMcAuth>
            <SuperAdminTalleresPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/talleres/:slug/pitch"
        element={
          <RequireMcAuth>
            <TallerPitchPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/tienda/:tenantId/onepay"
        element={
          <RequireMcAuth>
            <SuperAdminTenantOnepayPage />
          </RequireMcAuth>
        }
      />
      <Route
        path="/superadmin/tienda/:tenantId"
        element={
          <RequireMcAuth>
            <SuperAdminTenantDetailPage />
          </RequireMcAuth>
        }
      />
      <Route path="/pos" element={<PosLandingPage />} />
      <Route
        path="/pos/admin"
        element={
          <RequireMcAuth>
            <RequireMcPosAccess>
              <RequireMcPosAdmin>
                <PosAdminShell />
              </RequireMcPosAdmin>
            </RequireMcPosAccess>
          </RequireMcAuth>
        }
      >
        <Route index element={<PosAdminDashboardPage />} />
        <Route path="ventas" element={<PosVentasDelDiaAdminPage />} />
        <Route path="ventas/hoy" element={<Navigate to="/pos/admin/ventas" replace />} />
        <Route path="clientes" element={<PosClientesPage />} />
        <Route path="clientes/:clienteId" element={<PosClienteComprasPage />} />
        <Route path="cobrar" element={<Navigate to="/pos/ventas" replace />} />
        <Route path="caja" element={<PosCajaPage />} />
        <Route path="movimientos" element={<PosAdminMovimientosPage />} />
        <Route path="inventario" element={<PosInventarioPage />} />
        <Route path="devoluciones" element={<PosDevolucionesPage />} />
        <Route path="cajas" element={<PosAdminCajasPage />} />
        <Route path="sedes" element={<PosSedesPage />} />
        <Route path="vendedores" element={<PosVendedoresPage />} />
        <Route path="reportes" element={<PosReportesHubPage />} />
        <Route path="reportes/:reportId" element={<PosReporteDetailPage />} />
      </Route>
      <Route
        path="/pos/ventas"
        element={
          <RequireMcAuth>
            <RequireMcPosAccess>
              <RequireMcPosVendor>
                <PosVendorShell />
              </RequireMcPosVendor>
            </RequireMcPosAccess>
          </RequireMcAuth>
        }
      >
        <Route index element={<PosVendorVentasPage />} />
        <Route path="hoy" element={<PosVentasDelDiaPage />} />
        <Route path="caja" element={<PosVendorCajaPage />} />
        <Route path="movimientos" element={<PosVendorMovimientosPage />} />
        <Route path="inventario" element={<PosVendorInventarioPage />} />
        <Route path="devoluciones" element={<PosVendorDevolucionesPage />} />
      </Route>
      <Route
        path="/superadmin/vendedores"
        element={
          <RequireMcAuth>
            <SuperAdminVendedoresPage />
          </RequireMcAuth>
        }
      />
      <Route path="/c/:slug" element={<LegacyCatalogGateway />}>
        <Route element={<PublicCatalogLayout />}>{publicCatalogRouteElements}</Route>
      </Route>
      <Route path="/taller/:slug" element={<TallerEventPage />} />
      <Route path="/taller/:slug/inscribirse" element={<TallerRegistrationPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function StoreSubdomainRoutes() {
  return (
    <Routes>
      <Route
        element={
          <PublicStoreProvider>
            <PublicCatalogLayout />
          </PublicStoreProvider>
        }
      >
        {publicCatalogRouteElements}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const storeHostSlug =
  typeof window !== 'undefined' ? parseStoreSlugFromHostname(window.location.hostname) : null
const isStoreHost = resolveAppSurface() === 'store' && Boolean(storeHostSlug)

export function App() {
  return (
    <McAuthProvider>
      <Suspense fallback={<RouteFallback />}>
        <McPostLoginRedirect />
        <McRouteAnalyticsTracker />
        {isStoreHost ? <StoreSubdomainRoutes /> : <PlatformRoutes />}
      </Suspense>
    </McAuthProvider>
  )
}
