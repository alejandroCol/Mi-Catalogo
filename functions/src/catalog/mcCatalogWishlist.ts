import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../firebaseAdmin.js'

const MAX_ITEMS = 50
const MAX_QTY = 20
const SESSION_MIN = 16

type WishlistItem = {
  productId: string
  varianteId?: string
  tallaId?: string
  titulo: string
  referencia?: string
  subtitulo?: string
  precioUnitarioCop?: number
  imageUrl?: string
  cantidadDeseada: number
  compradoCantidad?: number
}

function asTrimmed(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

function itemKey(item: Pick<WishlistItem, 'productId' | 'varianteId' | 'tallaId'>): string {
  return `${item.productId}::${item.varianteId || ''}::${item.tallaId || ''}`
}

async function resolveTenantId(slug: string): Promise<string> {
  const slugSnap = await db.doc(`mc_slugs/${slug}`).get()
  if (!slugSnap.exists || (slugSnap.data() as { active?: boolean }).active !== true) {
    throw new HttpsError('not-found', 'Catálogo no encontrado.')
  }
  const tenantId = (slugSnap.data() as { tenantId?: string }).tenantId
  if (!tenantId) throw new HttpsError('not-found', 'Catálogo no encontrado.')
  return tenantId
}

function normalizeItems(raw: unknown): WishlistItem[] {
  if (!Array.isArray(raw)) {
    throw new HttpsError('invalid-argument', 'La lista de regalos es inválida.')
  }
  if (raw.length === 0) {
    throw new HttpsError('invalid-argument', 'Agregá al menos un producto a la lista.')
  }
  if (raw.length > MAX_ITEMS) {
    throw new HttpsError('invalid-argument', `Máximo ${MAX_ITEMS} productos por lista.`)
  }

  const byKey = new Map<string, WishlistItem>()
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const productId = asTrimmed(r.productId, 120)
    if (!productId) continue
    const varianteId = asTrimmed(r.varianteId, 80) || undefined
    const tallaId = asTrimmed(r.tallaId, 80) || undefined
    const titulo = asTrimmed(r.titulo, 160) || 'Producto'
    const referencia = asTrimmed(r.referencia, 80) || undefined
    const subtitulo = asTrimmed(r.subtitulo, 160) || undefined
    const imageUrl = asTrimmed(r.imageUrl, 800) || undefined
    const precioRaw = r.precioUnitarioCop
    const precioUnitarioCop =
      typeof precioRaw === 'number' && Number.isFinite(precioRaw) && precioRaw >= 0
        ? Math.round(precioRaw)
        : undefined
    let cantidadDeseada = typeof r.cantidadDeseada === 'number' ? Math.floor(r.cantidadDeseada) : 1
    if (!Number.isFinite(cantidadDeseada) || cantidadDeseada < 1) cantidadDeseada = 1
    cantidadDeseada = Math.min(MAX_QTY, cantidadDeseada)

    const next: WishlistItem = {
      productId,
      titulo,
      cantidadDeseada,
      ...(varianteId ? { varianteId } : {}),
      ...(tallaId ? { tallaId } : {}),
      ...(referencia ? { referencia } : {}),
      ...(subtitulo ? { subtitulo } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(precioUnitarioCop != null ? { precioUnitarioCop } : {}),
    }
    const key = itemKey(next)
    const prev = byKey.get(key)
    if (prev) {
      byKey.set(key, {
        ...prev,
        cantidadDeseada: Math.min(MAX_QTY, prev.cantidadDeseada + next.cantidadDeseada),
      })
    } else {
      byKey.set(key, next)
    }
  }

  const items = [...byKey.values()]
  if (items.length === 0) {
    throw new HttpsError('invalid-argument', 'Agregá al menos un producto a la lista.')
  }
  return items
}

function toPublicWishlist(id: string, data: Record<string, unknown>) {
  return {
    id,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
    estado: data.estado === 'cerrada' ? ('cerrada' as const) : ('activa' as const),
    titulo: String(data.titulo || ''),
    mensaje: typeof data.mensaje === 'string' ? data.mensaje : undefined,
    creadorNombre: String(data.creadorNombre || ''),
    destinatarioNombre: String(data.destinatarioNombre || ''),
    destinatarioTelefono:
      typeof data.destinatarioTelefono === 'string' ? data.destinatarioTelefono : undefined,
    envioDepartamento: String(data.envioDepartamento || ''),
    envioCiudad: String(data.envioCiudad || ''),
    envioDireccion: String(data.envioDireccion || ''),
    envioReferencia: typeof data.envioReferencia === 'string' ? data.envioReferencia : undefined,
    items: Array.isArray(data.items) ? (data.items as WishlistItem[]) : [],
  }
}

/** Crea o actualiza una lista de deseos compartible (editor anónimo con sessionToken). */
export const mcCatalogWishlistUpsert = onCall({ invoker: 'public' }, async (request) => {
  const d = request.data as Record<string, unknown>
  const slug = asTrimmed(d.slug, 80).toLowerCase()
  const sessionToken = asTrimmed(d.sessionToken, 80)
  const wishlistIdIn = asTrimmed(d.wishlistId, 128)

  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) {
    throw new HttpsError('invalid-argument', 'Tienda inválida.')
  }
  if (sessionToken.length < SESSION_MIN) {
    throw new HttpsError('invalid-argument', 'Sesión inválida. Recargá la página e intentá de nuevo.')
  }

  const titulo = asTrimmed(d.titulo, 80)
  const mensaje = asTrimmed(d.mensaje, 400)
  const creadorNombre = asTrimmed(d.creadorNombre, 80)
  const destinatarioNombre = asTrimmed(d.destinatarioNombre, 80) || creadorNombre
  const destinatarioTelefono = asTrimmed(d.destinatarioTelefono, 40)
  const envioDepartamento = asTrimmed(d.envioDepartamento, 120)
  const envioCiudad = asTrimmed(d.envioCiudad, 120)
  const envioDireccion = asTrimmed(d.envioDireccion, 500)
  const envioReferencia = asTrimmed(d.envioReferencia, 300)
  const estado = d.estado === 'cerrada' ? 'cerrada' : 'activa'

  if (!titulo) throw new HttpsError('invalid-argument', 'Poné un título a tu lista.')
  if (!creadorNombre) throw new HttpsError('invalid-argument', 'Indicá tu nombre.')
  if (!destinatarioNombre) throw new HttpsError('invalid-argument', 'Indicá a quién le llega el regalo.')
  if (!envioDepartamento) throw new HttpsError('invalid-argument', 'Seleccioná el departamento de envío.')
  if (!envioCiudad) throw new HttpsError('invalid-argument', 'Indicá la ciudad o municipio.')
  if (!envioDireccion) throw new HttpsError('invalid-argument', 'Ingresá la dirección de envío.')

  const incomingItems = normalizeItems(d.items)
  const tenantId = await resolveTenantId(slug)
  const col = db.collection(`mc_tenants/${tenantId}/wishlists`)
  const now = Date.now()

  let ref = wishlistIdIn ? col.doc(wishlistIdIn) : col.doc()
  let preserveComprado = new Map<string, number>()

  if (wishlistIdIn) {
    const prev = await ref.get()
    if (!prev.exists) {
      throw new HttpsError('not-found', 'No encontramos esa lista.')
    }
    const prevData = prev.data() as { sessionToken?: string; items?: WishlistItem[]; createdAt?: number }
    if (prevData.sessionToken !== sessionToken) {
      throw new HttpsError('permission-denied', 'No tenés permiso para editar esta lista.')
    }
    for (const it of prevData.items || []) {
      if ((it.compradoCantidad ?? 0) > 0) {
        preserveComprado.set(itemKey(it), it.compradoCantidad ?? 0)
      }
    }
    const items = incomingItems.map((it) => {
      const bought = preserveComprado.get(itemKey(it)) ?? 0
      return bought > 0
        ? { ...it, compradoCantidad: Math.min(it.cantidadDeseada, bought) }
        : it
    })
    await ref.set(
      {
        updatedAt: now,
        estado,
        sessionToken,
        titulo,
        creadorNombre,
        destinatarioNombre,
        envioDepartamento,
        envioCiudad,
        envioDireccion,
        items,
        ...(mensaje ? { mensaje } : { mensaje: FieldValue.delete() }),
        ...(destinatarioTelefono
          ? { destinatarioTelefono }
          : { destinatarioTelefono: FieldValue.delete() }),
        ...(envioReferencia ? { envioReferencia } : { envioReferencia: FieldValue.delete() }),
      },
      { merge: true },
    )
  } else {
    await ref.set({
      createdAt: now,
      updatedAt: now,
      estado,
      sessionToken,
      titulo,
      creadorNombre,
      destinatarioNombre,
      envioDepartamento,
      envioCiudad,
      envioDireccion,
      items: incomingItems,
      ...(mensaje ? { mensaje } : {}),
      ...(destinatarioTelefono ? { destinatarioTelefono } : {}),
      ...(envioReferencia ? { envioReferencia } : {}),
    })
  }

  return {
    ok: true as const,
    wishlistId: ref.id,
    sharePath: `/lista/${ref.id}`,
    managePath: `/lista/${ref.id}/gestionar?k=${encodeURIComponent(sessionToken)}`,
  }
})

/** Lectura pública de una lista. Con `sessionToken` válido indica `canManage`. */
export const mcCatalogWishlistGet = onCall({ invoker: 'public' }, async (request) => {
  const d = request.data as { slug?: string; wishlistId?: string; sessionToken?: string }
  const slug = asTrimmed(d.slug, 80).toLowerCase()
  const wishlistId = asTrimmed(d.wishlistId, 128)
  const sessionToken = asTrimmed(d.sessionToken, 80)
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug) || !wishlistId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos.')
  }
  const tenantId = await resolveTenantId(slug)
  const snap = await db.doc(`mc_tenants/${tenantId}/wishlists/${wishlistId}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Lista no encontrada.')
  const data = (snap.data() || {}) as Record<string, unknown>
  const canManage =
    sessionToken.length >= SESSION_MIN &&
    typeof data.sessionToken === 'string' &&
    data.sessionToken === sessionToken
  return {
    ok: true as const,
    wishlist: toPublicWishlist(snap.id, data),
    canManage,
  }
})

/**
 * Marca ítems comprados tras un pedido regalo.
 * Idempotente: suma solo lo faltante según líneas del pedido.
 */
export const mcCatalogWishlistRecordPurchase = onCall({ invoker: 'public' }, async (request) => {
  const d = request.data as { slug?: string; orderId?: string }
  const slug = asTrimmed(d.slug, 80).toLowerCase()
  const orderId = asTrimmed(d.orderId, 128)
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug) || !orderId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos.')
  }

  const tenantId = await resolveTenantId(slug)
  const orderSnap = await db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${orderId}`).get()
  if (!orderSnap.exists) {
    throw new HttpsError('not-found', 'Pedido no encontrado.')
  }
  const order = orderSnap.data() as {
    esRegalo?: boolean
    wishlistId?: string
    estado?: string
    lineas?: { productId?: string; varianteId?: string; tallaId?: string; cantidad?: number }[]
    wishlistPurchaseRecordedAt?: number
  }

  if (!order.esRegalo || !order.wishlistId) {
    return { ok: true as const, updated: false }
  }
  if (order.estado === 'esperando_pago' || order.estado === 'cancelado') {
    return { ok: true as const, updated: false }
  }
  if (typeof order.wishlistPurchaseRecordedAt === 'number') {
    return { ok: true as const, updated: false }
  }

  const listRef = db.doc(`mc_tenants/${tenantId}/wishlists/${order.wishlistId}`)
  const listSnap = await listRef.get()
  if (!listSnap.exists) {
    return { ok: true as const, updated: false }
  }

  const list = listSnap.data() as { items?: WishlistItem[]; estado?: string }
  const orderLineas = (order.lineas || []).map((linea) => ({
    productId: asTrimmed(linea.productId, 120),
    varianteId: asTrimmed(linea.varianteId, 80) || undefined,
    tallaId: asTrimmed(linea.tallaId, 80) || undefined,
    cantidad: typeof linea.cantidad === 'number' ? Math.max(0, Math.floor(linea.cantidad)) : 0,
  }))

  const nextItems = (list.items || []).map((it) => {
    let add = 0
    for (const linea of orderLineas) {
      if (!linea.productId || linea.productId !== it.productId) continue
      if (it.varianteId && linea.varianteId !== it.varianteId) continue
      if (it.tallaId && linea.tallaId !== it.tallaId) continue
      add += linea.cantidad
    }
    if (add <= 0) return it
    const compradoCantidad = Math.min(it.cantidadDeseada, (it.compradoCantidad ?? 0) + add)
    return { ...it, compradoCantidad }
  })

  const allBought = nextItems.every((it) => (it.compradoCantidad ?? 0) >= it.cantidadDeseada)
  const now = Date.now()
  await listRef.set(
    {
      items: nextItems,
      updatedAt: now,
      ...(allBought ? { estado: 'cerrada' } : {}),
    },
    { merge: true },
  )
  await orderSnap.ref.set({ wishlistPurchaseRecordedAt: now, updatedAt: now }, { merge: true })

  return { ok: true as const, updated: true }
})
