import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackMcScreenView } from '@/lib/mcAnalytics'
import { parseStoreSlugFromHostname, resolveAppSurface } from '@/lib/storePublicUrl'

function resolveStoreScreenName(pathname: string): string | null {
  if (pathname === '/') return 'public_catalog'
  if (pathname.startsWith('/p/')) return 'public_product'
  if (pathname.startsWith('/checkout/exito')) return 'public_checkout_success'
  if (pathname.startsWith('/checkout')) return 'public_checkout'
  if (pathname.startsWith('/seguimiento')) return 'public_seguimiento'
  if (pathname.startsWith('/politicas')) return 'public_politicas'
  return 'public_catalog'
}

function resolveScreenName(pathname: string): string | null {
  const onStoreHost =
    typeof window !== 'undefined' &&
    resolveAppSurface() === 'store' &&
    Boolean(parseStoreSlugFromHostname(window.location.hostname))

  if (onStoreHost) {
    return resolveStoreScreenName(pathname)
  }

  if (pathname === '/') return 'landing'
  if (pathname === '/login') return 'login'
  if (pathname === '/registro') return 'registro'
  if (pathname === '/verificar-email') return 'verificar_email'
  if (pathname === '/app') return 'seller_dashboard'
  if (pathname === '/app/inventario') return 'seller_inventario'
  if (pathname === '/app/pedidos') return 'seller_pedidos'
  if (pathname === '/app/plan') return 'seller_plan'
  if (pathname === '/app/estadisticas') return 'seller_estadisticas'
  if (pathname === '/app/pagos-pasarela') return 'seller_pagos_pasarela'
  if (pathname === '/app/mi-saldo') return 'seller_mi_saldo'
  if (pathname.startsWith('/app/cuenta')) return 'seller_cuenta'
  if (pathname === '/vendedor') return 'sales_rep_dashboard'
  if (pathname === '/vendedor/pitch') return 'sales_rep_pitch'
  if (pathname === '/vendedor/capacitacion') return 'sales_rep_capacitacion'
  if (pathname.startsWith('/vendedor/')) return 'sales_rep_section'
  if (pathname === '/superadmin') return 'superadmin_home'
  if (pathname === '/superadmin/analytics') return 'superadmin_analytics'
  if (pathname === '/superadmin/vendedores') return 'superadmin_vendedores'
  if (pathname.startsWith('/superadmin/')) return 'superadmin_section'
  const catalogMatch = pathname.match(/^\/c\/([^/]+)(\/.*)?$/)
  if (catalogMatch) {
    const rest = catalogMatch[2] ?? ''
    if (!rest || rest === '/') return 'public_catalog'
    if (rest.startsWith('/p/')) return 'public_product'
    if (rest.startsWith('/checkout/exito')) return 'public_checkout_success'
    if (rest.startsWith('/checkout')) return 'public_checkout'
    if (rest.startsWith('/seguimiento')) return 'public_seguimiento'
    if (rest.startsWith('/politicas')) return 'public_politicas'
    return 'public_catalog'
  }
  return null
}

/** Envía screen_view a Firebase Analytics en cada cambio de ruta y restablece scroll. */
export function McRouteAnalyticsTracker() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    const screen = resolveScreenName(pathname)
    if (!screen) return
    void trackMcScreenView(screen, pathname)
  }, [pathname])

  return null
}
