const PREFIX = 'mc_fav_'

export function favoritesStorageKey(slug: string): string {
  return `${PREFIX}${slug.trim().toLowerCase()}`
}

export function loadFavoriteIds(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0).slice(0, 200)
  } catch {
    return []
  }
}

export function saveFavoriteIds(storageKey: string, ids: string[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(ids.slice(0, 200)))
  } catch {
    /* ignore quota */
  }
}

export function toggleFavoriteId(ids: string[], productId: string): string[] {
  if (ids.includes(productId)) return ids.filter((id) => id !== productId)
  return [productId, ...ids].slice(0, 200)
}
