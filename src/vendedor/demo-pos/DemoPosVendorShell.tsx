import { NavLink, Outlet } from 'react-router-dom'
import { McOutletBoundary } from '@/components/McOutletBoundary'
import { PosIcon } from '@/pos/components/PosIcon'
import { DemoPosBanner } from '@/vendedor/demo-pos/DemoPosBanner'
import { useDemoPos } from '@/vendedor/demo-pos/DemoPosContext'
import { demoPosVendorPath } from '@/vendedor/demo-pos/demoPosPaths'

export function DemoPosVendorShell() {
  const { demo } = useDemoPos()
  const base = demoPosVendorPath(demo.id)

  return (
    <div className="mc-pos-app min-h-svh bg-[#f6f5f2]">
      <DemoPosBanner modo="vendedora" />
      <nav className="border-b border-neutral-200/70 bg-white px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-3xl gap-1">
          <NavLink
            to={base}
            end
            className={({ isActive }) =>
              `inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium no-underline transition ${
                isActive ? 'bg-[#1c1b1f] text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`
            }
          >
            <PosIcon name="ventas" size={16} />
            Vender
          </NavLink>
          <NavLink
            to={demoPosVendorPath(demo.id, 'ventas')}
            className={({ isActive }) =>
              `inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium no-underline transition ${
                isActive ? 'bg-[#1c1b1f] text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`
            }
          >
            <PosIcon name="ticket" size={16} />
            Mis ventas
          </NavLink>
        </div>
      </nav>
      <McOutletBoundary>
        <Outlet />
      </McOutletBoundary>
    </div>
  )
}
