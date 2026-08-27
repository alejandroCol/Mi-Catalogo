const KEY_PREFIX = 'mc:brand-logo:'

type CachedBrand = {
  url: string
  round: boolean
}

function write(slug: string, value: string | null) {
  try {
    if (value) sessionStorage.setItem(KEY_PREFIX + slug, value)
    else sessionStorage.removeItem(KEY_PREFIX + slug)
  } catch {
    /* private mode / quota */
  }
}

function readRaw(slug: string): string | null {
  try {
    return sessionStorage.getItem(KEY_PREFIX + slug)
  } catch {
    return null
  }
}

function parseCached(raw: string | null): CachedBrand | null {
  if (!raw) return null
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { url?: unknown; round?: unknown }
      const url = typeof parsed.url === 'string' ? parsed.url.trim() : ''
      if (!url) return null
      return { url, round: parsed.round !== false }
    } catch {
      return null
    }
  }
  return { url: raw, round: true }
}

export function cacheCatalogBrandLogo(
  slug: string | null | undefined,
  url: string | null | undefined,
  round?: boolean,
) {
  if (!slug || typeof sessionStorage === 'undefined') return
  const trimmed = url?.trim()
  if (!trimmed) {
    write(slug, null)
    return
  }
  write(slug, JSON.stringify({ url: trimmed, round: round !== false } satisfies CachedBrand))
}

export function readCachedCatalogBrandLogo(slug: string | null | undefined): string | null {
  if (!slug || typeof sessionStorage === 'undefined') return null
  return parseCached(readRaw(slug))?.url ?? null
}

export function readCachedCatalogBrandRound(slug: string | null | undefined): boolean | null {
  if (!slug || typeof sessionStorage === 'undefined') return null
  const cached = parseCached(readRaw(slug))
  if (!cached) return null
  return cached.round
}
