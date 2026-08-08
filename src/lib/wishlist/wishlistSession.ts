const SESSION_PREFIX = 'mc_wishlist_session_'
const LIST_ID_PREFIX = 'mc_wishlist_id_'

function randomToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
}

/** Token anónimo del editor de la lista (por tienda / navegador). */
export function getOrCreateWishlistSessionToken(slug: string): string {
  const key = `${SESSION_PREFIX}${slug.trim().toLowerCase()}`
  try {
    const existing = localStorage.getItem(key)
    if (existing && existing.length >= 16) return existing
    const next = randomToken()
    localStorage.setItem(key, next)
    return next
  } catch {
    return randomToken()
  }
}

/** Restaura el token de administración (p. ej. desde link `/gestionar?k=`). */
export function setWishlistSessionToken(slug: string, sessionToken: string) {
  const token = sessionToken.trim()
  if (token.length < 16) return
  try {
    localStorage.setItem(`${SESSION_PREFIX}${slug.trim().toLowerCase()}`, token)
  } catch {
    /* ignore */
  }
}

export function getWishlistSessionToken(slug: string): string | null {
  try {
    const v = localStorage.getItem(`${SESSION_PREFIX}${slug.trim().toLowerCase()}`)
    return v && v.length >= 16 ? v : null
  } catch {
    return null
  }
}

export function getStoredWishlistId(slug: string): string | null {
  try {
    const v = localStorage.getItem(`${LIST_ID_PREFIX}${slug.trim().toLowerCase()}`)
    return v && v.length > 0 ? v : null
  } catch {
    return null
  }
}

export function setStoredWishlistId(slug: string, wishlistId: string) {
  try {
    localStorage.setItem(`${LIST_ID_PREFIX}${slug.trim().toLowerCase()}`, wishlistId)
  } catch {
    /* ignore */
  }
}

export function clearStoredWishlistId(slug: string) {
  try {
    localStorage.removeItem(`${LIST_ID_PREFIX}${slug.trim().toLowerCase()}`)
  } catch {
    /* ignore */
  }
}
