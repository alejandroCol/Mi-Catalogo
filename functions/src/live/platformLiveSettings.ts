import { db } from '../firebaseAdmin.js'
import { mcMuxLiveTest } from './getStreamProvider.js'

function flagEnabled(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

/** Fallback cuando `muxLiveTestEnabled` no está definido en Firestore. */
export function muxTestModeFromEnv(): boolean {
  return flagEnabled(mcMuxLiveTest.value())
}

/**
 * Modo test Mux para nuevos live streams.
 * Firestore (`mc_platform/settings.muxLiveTestEnabled`) tiene prioridad sobre `MC_MUX_LIVE_TEST`.
 */
export async function fetchMuxLiveTestMode(): Promise<boolean> {
  try {
    const snap = await db.doc('mc_platform/settings').get()
    const enabled = snap.data()?.muxLiveTestEnabled
    if (typeof enabled === 'boolean') return enabled
  } catch (err) {
    console.warn('[live] fetchMuxLiveTestMode failed, using env fallback', err)
  }
  return muxTestModeFromEnv()
}
