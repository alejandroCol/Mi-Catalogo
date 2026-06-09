import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useMcAuth } from '@/auth/McAuthContext'
import { getAuthApp } from '@/lib/firebase'
import { LandingBrandLogo } from '@/landing/components/LandingBrandLogo'
import { IconChevronLeft } from '@/icons/McIcons'
import { McOutletBoundary } from '@/components/McOutletBoundary'

export function VendedorShell() {
  const { profile } = useMcAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const isPitch = pathname.endsWith('/pitch')
  const isDashboard = pathname === '/vendedor' || pathname === '/vendedor/'

  async function onLogout() {
    await signOut(getAuthApp())
    nav('/login', { replace: true })
  }

  if (isPitch) {
    return (
      <div className="mc-landing mc-vendedor mc-vendedor--pitch">
        <div className="mc-vendedor__bg" aria-hidden />
        <McOutletBoundary>
          <Outlet />
        </McOutletBoundary>
      </div>
    )
  }

  return (
    <div className="mc-landing mc-vendedor min-h-svh">
      <div className="mc-vendedor__bg" aria-hidden />
      <header className="mc-vendedor-nav sticky top-0 z-20">
        <div className="mc-landing-container mc-vendedor-nav__inner">
          <div className="flex min-w-0 items-center gap-4">
            {!isDashboard ? (
              <Link to="/vendedor" className="mc-vendedor-nav__back">
                <IconChevronLeft size={18} />
                <span className="hidden sm:inline">Panel</span>
              </Link>
            ) : (
              <LandingBrandLogo />
            )}
          </div>
          <div className="mc-vendedor-nav__meta">
            {profile?.displayName ? (
              <>
                <p className="mc-vendedor-nav__name">{profile.displayName}</p>
                <p className="mc-vendedor-nav__role">Equipo de ventas</p>
              </>
            ) : (
              <p className="mc-vendedor-nav__name">Panel vendedor</p>
            )}
          </div>
          <button
            type="button"
            className="mc-landing-btn-secondary shrink-0 px-4 py-2.5 text-sm"
            onClick={() => void onLogout()}
          >
            Salir
          </button>
        </div>
      </header>
      <main className="mc-landing-container mc-vendedor-main">
        <McOutletBoundary>
          <Outlet />
        </McOutletBoundary>
      </main>
    </div>
  )
}
