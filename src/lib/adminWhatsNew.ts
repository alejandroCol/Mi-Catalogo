import { PERSONALIZAR_SUBPAGE_NAV, type ConfigSubpageNavState } from '@/app/configuraciones/configSubpageNav'
import { hasLiveFeatureAccess } from '@/lib/billingAccess'
import type { McTenant } from '@/types/mc'

/**
 * Versión del release de novedades. Subila al publicar funciones nuevas:
 * el puntito animado vuelve a aparecer; el acceso «Lo nuevo» sigue visible.
 */
export const ADMIN_WHATS_NEW_VERSION = '2026-08-24'

export type AdminWhatsNewAccent = 'gold' | 'neutral' | 'dark'

export type AdminWhatsNewItem = {
  id: string
  title: string
  description: string
  to: string
  linkState?: ConfigSubpageNavState
  tag?: string
  accent?: AdminWhatsNewAccent
  /** Versión en la que se agregó (opcional, para badge en la grilla). */
  sinceVersion?: string
  masterOnly?: boolean
}

export const ADMIN_WHATS_NEW_ITEMS: AdminWhatsNewItem[] = [
  {
    id: 'landing-interactiva',
    title: 'Modo interactivo',
    description: 'Carrusel 3D de productos al entrar al catálogo, en lugar del banner.',
    to: '/app/cuenta/banner-temporada',
    linkState: PERSONALIZAR_SUBPAGE_NAV,
    tag: 'Expert',
    accent: 'dark',
    sinceVersion: '2026-08-24',
  },
  {
    id: 'combos',
    title: 'Combos y packs',
    description: 'Precio especial, componentes y stock automático.',
    to: '/app/inventario',
    tag: 'Inventario',
    accent: 'gold',
    sinceVersion: '2026-08-21',
  },
  {
    id: 'proveedores',
    title: 'Proveedores',
    description: 'Marketplace, bodegas e importación de catálogo.',
    to: '/app/proveedores',
    tag: 'Operación',
    accent: 'neutral',
    sinceVersion: '2026-08-21',
  },
  {
    id: 'carritos-abandonados',
    title: 'Carritos abandonados',
    description: 'Recuperá ventas que quedaron a medias.',
    to: '/app/cuenta/carritos-abandonados',
    tag: 'Ventas',
    accent: 'neutral',
    sinceVersion: '2026-08-21',
  },
  {
    id: 'reportes-catalogo',
    title: 'Reportes',
    description: 'Exportá ventas y rendimiento del catálogo.',
    to: '/app/reportes',
    tag: 'Ventas',
    accent: 'gold',
    sinceVersion: '2026-08-21',
  },
  {
    id: 'resenas-producto',
    title: 'Reseñas',
    description: 'Opiniones verificadas en cada producto.',
    to: '/app/cuenta/resenas',
    tag: 'Catálogo',
    accent: 'neutral',
    sinceVersion: '2026-08-21',
  },
  {
    id: 'envio-estimador-carrito',
    title: 'Envío en el carrito',
    description: 'El cliente calcula el costo antes de pagar.',
    to: '/app/cuenta/envio',
    tag: 'Checkout',
    accent: 'gold',
    sinceVersion: '2026-08-21',
  },
  {
    id: 'senal-confianza-checkout',
    title: 'Confianza en checkout',
    description: 'Pago seguro, contraentrega y políticas visibles.',
    to: '/app/cuenta/checkout-ventas',
    tag: 'Checkout',
    accent: 'neutral',
    sinceVersion: '2026-08-21',
  },
  {
    id: 'estadisticas-visita',
    title: 'Visitas al catálogo',
    description: 'Cuánta gente entró hoy y en el periodo.',
    to: '/app/estadisticas',
    tag: 'Ventas',
    accent: 'neutral',
    sinceVersion: '2026-08-21',
  },
  {
    id: 'live-shopping',
    title: 'Live shopping',
    description: 'Transmití y vendé en vivo desde el estudio.',
    to: '/app/live',
    tag: 'Master',
    accent: 'dark',
    sinceVersion: '2026-08-21',
    masterOnly: true,
  },
  {
    id: 'showroom-drop-room',
    title: 'Drop Room + Pasillo',
    description: 'Colección con cuenta regresiva y recorrido inmersivo.',
    to: '/app/cuenta/showroom',
    tag: 'Expert',
    accent: 'dark',
    sinceVersion: '2026-08-21',
  },
  {
    id: 'addi-cuotas',
    title: 'Addi · Cuotas',
    description: 'Financiación en checkout con tus credenciales.',
    to: '/app/pagos-addi',
    tag: 'Master',
    accent: 'gold',
    sinceVersion: '2026-08-21',
    masterOnly: true,
  },
]

export function adminWhatsNewForTenant(tenant: McTenant | null | undefined): AdminWhatsNewItem[] {
  const master = hasLiveFeatureAccess(tenant)
  return ADMIN_WHATS_NEW_ITEMS.filter((item) => !item.masterOnly || master)
}

export function adminWhatsNewGeneral(tenant: McTenant | null | undefined): AdminWhatsNewItem[] {
  return adminWhatsNewForTenant(tenant).filter((item) => !item.masterOnly)
}

export function adminWhatsNewMasterOnly(tenant: McTenant | null | undefined): AdminWhatsNewItem[] {
  if (!hasLiveFeatureAccess(tenant)) return []
  return ADMIN_WHATS_NEW_ITEMS.filter((item) => item.masterOnly === true)
}

export function isWhatsNewInCurrentRelease(item: AdminWhatsNewItem): boolean {
  return (item.sinceVersion ?? ADMIN_WHATS_NEW_VERSION) === ADMIN_WHATS_NEW_VERSION
}

/** Tamaño visual en la grilla (estilo bento landing). */
export function whatsNewGridSize(index: number, total: number): 'large' | 'medium' | 'small' {
  if (index === 0) return 'large'
  if (index === 1 || index === 2) return 'medium'
  if (total <= 4 && index === total - 1) return 'medium'
  return 'small'
}
