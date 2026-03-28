import { NavLink, Outlet } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { tenantThemeCssVars } from '@/lib/catalogTheme'
import { IconCart, IconCube, IconGear, IconHome } from '@/icons/McIcons'

export function AppShell() {
  const { tenant } = useMcAuth()

  return (
    <div
      className="min-h-svh"
      style={{
        ...tenantThemeCssVars(tenant),
        backgroundColor: 'var(--cat-bg)',
        color: 'var(--cat-text)',
      }}
    >
      <Outlet />
      <nav className="mc-tabbar mc-app-desktop-tabbar flex justify-around border-[var(--cat-muted)]/40">
        <NavLink
          to="/app"
          end
          className={({ isActive }) => `mc-tab-link ${isActive ? 'mc-tab-link-active' : ''}`}
        >
          <IconHome size={22} />
          <span>Inicio</span>
        </NavLink>
        <NavLink
          to="/app/inventario"
          className={({ isActive }) => `mc-tab-link ${isActive ? 'mc-tab-link-active' : ''}`}
        >
          <IconCube size={22} />
          <span>Stock</span>
        </NavLink>
        <NavLink
          to="/app/pedidos"
          className={({ isActive }) => `mc-tab-link ${isActive ? 'mc-tab-link-active' : ''}`}
        >
          <IconCart size={22} />
          <span>Ventas</span>
        </NavLink>
        <NavLink
          to="/app/cuenta"
          className={({ isActive }) => `mc-tab-link ${isActive ? 'mc-tab-link-active' : ''}`}
        >
          <IconGear size={22} />
          <span>Cuenta</span>
        </NavLink>
      </nav>
    </div>
  )
}
