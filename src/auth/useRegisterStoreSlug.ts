import { useEffect, useState } from 'react'
import type { Firestore } from 'firebase/firestore'
import {
  formatPublicSlugHostPreview,
  probePublicSlugAvailability,
  slugifyStoreName,
  type PublicSlugAvailabilityStatus,
  type PublicSlugValidationIssue,
} from '@/lib/publicSlug'

const SLUG_PROBE_DEBOUNCE_MS = 320

type SlugProbeState = {
  status: PublicSlugAvailabilityStatus
  issue?: PublicSlugValidationIssue
}

const idleProbe: SlugProbeState = { status: 'idle' }

function useDebouncedSlugProbe(db: Firestore | null, rawSlug: string, enabled: boolean) {
  const [probe, setProbe] = useState<SlugProbeState>(idleProbe)

  useEffect(() => {
    if (!enabled || !db) {
      setProbe(idleProbe)
      return
    }

    const trimmed = rawSlug.trim()
    if (trimmed.length < 3) {
      setProbe({ status: 'invalid', issue: 'too_short' })
      return
    }

    let cancelled = false
    setProbe({ status: 'checking' })

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await probePublicSlugAvailability(db, trimmed)
          if (cancelled) return
          setProbe({ status: result.status, issue: result.issue })
        } catch {
          if (!cancelled) setProbe(idleProbe)
        }
      })()
    }, SLUG_PROBE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [db, rawSlug, enabled])

  return probe
}

export type RegisterStoreSlugState = {
  slugFromName: string
  needsCustomSlug: boolean
  customSlugInput: string
  setCustomSlugInput: (value: string) => void
  effectiveSlug: string
  autoSlugProbe: SlugProbeState
  customSlugProbe: SlugProbeState
  effectiveProbe: SlugProbeState
  storeUrlPreview: string
}

export function useRegisterStoreSlug(
  db: Firestore | null,
  nombreTienda: string,
): RegisterStoreSlugState {
  const slugFromName = slugifyStoreName(nombreTienda)
  const [customSlugInput, setCustomSlugInput] = useState('')

  const autoSlugProbe = useDebouncedSlugProbe(
    db,
    slugFromName,
    slugFromName.length >= 3,
  )

  const needsCustomSlug = autoSlugProbe.status === 'taken' || autoSlugProbe.status === 'reserved'

  useEffect(() => {
    if (!needsCustomSlug) {
      setCustomSlugInput('')
    }
  }, [needsCustomSlug, slugFromName])

  const customSlugProbe = useDebouncedSlugProbe(
    db,
    customSlugInput,
    needsCustomSlug && customSlugInput.trim().length > 0,
  )

  const effectiveSlug = needsCustomSlug ? customSlugInput : slugFromName
  const effectiveProbe = needsCustomSlug ? customSlugProbe : autoSlugProbe

  const previewBase =
    effectiveProbe.status === 'available'
      ? slugifyStoreName(needsCustomSlug ? customSlugInput : slugFromName)
      : slugFromName

  const storeUrlPreview =
    previewBase.length >= 3 ? formatPublicSlugHostPreview(previewBase) : ''

  return {
    slugFromName,
    needsCustomSlug,
    customSlugInput,
    setCustomSlugInput,
    effectiveSlug,
    autoSlugProbe,
    customSlugProbe,
    effectiveProbe,
    storeUrlPreview,
  }
}
