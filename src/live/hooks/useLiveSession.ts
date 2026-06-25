import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcLiveSessionsCollection } from '@/lib/mcCollections'
import type { McLiveSession } from '@/types/mc'

function mapLiveSession(id: string, data: Record<string, unknown>): McLiveSession {
  return {
    id,
    status: (data.status as McLiveSession['status']) ?? 'draft',
    title: String(data.title ?? 'Live'),
    hostUid: String(data.hostUid ?? ''),
    streamProvider: (data.streamProvider as McLiveSession['streamProvider']) ?? 'mock',
    streamId: String(data.streamId ?? ''),
    playbackUrl: String(data.playbackUrl ?? ''),
    ingestUrl: String(data.ingestUrl ?? ''),
    streamKey: String(data.streamKey ?? ''),
    featuredProductId:
      data.featuredProductId === null || data.featuredProductId === undefined
        ? null
        : String(data.featuredProductId),
    featuredAt: typeof data.featuredAt === 'number' ? data.featuredAt : null,
    viewerCount: typeof data.viewerCount === 'number' ? data.viewerCount : 0,
    purchaseCount: typeof data.purchaseCount === 'number' ? data.purchaseCount : 0,
    chatEnabled: data.chatEnabled !== false,
    shareUrl: String(data.shareUrl ?? ''),
    storeSlug: typeof data.storeSlug === 'string' ? data.storeSlug : undefined,
    streamActive: data.streamActive === true,
    ingestMode:
      data.ingestMode === 'browser' || data.ingestMode === 'obs'
        ? data.ingestMode
        : null,
    browserEgressId:
      data.browserEgressId === null || data.browserEgressId === undefined
        ? null
        : String(data.browserEgressId),
    recordingUrl: typeof data.recordingUrl === 'string' ? data.recordingUrl : undefined,
    startedAt: typeof data.startedAt === 'number' ? data.startedAt : undefined,
    endedAt: typeof data.endedAt === 'number' ? data.endedAt : undefined,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  }
}

export function useLiveSession(tenantId: string | undefined, sessionId: string | undefined) {
  const [session, setSession] = useState<McLiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId || !sessionId) {
      setSession(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const ref = doc(getDb(), mcLiveSessionsCollection(tenantId), sessionId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setSession(null)
          setError('Live no encontrado')
        } else {
          setSession(mapLiveSession(snap.id, snap.data() as Record<string, unknown>))
          setError(null)
        }
        setLoading(false)
      },
      (err) => {
        console.error('[useLiveSession]', err)
        setError('No se pudo cargar el live')
        setLoading(false)
      },
    )

    return () => unsub()
  }, [tenantId, sessionId])

  return { session, loading, error }
}
