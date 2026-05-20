const SESSION_PREFIX = 'mc_carrito_session_'
const CART_ID_PREFIX = 'mc_carrito_id_'

function randomToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
}

/** Token anónimo estable por catálogo (navegador). */
export function getOrCreateCarritoSessionToken(slug: string): string {
  const key = `${SESSION_PREFIX}${slug}`
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

export function getStoredCarritoIniciadoId(slug: string): string | null {
  try {
    const v = localStorage.getItem(`${CART_ID_PREFIX}${slug}`)
    return v && v.length > 0 ? v : null
  } catch {
    return null
  }
}

export function setStoredCarritoIniciadoId(slug: string, carritoId: string) {
  try {
    localStorage.setItem(`${CART_ID_PREFIX}${slug}`, carritoId)
  } catch {
    /* ignore */
  }
}

export function clearStoredCarritoIniciadoId(slug: string) {
  try {
    localStorage.removeItem(`${CART_ID_PREFIX}${slug}`)
  } catch {
    /* ignore */
  }
}
