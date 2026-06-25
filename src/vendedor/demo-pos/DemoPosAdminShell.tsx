import { Link, NavLink, Outlet } from 'react-router-dom'
import { McOutletBoundary } from '@/components/McOutletBoundary'
import { PosIcon } from '@/pos/components/PosIcon'
import { DemoPosBanner } from '@/vendedor/demo-pos/DemoPosBanner'
import { useDemoPos } from '@/vendedor/demo-pos/DemoPosContext'
import { demoPosAdminPath } from '@/vendedor/demo-pos/demoPosPaths'

export function DemoPosAdminShell() {
  const { demo } = useDemoPos()
  const base = demoPosAdminPath(demo.id)

  const nav = [
    { to: base, label: 'Inicio', icon: 'home' as const, end: true },
    { to: demoPosAdminPath(demo.id, 'ventas'), label: 'Ventas', icon: 'ticket' as const },
    { to: demoPosAdminPath(demo.id, 'reportes'), label: 'Reportes', icon: 'reportes' as const },
    { to: demoPosAdminPath(demo.id, 'inventario'), label: 'Inventario', icon: 'inventario' as const },
  ]

  return (
    <div className="mc-pos-app min-h-svh bg-[#f6f5f2]">
      <DemoPosBanner modo="admin" />
      <nav className="border-b border-neutral-200/70 bg-white px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium no-underline transition ${
                  isActive
                    ? 'bg-[#1c1b1f] text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`
              }
            >
              <PosIcon name={item.icon} size={16} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <McOutletBoundary>
        <Outlet />
      </McOutletBoundary>
      <div className="border-t border-neutral-200/60 bg-white px-4 py-3 text-center sm:px-6">
        <Link
          to="/vendedor"
          className="text-sm font-medium text-neutral-600 no-underline transition hover:text-neutral-900"
        >
          ← Volver al panel vendedor
        </Link>
      </div>
    </div>
  )
}
