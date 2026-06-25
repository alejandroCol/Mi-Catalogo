import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcLiveSessionsCollection } from '@/lib/mcCollections'
import type { McLiveSession } from '@/types/mc'

function mapSession(id: string, data: Record<string, unknown>): McLiveSession {
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

export function useLiveSessionsList(tenantId: string | undefined) {
  const [sessions, setSessions] = useState<McLiveSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setSessions([])
      setLoading(false)
      return
    }

    const q = query(
      collection(getDb(), mcLiveSessionsCollection(tenantId)),
      orderBy('updatedAt', 'desc'),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setSessions(snap.docs.map((d) => mapSession(d.id, d.data() as Record<string, unknown>)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return () => unsub()
  }, [tenantId])

  return { sessions, loading }
}
