import { tenantHasPoliticas } from '@/lib/tenantPoliticas'
import type { McTenant } from '@/types/mc'

export type CatalogHeaderSectionId = 'inicio' | 'tienda' | 'pedidos' | 'contacto'

export type CatalogHeaderSectionItem = {
  id: CatalogHeaderSectionId
  label: string
  to: string
  active: boolean
}

export function isCatalogHomePath(pathname: string, pathBase: string): boolean {
  return pathname === pathBase || pathname === '/' || pathname === `${pathBase}/`
}

/** Misma lista para el nav inline (desktop) y el menú (mobile). */
export function resolveLogoCenterSectionItems(input: {
  tenant: McTenant | null | undefined
  slug: string | null | undefined
  pathBase: string
  pathname: string
  to: (suffix: string) => string
}): CatalogHeaderSectionItem[] {
  const { tenant, slug, pathBase, pathname, to } = input
  const home = pathBase || '/'
  const isHome = isCatalogHomePath(pathname, pathBase)
  const items: CatalogHeaderSectionItem[] = [
    { id: 'inicio', label: 'Inicio', to: home, active: isHome },
    { id: 'tienda', label: 'Tienda', to: home, active: isHome },
  ]

  if (slug) {
    const pedidosTo = to('/seguimiento')
    items.push({
      id: 'pedidos',
      label: 'Pedidos',
      to: pedidosTo,
      active: pathname === pedidosTo || pathname === to('/mis-pedidos'),
    })
  }

  if (slug && tenant && tenantHasPoliticas(tenant)) {
    const contactoTo = to('/politicas')
    items.push({
      id: 'contacto',
      label: 'Contacto',
      to: contactoTo,
      active: pathname === contactoTo,
    })
  }

  return items
}
