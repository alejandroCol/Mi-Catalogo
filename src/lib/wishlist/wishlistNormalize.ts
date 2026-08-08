import type { McWishlist, McWishlistItem, McWishlistEstado } from '@/types/mc'
import {
  WISHLIST_CIUDAD_MAX,
  WISHLIST_DEPTO_MAX,
  WISHLIST_DIRECCION_MAX,
  WISHLIST_MAX_ITEMS,
  WISHLIST_MAX_QTY_PER_ITEM,
  WISHLIST_MENSAJE_MAX,
  WISHLIST_NOMBRE_MAX,
  WISHLIST_REFERENCIA_MAX,
  WISHLIST_TELEFONO_MAX,
  WISHLIST_TITULO_MAX,
} from '@/lib/wishlist/wishlistConstants'

export type WishlistUpsertInput = {
  titulo?: string
  mensaje?: string
  creadorNombre?: string
  destinatarioNombre?: string
  destinatarioTelefono?: string
  envioDepartamento?: string
  envioCiudad?: string
  envioDireccion?: string
  envioReferencia?: string
  items?: unknown
  estado?: string
}

export type WishlistNormalizeOk = {
  ok: true
  value: Omit<McWishlist, 'createdAt' | 'updatedAt' | 'sessionToken'> & {
    items: McWishlistItem[]
  }
}

export type WishlistNormalizeErr = { ok: false; message: string }

function asTrimmedString(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

function itemKey(item: Pick<McWishlistItem, 'productId' | 'varianteId' | 'tallaId'>): string {
  return `${item.productId}::${item.varianteId || ''}::${item.tallaId || ''}`
}

/** Normaliza ítems entrantes (dedupe por producto+variante+talla). */
export function normalizeWishlistItems(raw: unknown): { items: McWishlistItem[]; error?: string } {
  if (!Array.isArray(raw)) return { items: [], error: 'La lista de regalos es inválida.' }
  if (raw.length === 0) return { items: [], error: 'Agregá al menos un producto a la lista.' }
  if (raw.length > WISHLIST_MAX_ITEMS) {
    return { items: [], error: `Máximo ${WISHLIST_MAX_ITEMS} productos por lista.` }
  }

  const byKey = new Map<string, McWishlistItem>()
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const productId = asTrimmedString(r.productId, 120)
    if (!productId) continue
    const varianteId = asTrimmedString(r.varianteId, 80) || undefined
    const tallaId = asTrimmedString(r.tallaId, 80) || undefined
    const titulo = asTrimmedString(r.titulo, 160) || 'Producto'
    const referencia = asTrimmedString(r.referencia, 80) || undefined
    const subtitulo = asTrimmedString(r.subtitulo, 160) || undefined
    const imageUrl = asTrimmedString(r.imageUrl, 800) || undefined
    const precioRaw = r.precioUnitarioCop
    const precioUnitarioCop =
      typeof precioRaw === 'number' && Number.isFinite(precioRaw) && precioRaw >= 0
        ? Math.round(precioRaw)
        : undefined
    let cantidadDeseada = typeof r.cantidadDeseada === 'number' ? Math.floor(r.cantidadDeseada) : 1
    if (!Number.isFinite(cantidadDeseada) || cantidadDeseada < 1) cantidadDeseada = 1
    cantidadDeseada = Math.min(WISHLIST_MAX_QTY_PER_ITEM, cantidadDeseada)

    let compradoCantidad =
      typeof r.compradoCantidad === 'number' ? Math.floor(r.compradoCantidad) : 0
    if (!Number.isFinite(compradoCantidad) || compradoCantidad < 0) compradoCantidad = 0
    compradoCantidad = Math.min(cantidadDeseada, compradoCantidad)

    const next: McWishlistItem = {
      productId,
      titulo,
      cantidadDeseada,
      ...(varianteId ? { varianteId } : {}),
      ...(tallaId ? { tallaId } : {}),
      ...(referencia ? { referencia } : {}),
      ...(subtitulo ? { subtitulo } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(precioUnitarioCop != null ? { precioUnitarioCop } : {}),
      ...(compradoCantidad > 0 ? { compradoCantidad } : {}),
    }
    const key = itemKey(next)
    const prev = byKey.get(key)
    if (prev) {
      byKey.set(key, {
        ...prev,
        cantidadDeseada: Math.min(
          WISHLIST_MAX_QTY_PER_ITEM,
          prev.cantidadDeseada + next.cantidadDeseada,
        ),
        compradoCantidad: Math.min(
          WISHLIST_MAX_QTY_PER_ITEM,
          (prev.compradoCantidad ?? 0) + (next.compradoCantidad ?? 0),
        ),
      })
    } else {
      byKey.set(key, next)
    }
  }

  const items = [...byKey.values()]
  if (items.length === 0) return { items: [], error: 'Agregá al menos un producto a la lista.' }
  return { items }
}

export function normalizeWishlistUpsert(input: WishlistUpsertInput): WishlistNormalizeOk | WishlistNormalizeErr {
  const titulo = asTrimmedString(input.titulo, WISHLIST_TITULO_MAX)
  const mensaje = asTrimmedString(input.mensaje, WISHLIST_MENSAJE_MAX)
  const creadorNombre = asTrimmedString(input.creadorNombre, WISHLIST_NOMBRE_MAX)
  const destinatarioNombre =
    asTrimmedString(input.destinatarioNombre, WISHLIST_NOMBRE_MAX) || creadorNombre
  const destinatarioTelefono = asTrimmedString(input.destinatarioTelefono, WISHLIST_TELEFONO_MAX)
  const envioDepartamento = asTrimmedString(input.envioDepartamento, WISHLIST_DEPTO_MAX)
  const envioCiudad = asTrimmedString(input.envioCiudad, WISHLIST_CIUDAD_MAX)
  const envioDireccion = asTrimmedString(input.envioDireccion, WISHLIST_DIRECCION_MAX)
  const envioReferencia = asTrimmedString(input.envioReferencia, WISHLIST_REFERENCIA_MAX)

  if (!titulo) return { ok: false, message: 'Poné un título a tu lista (ej. Cumpleaños de Ana).' }
  if (!creadorNombre) return { ok: false, message: 'Indicá tu nombre.' }
  if (!destinatarioNombre) return { ok: false, message: 'Indicá a quién le llega el regalo.' }
  if (!envioDepartamento) return { ok: false, message: 'Seleccioná el departamento de envío.' }
  if (!envioCiudad) return { ok: false, message: 'Indicá la ciudad o municipio.' }
  if (!envioDireccion) return { ok: false, message: 'Ingresá la dirección donde deben llegar los regalos.' }

  const { items, error } = normalizeWishlistItems(input.items)
  if (error) return { ok: false, message: error }

  const estado: McWishlistEstado = input.estado === 'cerrada' ? 'cerrada' : 'activa'

  return {
    ok: true,
    value: {
      estado,
      titulo,
      creadorNombre,
      destinatarioNombre,
      envioDepartamento,
      envioCiudad,
      envioDireccion,
      items,
      ...(mensaje ? { mensaje } : {}),
      ...(destinatarioTelefono ? { destinatarioTelefono } : {}),
      ...(envioReferencia ? { envioReferencia } : {}),
    },
  }
}

export function wishlistItemPendingQty(item: McWishlistItem): number {
  return Math.max(0, item.cantidadDeseada - (item.compradoCantidad ?? 0))
}

export function wishlistHasPendingItems(list: Pick<McWishlist, 'items' | 'estado'>): boolean {
  if (list.estado !== 'activa') return false
  return list.items.some((i) => wishlistItemPendingQty(i) > 0)
}
