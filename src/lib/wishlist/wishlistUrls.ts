import { buildStorePublicUrl } from '@/lib/storePublicUrl'

/** Ruta pública de la lista compartible (para amigos que compran). */
export function buildWishlistPath(wishlistId: string): string {
  return `/lista/${encodeURIComponent(wishlistId.trim())}`
}

/** URL absoluta para compartir con amigos. */
export function buildWishlistPublicUrl(slug: string, wishlistId: string): string {
  return buildStorePublicUrl(slug, buildWishlistPath(wishlistId))
}

/**
 * Ruta privada de administración (dueña de la lista).
 * Incluye el token `k` — no la compartas con amigos.
 */
export function buildWishlistManagePath(wishlistId: string, sessionToken: string): string {
  const q = new URLSearchParams({ k: sessionToken.trim() })
  return `/lista/${encodeURIComponent(wishlistId.trim())}/gestionar?${q.toString()}`
}

/** URL absoluta para administrar la lista en otro dispositivo. */
export function buildWishlistManageUrl(slug: string, wishlistId: string, sessionToken: string): string {
  return buildStorePublicUrl(slug, buildWishlistManagePath(wishlistId, sessionToken))
}

/** Deep-link de checkout regalando desde una lista. */
export function buildWishlistCheckoutPath(wishlistId: string): string {
  const q = new URLSearchParams({ w: wishlistId.trim() })
  return `/checkout?${q.toString()}`
}

export type ParsedWishlistLink = {
  wishlistId: string
  /** Presente si pegaron el link de administrar (`/gestionar?k=`). */
  sessionToken?: string
}

/**
 * Extrae id (y token de admin si viene) desde URL pública, de gestionar, o id crudo.
 */
export function parseWishlistLinkFromInput(raw: string): ParsedWishlistLink | null {
  const s = raw.trim()
  if (!s) return null

  const fromPath = (pathname: string, search: string): ParsedWishlistLink | null => {
    const manage = pathname.match(/\/lista\/([^/?#]+)\/gestionar\/?$/i)
    if (manage?.[1]) {
      const wishlistId = decodeURIComponent(manage[1]).trim()
      const k = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('k')?.trim()
      if (!wishlistId) return null
      return k && k.length >= 16 ? { wishlistId, sessionToken: k } : { wishlistId }
    }
    const pub = pathname.match(/\/lista\/([^/?#]+)\/?$/i)
    if (pub?.[1]) {
      const wishlistId = decodeURIComponent(pub[1]).trim()
      return wishlistId ? { wishlistId } : null
    }
    return null
  }

  try {
    const url = new URL(s)
    const parsed = fromPath(url.pathname, url.search)
    if (parsed) return parsed
  } catch {
    /* relative / raw */
  }

  const qIdx = s.indexOf('?')
  const pathPart = qIdx >= 0 ? s.slice(0, qIdx) : s
  const searchPart = qIdx >= 0 ? s.slice(qIdx) : ''
  const parsedRel = fromPath(pathPart, searchPart)
  if (parsedRel) return parsedRel

  if (/^[A-Za-z0-9_-]{8,128}$/.test(s)) return { wishlistId: s }
  return null
}

/** @deprecated prefer `parseWishlistLinkFromInput` */
export function parseWishlistIdFromInput(raw: string): string | null {
  return parseWishlistLinkFromInput(raw)?.wishlistId ?? null
}
