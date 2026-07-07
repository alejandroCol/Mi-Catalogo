import { useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { Link, Outlet } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { StoreImpersonationBanner } from '@/auth/StoreImpersonationBanner'
import { McOutletBoundary } from '@/components/McOutletBoundary'
import { McSaveSuccessProvider } from '@/components/McSaveSuccessModal'
import { getAuthApp } from '@/lib/firebase'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosHardware } from '@/pos/hooks/usePosHardware'
import { PosBrandLogo } from '@/pos/components/PosBrandLogo'
import { PosBridgeDownloadButton } from '@/pos/components/PosBridgeDownloadButton'
import { PosNavPills } from '@/pos/components/PosNavPills'
import { POS_ADMIN_NAV } from '@/pos/lib/posNavConfig'

export function PosAdminShell() {
  const { profile, tenant } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const { sedes } = usePosSedes(tenantId)
  usePosHardware(sedes[0]?.pos)

  useEffect(() => {
    document.title = 'Mi Catálogo POS — Admin'
  }, [])

  return (
    <McSaveSuccessProvider>
      <div className="mc-landing mc-pos mc-pos-admin">
      <StoreImpersonationBanner />
      <div className="mc-pos-shell-pattern" aria-hidden />
      <header className="mc-pos-header">
        <div className="mc-pos-header__inner mc-landing-container">
          <div className="mc-pos-header__brand">
            <PosBrandLogo to="/pos/admin" />
            <span className="mc-pos-header__badge">Admin</span>
          </div>
          <div className="mc-pos-header__actions">
            <PosBridgeDownloadButton compact config={sedes[0]?.pos} />
            <Link to="/app" className="mc-landing-btn-ghost text-sm no-underline">
              Volver a tienda
            </Link>
            <button
              type="button"
              className="mc-landing-btn-ghost text-sm"
              onClick={() => signOut(getAuthApp())}
            >
              Salir
            </button>
          </div>
        </div>
        <PosNavPills items={POS_ADMIN_NAV} ariaLabel="Módulos POS admin" />
      </header>
      <main className="mc-pos-main mc-landing-container">
        <McOutletBoundary>
          <Outlet />
        </McOutletBoundary>
      </main>
      </div>
    </McSaveSuccessProvider>
  )
}
