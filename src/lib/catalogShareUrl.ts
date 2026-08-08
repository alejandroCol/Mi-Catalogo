import { mcPublicOriginForAuthEmails } from '@/lib/mcSiteEmail'

/** URL de preview OG (bots) → redirige humanos a la tienda. */
export function buildCatalogProductShareUrl(slug: string, productId: string): string {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.localhost'))
  const origin = isLocal
    ? window.location.origin.replace(/\/$/, '')
    : mcPublicOriginForAuthEmails().replace(/\/$/, '')
  const s = encodeURIComponent(slug.trim().toLowerCase())
  const p = encodeURIComponent(productId.trim())
  return `${origin}/share/${s}/p/${p}`
}
