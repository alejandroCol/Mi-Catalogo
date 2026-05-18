import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { SellerOnboardingOverlay, useAssignSellerOnboardingTabAnchors } from '@/app/SellerOnboardingOverlay'
import { clearPendingSellerOnboarding, shouldShowSellerOnboarding } from '@/lib/onboardingStorage'
import { tenantThemeCssVars } from '@/lib/catalogTheme'
import { IconCart, IconCube, IconHome, IconSliders } from '@/icons/McIcons'

export function AppShell() {
  const { tenant } = useMcAuth()
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const { tabAnchorsRef, tabAnchorAssignRefs } = useAssignSellerOnboardingTabAnchors()

  useEffect(() => {
    if (!tenant?.id) return
    if (shouldShowSellerOnboarding(tenant.id)) {
      setOnboardingOpen(true)
    }
  }, [tenant?.id])

  function closeOnboarding() {
    clearPendingSellerOnboarding()
    setOnboardingOpen(false)
  }

  return (
    <div
      className="min-h-svh"
      style={{
        ...tenantThemeCssVars(tenant),
        backgroundColor: 'var(--cat-bg)',
        color: 'var(--cat-text)',
      }}
    >
      <SellerOnboardingOverlay
        open={onboardingOpen}
        onDismiss={closeOnboarding}
        tabAnchorsRef={tabAnchorsRef}
      />
      <Outlet />
      <nav className="mc-tabbar mc-app-desktop-tabbar flex justify-around border-[var(--cat-muted)]/40">
        <span ref={tabAnchorAssignRefs[0]} className="flex min-h-[48px] min-w-0 flex-1 justify-center">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `mc-tab-link w-full max-w-[5.5rem] transition duration-200 ease-in-out ${isActive ? 'mc-tab-link-active' : ''}`
            }
          >
            <IconHome size={22} />
            <span>Inicio</span>
          </NavLink>
        </span>
        <span ref={tabAnchorAssignRefs[1]} className="flex min-h-[48px] min-w-0 flex-1 justify-center">
          <NavLink
            to="/app/inventario"
            className={({ isActive }) =>
              `mc-tab-link w-full max-w-[5.5rem] transition duration-200 ease-in-out ${isActive ? 'mc-tab-link-active' : ''}`
            }
          >
            <IconCube size={22} />
            <span>Productos</span>
          </NavLink>
        </span>
        <span ref={tabAnchorAssignRefs[2]} className="flex min-h-[48px] min-w-0 flex-1 justify-center">
          <NavLink
            to="/app/pedidos"
            className={({ isActive }) =>
              `mc-tab-link w-full max-w-[5.5rem] transition duration-200 ease-in-out ${isActive ? 'mc-tab-link-active' : ''}`
            }
          >
            <IconCart size={22} />
            <span>Ventas</span>
          </NavLink>
        </span>
        <span ref={tabAnchorAssignRefs[3]} className="flex min-h-[48px] min-w-0 flex-1 justify-center">
          <NavLink
            to="/app/cuenta"
            className={({ isActive }) =>
              `mc-tab-link w-full max-w-[5.5rem] transition duration-200 ease-in-out ${isActive ? 'mc-tab-link-active' : ''}`
            }
          >
            <IconSliders size={22} />
            <span>Cuenta</span>
          </NavLink>
        </span>
      </nav>
    </div>
  )
}
