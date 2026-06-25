import { getAuthApp } from '@/lib/firebase'
import { liveEndSession } from '@/live/lib/liveApi'

/** Gracia antes de terminar el live si el host se desconecta sin cerrar la pestaña. */
export const LIVE_HOST_DISCONNECT_GRACE_MS = 30_000

export type LiveHostLeaveReason = 'tab_close' | 'host_left' | 'disconnect_timeout'

function hostDisconnectUrl(): string | null {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined
  if (!projectId?.trim()) return null
  const region =
    (import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION as string | undefined)?.trim() || 'us-central1'
  return `https://${region}-${projectId}.cloudfunctions.net/mcLiveHostDisconnect`
}

/** Cierre confiable al cerrar pestaña (fetch keepalive). */
export function liveEndSessionKeepalive(
  sessionId: string,
  idToken: string,
  reason: LiveHostLeaveReason,
): void {
  const url = hostDisconnectUrl()
  if (!url || !idToken.trim()) return
  try {
    void fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ sessionId, reason }),
      keepalive: true,
    })
  } catch {
    /* ignore — best effort on page hide */
  }
}

/** Termina el live por salida del host (callable, con fallback keepalive). */
export async function liveEndSessionOnHostLeave(
  sessionId: string,
  reason: LiveHostLeaveReason,
): Promise<void> {
  try {
    await liveEndSession(sessionId)
  } catch {
    const token = await getAuthApp().currentUser?.getIdToken()
    if (token) liveEndSessionKeepalive(sessionId, token, reason)
  }
}
