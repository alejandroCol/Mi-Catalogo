import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../firebaseAdmin.js'
import { buildStorePublicUrl } from '../storePublicUrl.js'
import { productoPrecioVentaFromData } from '../productoDescuento.js'
import type { StreamProviderPort } from './streamProviderPort.js'

export type LiveSessionStatus = 'draft' | 'scheduled' | 'live' | 'ended'

export type LiveSessionProductSnapshot = {
  nombre: string
  precioCop: number
  precioOriginalCop?: number
  imageUrl?: string
  stock: number
}

function liveSessionRef(tenantId: string, sessionId: string) {
  return db.doc(`mc_tenants/${tenantId}/live_sessions/${sessionId}`)
}

function liveSessionProductsRef(tenantId: string, sessionId: string) {
  return db.collection(`mc_tenants/${tenantId}/live_sessions/${sessionId}/session_products`)
}

export function mcLiveSessionCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/live_sessions`
}

export async function createLiveSession(opts: {
  tenantId: string
  hostUid: string
  slug: string
  title: string
  productIds: string[]
  platformOrigin: string
  streamProvider: StreamProviderPort
}): Promise<{ sessionId: string; shareUrl: string; ingestUrl: string; streamKey: string; playbackUrl: string }> {
  const sessionRef = db.collection(mcLiveSessionCollection(opts.tenantId)).doc()
  const sessionId = sessionRef.id
  const now = Date.now()

  const stream = await opts.streamProvider.createStream({
    passthrough: `${opts.tenantId}:${sessionId}`,
    title: opts.title.slice(0, 120),
  })

  const shareUrl = buildStorePublicUrl(opts.platformOrigin, opts.slug, `/live/${sessionId}`)

  await sessionRef.set({
    status: 'draft',
    title: opts.title.slice(0, 120),
    hostUid: opts.hostUid,
    streamProvider: stream.provider,
    streamId: stream.streamId,
    playbackUrl: stream.playbackUrl,
    ingestUrl: stream.ingestUrl,
    streamKey: stream.streamKey,
    featuredProductId: null,
    featuredAt: null,
    viewerCount: 0,
    purchaseCount: 0,
    chatEnabled: true,
    shareUrl,
    storeSlug: opts.slug.trim().toLowerCase(),
    streamActive: false,
    ingestMode: null,
    browserEgressId: null,
    createdAt: now,
    updatedAt: now,
  })

  await syncSessionProducts(opts.tenantId, sessionId, opts.productIds)

  return {
    sessionId,
    shareUrl,
    ingestUrl: stream.ingestUrl,
    streamKey: stream.streamKey,
    playbackUrl: stream.playbackUrl,
  }
}

export async function syncSessionProducts(tenantId: string, sessionId: string, productIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))].slice(0, 24)
  const batch = db.batch()
  const productsCol = liveSessionProductsRef(tenantId, sessionId)

  const existing = await productsCol.get()
  for (const doc of existing.docs) {
    if (!uniqueIds.includes(doc.id)) batch.delete(doc.ref)
  }

  for (let i = 0; i < uniqueIds.length; i++) {
    const productId = uniqueIds[i]
    const prodSnap = await db.doc(`mc_tenants/${tenantId}/productos/${productId}`).get()
    if (!prodSnap.exists) continue
    const data = prodSnap.data() as Record<string, unknown>
    if (data.activo !== true || data.enCatalogo !== true) continue

    const precioCop = productoPrecioVentaFromData(data)
    const precioOriginal =
      data.descuentoActivo === true && typeof data.precioCop === 'number' ? data.precioCop : undefined

    const snapshot: LiveSessionProductSnapshot = {
      nombre: String(data.nombre ?? 'Producto').slice(0, 120),
      precioCop,
      stock: typeof data.stock === 'number' ? data.stock : 0,
    }
    if (precioOriginal !== undefined) snapshot.precioOriginalCop = precioOriginal
    if (typeof data.imageUrl === 'string' && data.imageUrl.trim()) {
      snapshot.imageUrl = data.imageUrl.trim()
    }

    batch.set(
      productsCol.doc(productId),
      {
        productId,
        orden: i,
        pinnedAt: null,
        snapshot,
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  }

  await batch.commit()
}

export async function startLiveSession(
  tenantId: string,
  sessionId: string,
  ingestMode: 'obs' | 'browser' = 'obs',
): Promise<void> {
  const ref = liveSessionRef(tenantId, sessionId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('SESSION_NOT_FOUND')
  const data = snap.data() as { status?: string }
  if (data.status === 'ended') throw new Error('SESSION_ENDED')

  await ref.update({
    status: 'live',
    ingestMode,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  })
}

export async function setBrowserBroadcastMeta(
  tenantId: string,
  sessionId: string,
  egressId: string,
): Promise<void> {
  await liveSessionRef(tenantId, sessionId).update({
    ingestMode: 'browser',
    browserEgressId: egressId,
    updatedAt: Date.now(),
  })
}

export async function endLiveSession(
  tenantId: string,
  sessionId: string,
  opts?: {
    streamProvider?: StreamProviderPort
    stopBrowserEgress?: (egressId: string) => Promise<void>
  },
): Promise<void> {
  const ref = liveSessionRef(tenantId, sessionId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('SESSION_NOT_FOUND')
  const data = snap.data() as { streamId?: string; status?: string; browserEgressId?: string }

  const egressId = data.browserEgressId?.trim()
  if (egressId && opts?.stopBrowserEgress) {
    try {
      await opts.stopBrowserEgress(egressId)
    } catch (e) {
      console.warn('[endLiveSession] stopBrowserEgress', e)
    }
  }

  if (data.status !== 'ended') {
    await ref.update({
      status: 'ended',
      endedAt: Date.now(),
      updatedAt: Date.now(),
      streamActive: false,
      browserEgressId: null,
    })
  }

  const streamId = data.streamId?.trim()
  if (streamId && opts?.streamProvider) {
    try {
      await opts.streamProvider.deleteStream(streamId)
    } catch (e) {
      console.warn('[endLiveSession] deleteStream', e)
    }
  }
}

export async function pinLiveProduct(
  tenantId: string,
  sessionId: string,
  productId: string | null,
): Promise<void> {
  const ref = liveSessionRef(tenantId, sessionId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('SESSION_NOT_FOUND')

  const now = Date.now()
  const productsCol = liveSessionProductsRef(tenantId, sessionId)
  const batch = db.batch()

  const allProducts = await productsCol.get()
  for (const doc of allProducts.docs) {
    batch.update(doc.ref, { pinnedAt: doc.id === productId ? now : null, updatedAt: now })
  }

  batch.update(ref, {
    featuredProductId: productId,
    featuredAt: productId ? now : null,
    updatedAt: now,
  })

  await batch.commit()
}

export async function incrementLiveViewerCount(tenantId: string, sessionId: string): Promise<void> {
  await liveSessionRef(tenantId, sessionId).update({
    viewerCount: FieldValue.increment(1),
    updatedAt: Date.now(),
  })
}

export async function incrementLivePurchaseCount(tenantId: string, sessionId: string): Promise<void> {
  await liveSessionRef(tenantId, sessionId).update({
    purchaseCount: FieldValue.increment(1),
    updatedAt: Date.now(),
  })
}

export async function updateLiveStreamActive(
  tenantId: string,
  sessionId: string,
  active: boolean,
  recordingUrl?: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    streamActive: active,
    updatedAt: Date.now(),
  }
  if (recordingUrl) patch.recordingUrl = recordingUrl
  if (active) {
    patch.status = 'live'
    patch.startedAt = Date.now()
  }
  await liveSessionRef(tenantId, sessionId).update(patch)
}

export function parseLivePassthrough(passthrough: string): { tenantId: string; sessionId: string } | null {
  const parts = passthrough.split(':')
  if (parts.length !== 2) return null
  const [tenantId, sessionId] = parts
  if (!tenantId || !sessionId) return null
  return { tenantId, sessionId }
}
