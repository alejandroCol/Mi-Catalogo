import { useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { Outlet } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { StoreImpersonationBanner } from '@/auth/StoreImpersonationBanner'
import { getAuthApp } from '@/lib/firebase'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosHardware } from '@/pos/hooks/usePosHardware'
import { PosBrandLogo } from '@/pos/components/PosBrandLogo'
import { PosBridgeStatus } from '@/pos/components/PosBridgeStatus'
import { PosBridgeDownloadButton } from '@/pos/components/PosBridgeDownloadButton'
import { PosNavPills } from '@/pos/components/PosNavPills'
import { POS_VENDOR_NAV } from '@/pos/lib/posNavConfig'

export function PosVendorShell() {
  const { profile, tenant } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const sedeId = profile?.posSedeId
  const { sedes } = usePosSedes(tenantId)
  const sede = sedes.find((s) => s.id === sedeId) ?? sedes.find((s) => s.activa !== false) ?? sedes[0]
  usePosHardware(sede?.pos)

  useEffect(() => {
    document.title = 'Mi Catálogo POS'
  }, [])

  return (
    <div className="mc-landing mc-pos mc-pos-vendor">
      <StoreImpersonationBanner />
      <div className="mc-pos-shell-pattern" aria-hidden />
      <header className="mc-pos-header">
        <div className="mc-pos-header__inner mc-landing-container">
          <div className="mc-pos-header__brand">
            <PosBrandLogo compact />
            {sede && <span className="mc-pos-header__sede">{sede.nombre}</span>}
          </div>
          <div className="mc-pos-header__actions">
            <PosBridgeStatus config={sede?.pos} />
            <PosBridgeDownloadButton compact />
            <span className="mc-pos-header__user">{profile?.displayName}</span>
            <button
              type="button"
              className="mc-landing-btn-ghost text-sm"
              onClick={() => signOut(getAuthApp())}
            >
              Salir
            </button>
          </div>
        </div>
        <PosNavPills items={POS_VENDOR_NAV} ariaLabel="Módulos POS vendedor" />
      </header>
      <main className="mc-pos-main mc-landing-container">
        <Outlet />
      </main>
    </div>
  )
}
