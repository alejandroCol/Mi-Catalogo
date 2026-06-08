import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { McAuthProvider } from '@/auth/McAuthContext'
import { McPostLoginRedirect } from '@/app/McPostLoginRedirect'
import { RequireMcAuth } from '@/app/RequireMcAuth'
import { RequireMcSalesRep } from '@/app/RequireMcSalesRep'
import { RequireMcStoreOwner } from '@/app/RequireMcStoreOwner'
import { McRouteAnalyticsTracker } from '@/lib/McRouteAnalyticsTracker'
import { parseStoreSlugFromHostname, resolveAppSurface } from '@/lib/storePublicUrl'
import { LandingPage } from '@/landing/LandingPage'
import { LegacyCatalogGateway } from '@/public/LegacyCatalogGateway'
import { PublicStoreProvider } from '@/public/PublicStoreContext'

const LoginPage = lazy(() =>
  import('@/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
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
const CuentaLogoPage = lazy(() =>
  import('@/app/CuentaLogoPage').then((m) => ({ default: m.CuentaLogoPage })),
)
const CuentaBannerTemporadaPage = lazy(() =>
  import('@/app/CuentaBannerTemporadaPage').then((m) => ({ default: m.CuentaBannerTemporadaPage })),
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
const EstadisticasPage = lazy(() =>
  import('@/app/EstadisticasPage').then((m) => ({ default: m.EstadisticasPage })),
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
const SuperAdminTenantOnepayPage = lazy(() =>
  import('@/superadmin/SuperAdminTenantOnepayPage').then((m) => ({
    default: m.SuperAdminTenantOnepayPage,
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
const VendedorDemoAdminPage = lazy(() =>
  import('@/vendedor/VendedorDemoAdminPage').then((m) => ({ default: m.VendedorDemoAdminPage })),
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
function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
      Cargando…
    </div>
  )
}

const publicCatalogRouteElements = (
  <>
    <Route index element={<PublicCatalogListPage />} />
    <Route path="p/:productId" element={<PublicProductDetailPage />} />
    <Route path="checkout/pago-validando" element={<PublicCheckoutPagoValidandoPage />} />
    <Route path="checkout/exito" element={<PublicCheckoutSuccessPage />} />
    <Route path="checkout" element={<PublicCheckoutPage />} />
    <Route path="seguimiento" element={<PublicOrderTrackingPage />} />
    <Route path="politicas" element={<PublicPoliciesPage />} />
  </>
)

function PlatformRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
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
        <Route path="demo-admin/:demoId" element={<VendedorDemoAdminPage />} />
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
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="plan" element={<PlanUpgradePage />} />
        <Route path="estadisticas" element={<EstadisticasPage />} />
        <Route path="cuenta" element={<CuentaPage />} />
        <Route path="cuenta/perfil" element={<CuentaPerfilPage />} />
        <Route path="cuenta/tienda" element={<CuentaTiendaPage />} />
        <Route path="cuenta/whatsapp" element={<CuentaWhatsAppPage />} />
        <Route path="cuenta/checkout-ventas" element={<CuentaCheckoutVentasPage />} />
        <Route path="cuenta/checkout-ventas/seleccion" element={<CuentaCheckoutVentasSeleccionPage />} />
        <Route path="cuenta/politicas" element={<CuentaPoliticasPage />} />
        <Route path="cuenta/resumen-ventas" element={<CuentaResumenVentasPage />} />
        <Route path="cuenta/envio" element={<CuentaEnvioPage />} />
        <Route path="cuenta/envio/automatico" element={<CuentaEnvioAutomaticoPage />} />
        <Route path="cuenta/envio/manual" element={<CuentaEnvioManualPage />} />
        <Route path="cuenta/cupones" element={<CuentaCuponesPage />} />
        <Route path="personalizar" element={<PersonalizarMiTiendaPage />} />
        <Route path="cuenta/estilo" element={<CuentaEstiloPage />} />
        <Route path="cuenta/logo" element={<CuentaLogoPage />} />
        <Route path="cuenta/banner-temporada" element={<CuentaBannerTemporadaPage />} />
        <Route path="cuenta/carritos-abandonados" element={<CarritosAbandonadosPage />} />
        <Route path="cuenta/tutoriales" element={<CuentaTutorialesPage />} />
        <Route path="pagos-pasarela" element={<PagosPasarelaPage />} />
        <Route path="pagos-pasarela/onepay" element={<OnepayPasarelaResumenPage />} />
        <Route path="mi-saldo" element={<VentasSaldoPage />} />
        <Route path="mi-saldo/retirar" element={<OnepayRetiroFondosPage />} />
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
        path="/superadmin/tienda/:tenantId/onepay"
        element={
          <RequireMcAuth>
            <SuperAdminTenantOnepayPage />
          </RequireMcAuth>
        }
      />
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
