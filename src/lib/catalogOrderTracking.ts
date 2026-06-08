import type { McOrdenCatalogoEstado } from '@/types/mc'
import { buildStorePublicPath } from '@/lib/storePublicUrl'

/** Pasos visibles para el comprador (línea de tiempo). */
export const CATALOG_TRACKING_STEPS = [
  {
    estado: 'pagado' as const,
    label: 'Compra realizada',
    description: 'Tu pago fue confirmado. La tienda ya recibió el pedido.',
  },
  {
    estado: 'en_preparacion' as const,
    label: 'En preparación',
    description: 'Estamos armando tu pedido con cuidado.',
  },
  {
    estado: 'enviado' as const,
    label: 'Despachado',
    description: 'Tu pedido salió en camino. Revisá la guía de rastreo.',
  },
  {
    estado: 'entregado' as const,
    label: 'Entregado',
    description: '¡Listo! Tu pedido fue entregado.',
  },
] as const

export type CatalogTrackingStepEstado = (typeof CATALOG_TRACKING_STEPS)[number]['estado']

/** Estados que el admin puede elegir en Ventas (flujo de seguimiento). */
export const ADMIN_SEGUIMIENTO_ESTADOS: { value: McOrdenCatalogoEstado; label: string }[] = [
  { value: 'pagado', label: 'Compra realizada' },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'enviado', label: 'Despachado' },
  { value: 'entregado', label: 'Entregado' },
]

export function buildNumeroReferencia(orderId: string): string {
  const tail = orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()
  return `MC-${tail.length >= 4 ? tail : orderId.slice(0, 8).toUpperCase()}`
}

export function normalizeOrderIdInput(raw: string): string {
  return raw.trim()
}

/** Índice del paso activo en la línea de tiempo (0–3). */
export function catalogTrackingStepIndex(estado: McOrdenCatalogoEstado | undefined): number {
  switch (estado) {
    case 'pagado':
      return 0
    case 'en_preparacion':
    case 'listo_envio':
      return 1
    case 'enviado':
      return 2
    case 'entregado':
      return 3
    default:
      return -1
  }
}

export function catalogTrackingIncludesGuide(estado: McOrdenCatalogoEstado | undefined): boolean {
  return estado === 'enviado' || estado === 'entregado'
}

export function publicCatalogTrackingPath(slug: string, orderId: string): string {
  const q = new URLSearchParams({ o: normalizeOrderIdInput(orderId) })
  return buildStorePublicPath(slug, `/seguimiento?${q.toString()}`)
}

export function publicCatalogSuccessPath(slug: string, orderId: string): string {
  const q = new URLSearchParams({ o: normalizeOrderIdInput(orderId) })
  return buildStorePublicPath(slug, `/checkout/exito?${q.toString()}`)
}

export type CatalogOrderTrackingPublic = {
  orderId: string
  numeroReferencia?: string
  estado: McOrdenCatalogoEstado
  totalCop: number
  createdAt: number
  updatedAt: number
  nombreTienda: string
  lineas: { nombre: string; cantidad: number; precioUnitarioCop: number }[]
  trackingImageUrl?: string
  trackingNumber?: string
  envioCiudad?: string
  seguimientoCompraAt?: number
  seguimientoPreparacionAt?: number
  seguimientoDespachoAt?: number
  seguimientoEntregaAt?: number
}
