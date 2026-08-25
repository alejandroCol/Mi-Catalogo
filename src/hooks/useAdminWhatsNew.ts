import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  ADMIN_WHATS_NEW_VERSION,
  adminWhatsNewForTenant,
  type AdminWhatsNewItem,
} from '@/lib/adminWhatsNew'
import type { McTenant } from '@/types/mc'

const STORAGE_KEY = 'mc-admin-whats-new-release'

type ReleaseSeen = {
  /** Última versión de release que el admin abrió. */
  version: string
}

function readReleaseSeen(): ReleaseSeen {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: '' }
    const parsed = JSON.parse(raw) as ReleaseSeen
    return { version: typeof parsed.version === 'string' ? parsed.version : '' }
  } catch {
    return { version: '' }
  }
}

function writeReleaseSeen(next: ReleaseSeen) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

let releaseSeenSnapshot = readReleaseSeen()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  for (const listener of listeners) listener()
}

export function useAdminWhatsNew(tenant: McTenant | null | undefined) {
  const releaseSeen = useSyncExternalStore(
    subscribe,
    () => releaseSeenSnapshot,
    () => releaseSeenSnapshot,
  )

  const items = useMemo(() => adminWhatsNewForTenant(tenant), [tenant])

  /** El acceso «Lo nuevo» permanece; solo el puntito depende de la versión. */
  const showChip = items.length > 0

  const hasUnreadRelease = releaseSeen.version !== ADMIN_WHATS_NEW_VERSION

  const markReleaseSeen = useCallback(() => {
    releaseSeenSnapshot = { version: ADMIN_WHATS_NEW_VERSION }
    writeReleaseSeen(releaseSeenSnapshot)
    emit()
  }, [])

  return {
    items,
    showChip,
    hasUnreadRelease,
    markReleaseSeen,
    releaseVersion: ADMIN_WHATS_NEW_VERSION,
  }
}

export type { AdminWhatsNewItem }
