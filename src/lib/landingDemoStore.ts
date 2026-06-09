import type { McPlatformSettings } from '@/types/mc'

export type LandingDemoStoreConfig = {
  slug: string
  displayName: string
}

/** Resuelve la tienda demo configurada para la landing (público, sin auth). */
export function getLandingDemoStore(
  settings: McPlatformSettings | null | undefined,
): LandingDemoStoreConfig | null {
  const slug = settings?.landingDemoSlug?.trim().toLowerCase()
  if (!slug) return null
  const displayName = settings?.landingDemoDisplayName?.trim() || 'Tienda demo'
  return { slug, displayName }
}
