import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { McAuthProvider } from '@/auth/McAuthContext'
import { RequireMcAuth } from '@/app/RequireMcAuth'

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
const PedidosPage = lazy(() =>
  import('@/app/PedidosPage').then((m) => ({ default: m.PedidosPage })),
)
const CuentaPage = lazy(() =>
  import('@/app/CuentaPage').then((m) => ({ default: m.CuentaPage })),
)
const CuentaEnvioPage = lazy(() =>
  import('@/app/CuentaEnvioPage').then((m) => ({ default: m.CuentaEnvioPage })),
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
const CarritosAbandonadosPage = lazy(() =>
  import('@/app/CarritosAbandonadosPage').then((m) => ({ default: m.CarritosAbandonadosPage })),
)
const PagosPasarelaPage = lazy(() =>
  import('@/app/PagosPasarelaPage').then((m) => ({ default: m.PagosPasarelaPage })),
)
const OnepayPasarelaResumenPage = lazy(() =>
  import('@/app/OnepayPasarelaResumenPage').then((m) => ({ default: m.OnepayPasarelaResumenPage })),
)
const PlanUpgradePage = lazy(() =>
  import('@/app/PlanUpgradePage').then((m) => ({ default: m.PlanUpgradePage })),
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
const SuperAdminTenantOnepayPage = lazy(() =>
  import('@/superadmin/SuperAdminTenantOnepayPage').then((m) => ({
    default: m.SuperAdminTenantOnepayPage,
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

export function App() {
  return (
    <McAuthProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/verificar-email" element={<VerifyEmailPage />} />
          <Route
            path="/app"
            element={
              <RequireMcAuth>
                <AppShell />
              </RequireMcAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="inventario" element={<InventarioPage />} />
            <Route path="pedidos" element={<PedidosPage />} />
            <Route path="plan" element={<PlanUpgradePage />} />
            <Route path="cuenta" element={<CuentaPage />} />
            <Route path="cuenta/envio" element={<CuentaEnvioPage />} />
            <Route path="cuenta/cupones" element={<CuentaCuponesPage />} />
            <Route path="cuenta/estilo" element={<CuentaEstiloPage />} />
            <Route path="cuenta/logo" element={<CuentaLogoPage />} />
            <Route path="cuenta/banner-temporada" element={<CuentaBannerTemporadaPage />} />
            <Route path="cuenta/carritos-abandonados" element={<CarritosAbandonadosPage />} />
            <Route path="pagos-pasarela" element={<PagosPasarelaPage />} />
            <Route path="pagos-pasarela/onepay" element={<OnepayPasarelaResumenPage />} />
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
            path="/superadmin/tienda/:tenantId/onepay"
            element={
              <RequireMcAuth>
                <SuperAdminTenantOnepayPage />
              </RequireMcAuth>
            }
          />
          <Route path="/c/:slug" element={<PublicCatalogLayout />}>
            <Route index element={<PublicCatalogListPage />} />
            <Route path="p/:productId" element={<PublicProductDetailPage />} />
            <Route path="checkout/pago-validando" element={<PublicCheckoutPagoValidandoPage />} />
            <Route path="checkout/exito" element={<PublicCheckoutSuccessPage />} />
            <Route path="checkout" element={<PublicCheckoutPage />} />
            <Route path="seguimiento" element={<PublicOrderTrackingPage />} />
            <Route path="politicas" element={<PublicPoliciesPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </McAuthProvider>
  )
}
