import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcLiveChatCollection } from '@/lib/mcCollections'
import type { McLiveChatMessage } from '@/types/mc'

const CHAT_LIMIT = 80

function mapChatMessage(id: string, data: Record<string, unknown>): McLiveChatMessage {
  return {
    id,
    uid: data.uid === null || data.uid === undefined ? null : String(data.uid),
    displayName: String(data.displayName ?? 'Visitante'),
    text: String(data.text ?? ''),
    type: (data.type as McLiveChatMessage['type']) ?? 'message',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  }
}

export function useLiveChat(
  tenantId: string | undefined,
  sessionId: string | undefined,
  enabled: boolean,
) {
  const [messages, setMessages] = useState<McLiveChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId || !sessionId || !enabled) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(
      collection(getDb(), mcLiveChatCollection(tenantId, sessionId)),
      orderBy('createdAt', 'asc'),
      limit(CHAT_LIMIT),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => mapChatMessage(d.id, d.data() as Record<string, unknown>)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return () => unsub()
  }, [tenantId, sessionId, enabled])

  return { messages, loading }
}

export function getLiveViewerDisplayName(): string {
  const key = 'mc_live_display_name'
  try {
    const stored = localStorage.getItem(key)?.trim()
    if (stored) return stored.slice(0, 40)
    const generated = `Visitante${Math.floor(100 + Math.random() * 900)}`
    localStorage.setItem(key, generated)
    return generated
  } catch {
    return 'Visitante'
  }
}

export function getLiveViewerSessionId(sessionId: string): string {
  const key = `mc_live_viewer_${sessionId}`
  try {
    const stored = sessionStorage.getItem(key)?.trim()
    if (stored) return stored
    const id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(key, id)
    return id
  } catch {
    return `v_${Date.now()}`
  }
}
