import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from '../firebaseAdmin.js'

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 120)
}

function mapOrderSummary(
  id: string,
  data: {
    estado?: string
    totalCop?: number
    createdAt?: number
    lineas?: { nombre?: string }[]
  },
): {
  orderId: string
  estado: string
  totalCop: number
  createdAt: number
  lineasCount: number
  previewNombres: string[]
} {
  const lineas = Array.isArray(data.lineas) ? data.lineas : []
  const previewNombres = lineas
    .slice(0, 3)
    .map((l: { nombre?: string }) => String(l?.nombre || 'Producto').slice(0, 80))
  return {
    orderId: id,
    estado: typeof data.estado === 'string' ? data.estado : 'pagado',
    totalCop: typeof data.totalCop === 'number' ? data.totalCop : 0,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    lineasCount: lineas.length,
    previewNombres,
  }
}

/** Lista pedidos del comprador por email (sin cuenta). Rate-limit suave por IP/email. */
export const mcCatalogOrdersByEmail = onCall({ invoker: 'public' }, async (request) => {
  const d = request.data as { slug?: string; email?: string }
  const slug = typeof d.slug === 'string' ? d.slug.trim().toLowerCase() : ''
  const email = typeof d.email === 'string' ? normalizeEmail(d.email) : ''
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) {
    throw new HttpsError('invalid-argument', 'Tienda inválida.')
  }
  if (!email || !email.includes('@') || email.length < 5) {
    throw new HttpsError('invalid-argument', 'Indicá un email válido.')
  }

  const slugSnap = await db.doc(`mc_slugs/${slug}`).get()
  if (!slugSnap.exists) {
    throw new HttpsError('not-found', 'Catálogo no encontrado.')
  }
  const tenantId = (slugSnap.data() as { tenantId: string }).tenantId
  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  const nombreTienda =
    typeof (tenantSnap.data() as { nombreTienda?: string } | undefined)?.nombreTienda === 'string'
      ? String((tenantSnap.data() as { nombreTienda: string }).nombreTienda).trim()
      : 'Tu tienda'

  const snap = await db
    .collection(`mc_tenants/${tenantId}/ordenes_catalogo`)
    .where('clienteEmail', '==', email)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get()

  const orders = snap.docs
    .map((doc) => mapOrderSummary(doc.id, doc.data()))
    .filter((o) => o.estado !== 'esperando_pago' && o.estado !== 'cancelado')

  return {
    nombreTienda,
    email,
    orders,
  }
})
