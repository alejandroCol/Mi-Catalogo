import { Navigate, Route, Routes } from 'react-router-dom'
import { McAuthProvider } from '@/auth/McAuthContext'
import { LoginPage } from '@/auth/LoginPage'
import { RegisterPage } from '@/auth/RegisterPage'
import { AppShell } from '@/app/AppShell'
import { DashboardPage } from '@/app/DashboardPage'
import { InventarioPage } from '@/app/InventarioPage'
import { PedidosPage } from '@/app/PedidosPage'
import { CuentaPage } from '@/app/CuentaPage'
import { RequireMcAuth } from '@/app/RequireMcAuth'
import { PublicCatalogLayout } from '@/public/PublicCatalogLayout'
import { PublicCatalogListPage } from '@/public/PublicCatalogListPage'
import { PublicProductDetailPage } from '@/public/PublicProductDetailPage'
import { PublicCheckoutPage } from '@/public/PublicCheckoutPage'
import { PlanUpgradePage } from '@/app/PlanUpgradePage'
import { SuperAdminPage } from '@/superadmin/SuperAdminPage'

export function App() {
  return (
    <McAuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
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
        </Route>
        <Route
          path="/superadmin"
          element={
            <RequireMcAuth>
              <SuperAdminPage />
            </RequireMcAuth>
          }
        />
        <Route path="/c/:slug" element={<PublicCatalogLayout />}>
          <Route index element={<PublicCatalogListPage />} />
          <Route path="p/:productId" element={<PublicProductDetailPage />} />
          <Route path="checkout" element={<PublicCheckoutPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </McAuthProvider>
  )
}
