import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

function fn<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFirebaseFunctions(), name)
}

export type LiveCreateSessionResult = {
  sessionId: string
  shareUrl: string
  ingestUrl: string
  streamKey: string
  playbackUrl: string
}

export async function liveCreateSession(title: string, productIds: string[]) {
  const res = await fn<{ title: string; productIds: string[] }, LiveCreateSessionResult>(
    'mcLiveCreateSession',
  )({ title, productIds })
  return res.data
}

export async function liveUpdateProducts(sessionId: string, productIds: string[]) {
  await fn<{ sessionId: string; productIds: string[] }, { ok: boolean }>('mcLiveUpdateProducts')({
    sessionId,
    productIds,
  })
}

export async function liveStartSession(sessionId: string) {
  await fn<{ sessionId: string }, { ok: boolean }>('mcLiveStartSession')({ sessionId })
}

export async function liveEndSession(sessionId: string) {
  await fn<{ sessionId: string }, { ok: boolean }>('mcLiveEndSession')({ sessionId })
}

export async function livePinProduct(sessionId: string, productId: string | null) {
  await fn<{ sessionId: string; productId: string | null }, { ok: boolean }>('mcLivePinProduct')({
    sessionId,
    productId,
  })
}

export async function liveSendChat(slug: string, sessionId: string, displayName: string, text: string) {
  await fn<
    { slug: string; sessionId: string; displayName: string; text: string },
    { ok: boolean; messageId: string }
  >('mcLiveSendChat')({ slug, sessionId, displayName, text })
}

export async function liveJoinViewer(slug: string, sessionId: string, viewerSessionId: string) {
  await fn<
    { slug: string; sessionId: string; viewerSessionId: string },
    { ok: boolean }
  >('mcLiveJoinViewer')({ slug, sessionId, viewerSessionId })
}

export type BrowserBroadcastRoomCredentials = {
  livekitUrl: string
  token: string
  roomName: string
}

/** @deprecated Use BrowserBroadcastRoomCredentials */
export type BrowserBroadcastCredentials = BrowserBroadcastRoomCredentials & {
  egressId?: string
}

export async function liveGetBrowserBroadcastConfig() {
  const res = await fn<Record<string, never>, { available: boolean }>(
    'mcLiveGetBrowserBroadcastConfig',
  )({})
  return res.data
}

/** Crea sala LiveKit y devuelve token (conectá antes de iniciar egress). */
export async function livePrepareBrowserBroadcast(sessionId: string) {
  const res = await fn<{ sessionId: string }, BrowserBroadcastRoomCredentials>(
    'mcLiveStartBrowserBroadcast',
  )({ sessionId })
  return res.data
}

/** Envía la señal de la sala a Mux vía RTMP (llamar después de conectar cámara). */
export async function liveStartBrowserBroadcastEgress(sessionId: string) {
  const res = await fn<{ sessionId: string }, { egressId: string }>(
    'mcLiveStartBrowserBroadcastEgress',
  )({ sessionId })
  return res.data
}

/** @deprecated Usar livePrepareBrowserBroadcast + liveStartBrowserBroadcastEgress */
export async function liveStartBrowserBroadcast(sessionId: string) {
  return livePrepareBrowserBroadcast(sessionId)
}

export async function liveRecordPurchase(
  slug: string,
  sessionId: string,
  productTitle: string,
  displayName: string,
) {
  await fn<
    { slug: string; sessionId: string; productTitle: string; displayName: string },
    { ok: boolean }
  >('mcLiveRecordPurchase')({ slug, sessionId, productTitle, displayName })
}
