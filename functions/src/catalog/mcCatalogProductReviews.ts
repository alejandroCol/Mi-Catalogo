import { randomUUID } from 'crypto'
import { getStorage } from 'firebase-admin/storage'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from '../firebaseAdmin.js'

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 120)
}

async function resolveTenantId(slug: string): Promise<string> {
  const slugSnap = await db.doc(`mc_slugs/${slug}`).get()
  if (!slugSnap.exists) throw new HttpsError('not-found', 'Catálogo no encontrado.')
  return (slugSnap.data() as { tenantId: string }).tenantId
}

async function recomputeProductRating(tenantId: string, productId: string) {
  const approved = await db
    .collection(`mc_tenants/${tenantId}/product_reviews`)
    .where('productId', '==', productId)
    .where('status', '==', 'approved')
    .get()

  let sum = 0
  for (const d of approved.docs) {
    const r = d.data().rating
    if (typeof r === 'number') sum += r
  }
  const count = approved.size
  const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0
  await db.doc(`mc_tenants/${tenantId}/productos/${productId}`).set(
    {
      ratingAvg: avg,
      ratingCount: count,
      updatedAt: Date.now(),
    },
    { merge: true },
  )
}

async function uploadReviewImage(
  tenantId: string,
  reviewId: string,
  imageBase64: string,
): Promise<string> {
  const raw = imageBase64.includes(',') ? imageBase64.split(',')[1]! : imageBase64
  let buffer: Buffer
  try {
    buffer = Buffer.from(raw, 'base64')
  } catch {
    throw new HttpsError('invalid-argument', 'La imagen no es válida.')
  }
  if (!buffer.length || buffer.length > 1.8 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'La imagen es demasiado pesada (máx. ~1.5 MB).')
  }
  // JPEG magic / PNG magic
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50
  if (!isJpeg && !isPng) {
    throw new HttpsError('invalid-argument', 'La foto debe ser JPG o PNG.')
  }

  const token = randomUUID()
  const ext = isPng ? 'png' : 'jpg'
  const contentType = isPng ? 'image/png' : 'image/jpeg'
  const path = `mc_tenants/${tenantId}/product_reviews/${reviewId}.${ext}`
  const bucket = getStorage().bucket()
  const file = bucket.file(path)
  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: token },
      cacheControl: 'public,max-age=31536000',
    },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
}

/** Publica reseña verificada (pedido + producto). Auto-aprueba. */
export const mcCatalogSubmitProductReview = onCall(
  { invoker: 'public', memory: '512MiB', timeoutSeconds: 60 },
  async (request) => {
    const d = request.data as {
      slug?: string
      productId?: string
      orderId?: string
      rating?: number
      comentario?: string
      clienteNombre?: string
      clienteEmail?: string
      imageBase64?: string
    }

    const slug = typeof d.slug === 'string' ? d.slug.trim().toLowerCase() : ''
    const productId = typeof d.productId === 'string' ? d.productId.trim() : ''
    const orderId = typeof d.orderId === 'string' ? d.orderId.trim() : ''
    const rating = typeof d.rating === 'number' ? Math.round(d.rating) : 0
    const comentario = typeof d.comentario === 'string' ? d.comentario.trim().slice(0, 800) : ''
    const clienteNombre = typeof d.clienteNombre === 'string' ? d.clienteNombre.trim().slice(0, 80) : ''
    const imageBase64 = typeof d.imageBase64 === 'string' ? d.imageBase64.trim() : ''

    if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) {
      throw new HttpsError('invalid-argument', 'Tienda inválida.')
    }
    if (!productId || !orderId || rating < 1 || rating > 5 || !comentario || !clienteNombre) {
      throw new HttpsError('invalid-argument', 'Completá nombre, pedido, calificación y comentario.')
    }

    const tenantId = await resolveTenantId(slug)
    const orderSnap = await db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${orderId}`).get()
    if (!orderSnap.exists) {
      throw new HttpsError('failed-precondition', 'No encontramos ese pedido. Revisá el N.º de pedido.')
    }
    const order = orderSnap.data() as {
      clienteEmail?: string
      estado?: string
      lineas?: { productId?: string }[]
    }
    if (order.estado === 'esperando_pago' || order.estado === 'cancelado') {
      throw new HttpsError('failed-precondition', 'Ese pedido aún no permite reseñas.')
    }
    const bought = (order.lineas || []).some((l) => l.productId === productId)
    if (!bought) {
      throw new HttpsError('failed-precondition', 'Ese pedido no incluye este producto.')
    }

    const productSnap = await db.doc(`mc_tenants/${tenantId}/productos/${productId}`).get()
    if (!productSnap.exists) {
      throw new HttpsError('not-found', 'Producto no encontrado.')
    }
    const productNombre = String((productSnap.data() as { nombre?: string }).nombre || 'Producto').slice(0, 120)

    const reviewId = `${orderId}_${productId}`.slice(0, 140)
    const ref = db.doc(`mc_tenants/${tenantId}/product_reviews/${reviewId}`)
    const existing = await ref.get()
    if (existing.exists && (existing.data() as { status?: string }).status === 'approved') {
      throw new HttpsError('already-exists', 'Ya dejaste una reseña de este producto con ese pedido.')
    }

    let imageUrl: string | undefined
    if (imageBase64) {
      imageUrl = await uploadReviewImage(tenantId, reviewId, imageBase64)
    }

    const orderEmail = normalizeEmail(String(order.clienteEmail || ''))
    const now = Date.now()
    await ref.set({
      productId,
      productNombre,
      orderId,
      rating,
      comentario,
      clienteNombre,
      ...(orderEmail ? { clienteEmail: orderEmail } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      status: 'approved',
      verifiedPurchase: true,
      createdAt: existing.exists ? (existing.data() as { createdAt?: number }).createdAt || now : now,
      updatedAt: now,
    })

    await recomputeProductRating(tenantId, productId)
    return { ok: true as const, reviewId, ...(imageUrl ? { imageUrl } : {}) }
  },
)

/** Moderación: ocultar/restaurar reseña (dueño de tienda). */
export const mcCatalogModerateProductReview = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')

  const d = request.data as { reviewId?: string; status?: string; targetTenantId?: string }
  const reviewId = typeof d.reviewId === 'string' ? d.reviewId.trim() : ''
  const status = d.status === 'approved' || d.status === 'rejected' ? d.status : null
  if (!reviewId || !status) {
    throw new HttpsError('invalid-argument', 'Datos incompletos.')
  }

  const userSnap = await db.doc(`mc_users/${uid}`).get()
  const user = userSnap.data() as { tenantId?: string; isSuperAdmin?: boolean } | undefined
  const isSuper = user?.isSuperAdmin === true
  const tenantId =
    isSuper && typeof d.targetTenantId === 'string' && d.targetTenantId
      ? d.targetTenantId
      : user?.tenantId
  if (!tenantId) throw new HttpsError('permission-denied', 'Sin tienda.')

  const ref = db.doc(`mc_tenants/${tenantId}/product_reviews/${reviewId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Reseña no encontrada.')
  const productId = String((snap.data() as { productId?: string }).productId || '')
  if (!productId) throw new HttpsError('failed-precondition', 'Reseña inválida.')

  await ref.update({
    status,
    updatedAt: Date.now(),
    moderatedAt: Date.now(),
    moderatedByUid: uid,
  })
  await recomputeProductRating(tenantId, productId)
  return { ok: true as const }
})
