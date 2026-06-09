import { NavLink, Outlet } from 'react-router-dom'
import { tenantThemeCssVars } from '@/lib/catalogTheme'
import { IconCart, IconCube, IconHome, IconSliders } from '@/icons/McIcons'
import { McOutletBoundary } from '@/components/McOutletBoundary'
import { DemoAdminBanner } from '@/vendedor/demo-admin/DemoAdminBanner'
import { useDemoAdmin } from '@/vendedor/demo-admin/DemoAdminContext'
import { demoAdminPath } from '@/vendedor/demo-admin/demoAdminPaths'

export function DemoAdminShell() {
  const { tenant, demo } = useDemoAdmin()
  const base = demoAdminPath(demo.id)

  return (
    <div
      className="min-h-svh"
      style={{
        ...tenantThemeCssVars(tenant),
        backgroundColor: 'var(--cat-bg)',
        color: 'var(--cat-text)',
      }}
    >
      <DemoAdminBanner />
      <McOutletBoundary>
        <Outlet />
      </McOutletBoundary>
      <nav className="mc-tabbar mc-app-desktop-tabbar flex justify-around border-[var(--cat-muted)]/40">
        <span className="flex min-h-[48px] min-w-0 flex-1 justify-center">
          <NavLink
            to={base}
            end
            className={({ isActive }) =>
              `mc-tab-link w-full max-w-[5.5rem] transition duration-200 ease-in-out ${isActive ? 'mc-tab-link-active' : ''}`
            }
          >
            <IconHome size={22} />
            <span>Inicio</span>
          </NavLink>
        </span>
        <span className="flex min-h-[48px] min-w-0 flex-1 justify-center">
          <NavLink
            to={demoAdminPath(demo.id, 'inventario')}
            className={({ isActive }) =>
              `mc-tab-link w-full max-w-[5.5rem] transition duration-200 ease-in-out ${isActive ? 'mc-tab-link-active' : ''}`
            }
          >
            <IconCube size={22} />
            <span>Productos</span>
          </NavLink>
        </span>
        <span className="flex min-h-[48px] min-w-0 flex-1 justify-center">
          <NavLink
            to={demoAdminPath(demo.id, 'pedidos')}
            className={({ isActive }) =>
              `mc-tab-link w-full max-w-[5.5rem] transition duration-200 ease-in-out ${isActive ? 'mc-tab-link-active' : ''}`
            }
          >
            <IconCart size={22} />
            <span>Ventas</span>
          </NavLink>
        </span>
        <span className="flex min-h-[48px] min-w-0 flex-1 justify-center">
          <NavLink
            to={demoAdminPath(demo.id, 'cuenta')}
            className={({ isActive }) =>
              `mc-tab-link w-full max-w-[5.5rem] transition duration-200 ease-in-out ${isActive ? 'mc-tab-link-active' : ''}`
            }
          >
            <IconSliders size={22} />
            <span className="text-[10px] leading-tight sm:text-[11px]">Configuraciones</span>
          </NavLink>
        </span>
      </nav>
    </div>
  )
}
