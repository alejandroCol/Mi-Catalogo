import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import express from 'express'
import { getAuth } from 'firebase-admin/auth'
import { db } from '../firebaseAdmin.js'
import {
  assertMasterLiveAccess,
  resolveLiveTenantForOwner,
  resolvePublicTenantBySlug,
} from './liveAuth.js'
import {
  createLiveSession,
  endLiveSession,
  incrementLivePurchaseCount,
  incrementLiveViewerCount,
  pinLiveProduct,
  startLiveSession,
  syncSessionProducts,
  updateLiveStreamActive,
  parseLivePassthrough,
  setBrowserBroadcastMeta,
} from './liveSessionService.js'
import { getStreamProvider, liveStreamSecrets, muxTokenId, muxTokenSecret } from './getStreamProvider.js'
import { fetchMuxLiveTestMode } from './platformLiveSettings.js'
import { throwLiveServiceError } from './liveErrors.js'
import {
  getBrowserIngest,
  liveBrowserSecrets,
  livekitApiKey,
  livekitApiSecret,
  livekitUrl,
} from './getBrowserIngest.js'

const mcPublicOrigin = defineString('MC_PUBLIC_ORIGIN', { default: 'https://micatalogo.io' })

function sanitizeTitle(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  return s.slice(0, 120) || 'Live de mi tienda'
}

function sanitizeProductIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 24)
}

function sanitizeSessionId(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s || s.length > 128) throw new HttpsError('invalid-argument', 'Sesi?n inv?lida.')
  return s
}

function sanitizeDisplayName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  return s.slice(0, 40) || 'Visitante'
}

function sanitizeChatText(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) throw new HttpsError('invalid-argument', 'Escrib? un mensaje.')
  if (s.length > 280) throw new HttpsError('invalid-argument', 'M?ximo 280 caracteres.')
  return s
}

function sanitizeSlug(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!s) throw new HttpsError('invalid-argument', 'Tienda inv?lida.')
  return s
}

function browserIngestFromSecrets() {
  return getBrowserIngest({
    livekitUrl: livekitUrl.value(),
    livekitApiKey: livekitApiKey.value(),
    livekitApiSecret: livekitApiSecret.value(),
  })
}

async function providerFromPlatform() {
  const muxTestMode = await fetchMuxLiveTestMode()
  return getStreamProvider({
    muxTokenId: muxTokenId.value(),
    muxTokenSecret: muxTokenSecret.value(),
    muxTestMode,
  })
}

async function getSessionForOwner(tenantId: string, sessionId: string) {
  const ref = db.doc(`mc_tenants/${tenantId}/live_sessions/${sessionId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Live no encontrado.')
  return { ref, data: snap.data() as Record<string, unknown> }
}

async function performOwnerEndLiveSession(tenantId: string, sessionId: string): Promise<void> {
  await getSessionForOwner(tenantId, sessionId)
  const ingest = browserIngestFromSecrets()
  await endLiveSession(tenantId, sessionId, {
    streamProvider: await providerFromPlatform(),
    stopBrowserEgress: ingest ? (id) => ingest.stopBrowserBroadcast(id) : undefined,
  })
}

/** Solo lives browser en curso (cierre autom?tico al irse el host). */
async function performBrowserHostAutoEnd(
  tenantId: string,
  sessionId: string,
): Promise<{ ended: boolean }> {
  const { data } = await getSessionForOwner(tenantId, sessionId)
  if (data.status !== 'live') return { ended: false }
  if (data.ingestMode !== 'browser') return { ended: false }
  await performOwnerEndLiveSession(tenantId, sessionId)
  return { ended: true }
}

export const mcLiveCreateSession = onCall({ invoker: 'public', secrets: [...liveStreamSecrets] }, async (request) => {
  const { tenantId, tenant, uid } = await resolveLiveTenantForOwner(request.auth)
  assertMasterLiveAccess(tenant)

  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    title?: unknown
    productIds?: unknown
  }

  const slug = tenant.slug?.trim().toLowerCase()
  if (!slug) throw new HttpsError('failed-precondition', 'Configur? el slug de tu tienda.')

  const result = await createLiveSession({
    tenantId,
    hostUid: uid,
    slug,
    title: sanitizeTitle(data.title),
    productIds: sanitizeProductIds(data.productIds),
    platformOrigin: mcPublicOrigin.value(),
    streamProvider: await providerFromPlatform(),
  }).catch((err: unknown) => {
    throwLiveServiceError(err)
  })

  return result
})

export const mcLiveUpdateProducts = onCall({ invoker: 'public' }, async (request) => {
  const { tenantId, tenant } = await resolveLiveTenantForOwner(request.auth)
  assertMasterLiveAccess(tenant)

  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    sessionId?: unknown
    productIds?: unknown
  }
  const sessionId = sanitizeSessionId(data.sessionId)
  try {
    await getSessionForOwner(tenantId, sessionId)
    await syncSessionProducts(tenantId, sessionId, sanitizeProductIds(data.productIds))
  } catch (err) {
    console.error('[mcLiveUpdateProducts]', err)
    if (err instanceof HttpsError) throw err
    throw new HttpsError('internal', 'No se pudieron guardar los productos del live.')
  }
  return { ok: true }
})

export const mcLiveStartSession = onCall({ invoker: 'public' }, async (request) => {
  const { tenantId, tenant } = await resolveLiveTenantForOwner(request.auth)
  assertMasterLiveAccess(tenant)

  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    sessionId?: unknown
  }
  const sessionId = sanitizeSessionId(data.sessionId)
  await getSessionForOwner(tenantId, sessionId)
  await startLiveSession(tenantId, sessionId, 'obs')
  return { ok: true }
})

export const mcLiveGetBrowserBroadcastConfig = onCall(
  { invoker: 'public', secrets: [...liveBrowserSecrets] },
  async (request) => {
    await resolveLiveTenantForOwner(request.auth)
    const ingest = browserIngestFromSecrets()
    return { available: ingest?.isConfigured() === true }
  },
)

export const mcLiveStartBrowserBroadcast = onCall(
  { invoker: 'public', secrets: [...liveBrowserSecrets] },
  async (request) => {
    const { tenantId, tenant, uid } = await resolveLiveTenantForOwner(request.auth)
    assertMasterLiveAccess(tenant)

    const ingest = browserIngestFromSecrets()
    if (!ingest?.isConfigured()) {
      throw new HttpsError(
        'failed-precondition',
        'Transmisi?n desde navegador no configurada. Us? OBS o contact? soporte.',
      )
    }

    const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
      sessionId?: unknown
    }
    const sessionId = sanitizeSessionId(data.sessionId)
    const { data: sessionData } = await getSessionForOwner(tenantId, sessionId)

    if (sessionData.status === 'ended') {
      throw new HttpsError('failed-precondition', 'Este live ya termin?.')
    }

    const hostName =
      typeof request.auth?.token?.name === 'string'
        ? request.auth.token.name
        : typeof request.auth?.token?.email === 'string'
          ? request.auth.token.email.split('@')[0]
          : 'Host'

    try {
      return await ingest.prepareBrowserBroadcast({
        tenantId,
        sessionId,
        hostUid: uid,
        hostName,
      })
    } catch (err) {
      console.error('[mcLiveStartBrowserBroadcast]', err)
      const msg = err instanceof Error ? err.message : String(err)
      throw new HttpsError(
        'failed-precondition',
        msg.includes('Not Found') || msg.includes('room')
          ? 'No se pudo preparar la sala LiveKit. Revis? LIVEKIT_URL y credenciales.'
          : `No se pudo preparar la transmisi?n: ${msg.slice(0, 120)}`,
      )
    }
  },
)

export const mcLiveStartBrowserBroadcastEgress = onCall(
  { invoker: 'public', secrets: [...liveBrowserSecrets] },
  async (request) => {
    const { tenantId, tenant } = await resolveLiveTenantForOwner(request.auth)
    assertMasterLiveAccess(tenant)

    const ingest = browserIngestFromSecrets()
    if (!ingest?.isConfigured()) {
      throw new HttpsError('failed-precondition', 'LiveKit no configurado.')
    }

    const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
      sessionId?: unknown
    }
    const sessionId = sanitizeSessionId(data.sessionId)
    const { data: sessionData } = await getSessionForOwner(tenantId, sessionId)

    if (sessionData.status === 'ended') {
      throw new HttpsError('failed-precondition', 'Este live ya termin?.')
    }

    const ingestUrl = String(sessionData.ingestUrl ?? '')
    const streamKey = String(sessionData.streamKey ?? '')
    if (!ingestUrl || !streamKey) {
      throw new HttpsError('failed-precondition', 'Stream Mux no configurado.')
    }

    try {
      const { egressId } = await ingest.startBrowserBroadcastEgress({
        tenantId,
        sessionId,
        hostUid: request.auth!.uid,
        rtmpIngestUrl: ingestUrl,
        streamKey,
      })
      await setBrowserBroadcastMeta(tenantId, sessionId, egressId)
      await startLiveSession(tenantId, sessionId, 'browser')
      await updateLiveStreamActive(tenantId, sessionId, true)
      return { egressId }
    } catch (err) {
      console.error('[mcLiveStartBrowserBroadcastEgress]', err)
      const msg = err instanceof Error ? err.message : String(err)
      throw new HttpsError(
        'failed-precondition',
        msg.includes('does not exist')
          ? 'La sala a?n no est? lista. Esper? un segundo e intent? de nuevo.'
          : `No se pudo enviar la se?al a Mux: ${msg.slice(0, 120)}`,
      )
    }
  },
)

export const mcLiveEndSession = onCall(
  { invoker: 'public', secrets: [...liveStreamSecrets, ...liveBrowserSecrets] },
  async (request) => {
    const { tenantId, tenant } = await resolveLiveTenantForOwner(request.auth)
    assertMasterLiveAccess(tenant)

    const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
      sessionId?: unknown
    }
    const sessionId = sanitizeSessionId(data.sessionId)
    await performOwnerEndLiveSession(tenantId, sessionId)
    return { ok: true }
  },
)

const hostDisconnectApp = express()
hostDisconnectApp.disable('x-powered-by')

hostDisconnectApp.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }
  next()
})

hostDisconnectApp.use(express.json())

hostDisconnectApp.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ ok: false, error: 'unauthenticated' })
      return
    }

    const idToken = authHeader.slice('Bearer '.length).trim()
    if (!idToken) {
      res.status(401).json({ ok: false, error: 'unauthenticated' })
      return
    }

    const decoded = await getAuth().verifyIdToken(idToken)
    const { tenantId, tenant } = await resolveLiveTenantForOwner({
      uid: decoded.uid,
      token: decoded as Record<string, unknown>,
    })
    assertMasterLiveAccess(tenant)

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      sessionId?: unknown
      reason?: unknown
    }
    const sessionId = sanitizeSessionId(body.sessionId)
    const result = await performBrowserHostAutoEnd(tenantId, sessionId)
    res.status(200).json({ ok: true, ...result, reason: body.reason ?? null })
  } catch (e) {
    console.error('[mcLiveHostDisconnect]', e)
    if (e instanceof HttpsError) {
      const code = e.code === 'unauthenticated' ? 401 : e.code === 'permission-denied' ? 403 : 400
      res.status(code).json({ ok: false, error: e.message })
      return
    }
    res.status(500).json({ ok: false, error: 'internal' })
  }
})

/** Cierre autom?tico del live browser (keepalive al cerrar pesta?a / timeout cliente). */
export const mcLiveHostDisconnect = onRequest(
  { cors: false, invoker: 'public', secrets: [...liveStreamSecrets, ...liveBrowserSecrets] },
  hostDisconnectApp,
)

export const mcLivePinProduct = onCall({ invoker: 'public' }, async (request) => {
  const { tenantId, tenant } = await resolveLiveTenantForOwner(request.auth)
  assertMasterLiveAccess(tenant)

  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    sessionId?: unknown
    productId?: unknown
  }
  const sessionId = sanitizeSessionId(data.sessionId)
  const productId =
    data.productId === null || data.productId === undefined
      ? null
      : typeof data.productId === 'string'
        ? data.productId.trim() || null
        : null

  await getSessionForOwner(tenantId, sessionId)
  await pinLiveProduct(tenantId, sessionId, productId)
  return { ok: true }
})

const CHAT_RATE_MS = 2500
const chatRateMap = new Map<string, number>()

export const mcLiveSendChat = onCall({ invoker: 'public' }, async (request) => {
  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    slug?: unknown
    sessionId?: unknown
    displayName?: unknown
    text?: unknown
  }

  const slug = sanitizeSlug(data.slug)
  const sessionId = sanitizeSessionId(data.sessionId)
  const displayName = sanitizeDisplayName(data.displayName)
  const text = sanitizeChatText(data.text)

  const { tenantId } = await resolvePublicTenantBySlug(slug)
  const sessionSnap = await db.doc(`mc_tenants/${tenantId}/live_sessions/${sessionId}`).get()
  if (!sessionSnap.exists) throw new HttpsError('not-found', 'Live no encontrado.')

  const session = sessionSnap.data() as { status?: string; chatEnabled?: boolean }
  if (session.status !== 'live') throw new HttpsError('failed-precondition', 'El live no est? activo.')
  if (session.chatEnabled === false) throw new HttpsError('failed-precondition', 'Chat desactivado.')

  const uid = request.auth?.uid ?? null
  const rateKey = `${tenantId}:${sessionId}:${uid ?? 'anon'}`
  const now = Date.now()
  const last = chatRateMap.get(rateKey) ?? 0
  if (now - last < CHAT_RATE_MS) {
    throw new HttpsError('resource-exhausted', 'Esper? un momento antes de enviar otro mensaje.')
  }
  chatRateMap.set(rateKey, now)

  const msgRef = db.collection(`mc_tenants/${tenantId}/live_sessions/${sessionId}/chat`).doc()
  const msg = {
    id: msgRef.id,
    uid,
    displayName,
    text,
    type: 'message' as const,
    createdAt: now,
  }
  await msgRef.set(msg)
  return { ok: true, messageId: msgRef.id }
})

export const mcLiveJoinViewer = onCall({ invoker: 'public' }, async (request) => {
  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    slug?: unknown
    sessionId?: unknown
    viewerSessionId?: unknown
  }

  const slug = sanitizeSlug(data.slug)
  const sessionId = sanitizeSessionId(data.sessionId)
  const viewerSessionId =
    typeof data.viewerSessionId === 'string' ? data.viewerSessionId.trim().slice(0, 64) : ''

  const { tenantId } = await resolvePublicTenantBySlug(slug)
  const sessionSnap = await db.doc(`mc_tenants/${tenantId}/live_sessions/${sessionId}`).get()
  if (!sessionSnap.exists) throw new HttpsError('not-found', 'Live no encontrado.')

  const session = sessionSnap.data() as { status?: string }
  if (session.status !== 'live' && session.status !== 'ended') {
    throw new HttpsError('failed-precondition', 'Este live a?n no comenz?.')
  }

  if (viewerSessionId && session.status === 'live') {
    const dedupRef = db.doc(
      `mc_tenants/${tenantId}/live_sessions/${sessionId}/viewers/${viewerSessionId}`,
    )
    const dedupSnap = await dedupRef.get()
    if (!dedupSnap.exists) {
      await dedupRef.set({ joinedAt: Date.now() })
      await incrementLiveViewerCount(tenantId, sessionId)
    }
  }

  return { ok: true }
})

export const mcLiveRecordPurchase = onCall({ invoker: 'public' }, async (request) => {
  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    slug?: unknown
    sessionId?: unknown
    productTitle?: unknown
    displayName?: unknown
  }

  const slug = sanitizeSlug(data.slug)
  const sessionId = sanitizeSessionId(data.sessionId)
  const { tenantId } = await resolvePublicTenantBySlug(slug)

  await incrementLivePurchaseCount(tenantId, sessionId)

  const displayName = sanitizeDisplayName(data.displayName)
  const productTitle =
    typeof data.productTitle === 'string' ? data.productTitle.trim().slice(0, 80) : 'un producto'

  const msgRef = db.collection(`mc_tenants/${tenantId}/live_sessions/${sessionId}/chat`).doc()
  await msgRef.set({
    id: msgRef.id,
    uid: request.auth?.uid ?? null,
    displayName,
    text: `compr? ${productTitle}`,
    type: 'purchase',
    createdAt: Date.now(),
  })

  return { ok: true }
})

const muxWebhookApp = express()
muxWebhookApp.use(express.json())

muxWebhookApp.post('/', async (req, res) => {
  try {
    const body = req.body as {
      type?: string
      data?: {
        passthrough?: string
        id?: string
        playback_ids?: { id?: string }[]
      }
    }

    const type = body.type ?? ''
    const passthrough = body.data?.passthrough?.trim() ?? ''
    const parsed = parseLivePassthrough(passthrough)
    if (!parsed) {
      res.status(200).send('ignored')
      return
    }

    const { tenantId, sessionId } = parsed

    if (type === 'video.live_stream.active') {
      await updateLiveStreamActive(tenantId, sessionId, true)
    } else if (type === 'video.live_stream.idle') {
      await updateLiveStreamActive(tenantId, sessionId, false)
    } else if (type === 'video.asset.ready') {
      const playbackId = body.data?.playback_ids?.[0]?.id
      const recordingUrl = playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined
      await updateLiveStreamActive(tenantId, sessionId, false, recordingUrl)
    }

    res.status(200).send('ok')
  } catch (e) {
    console.error('[mcLiveMuxWebhook]', e)
    res.status(500).send('error')
  }
})

export const mcLiveMuxWebhook = onRequest({ cors: false, invoker: 'public' }, muxWebhookApp)
