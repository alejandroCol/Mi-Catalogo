import { mcPublicOriginForAuthEmails } from '@/lib/mcSiteEmail'

/** Host raíz de la plataforma (sin subdominio de tienda). */
export const MC_PLATFORM_HOST_FALLBACK = 'micatalogo.io'

/** Subdominios reservados para infraestructura de la plataforma. */
export const MC_RESERVED_STORE_SLUGS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'mail',
  'smtp',
  'cdn',
  'static',
  'assets',
  'staging',
  'dev',
  'test',
  'beta',
  'demo',
  'help',
  'support',
  'status',
  'blog',
  'docs',
  'faq',
  'preguntas-frecuentes',
  'superadmin',
  'vendedor',
  'login',
  'registro',
  'firebase',
  'auth',
  'ftp',
  'ns',
  'mx',
  'c',
])

export type McStoreUrlMode = 'subdomain' | 'path'
export type McAppSurface = 'platform' | 'store'

function normalizeLeadingSlash(path: string): string {
  if (!path || path === '/') return '/'
  return path.startsWith('/') ? path : `/${path}`
}

export function isReservedStoreSlug(slug: string): boolean {
  return MC_RESERVED_STORE_SLUGS.has(slug.trim().toLowerCase())
}

export function mcPlatformPublicHost(): string {
  const envHost = import.meta.env.VITE_MC_PLATFORM_HOST as string | undefined
  const trimmedHost = envHost?.trim().toLowerCase().replace(/^www\./, '')
  if (trimmedHost && !trimmedHost.includes('/')) {
    return trimmedHost
  }
  try {
    const origin = mcPublicOriginForAuthEmails()
    return new URL(origin).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return MC_PLATFORM_HOST_FALLBACK
  }
}

export function mcStoreUrlMode(): McStoreUrlMode {
  const env = import.meta.env.VITE_MC_STORE_URL_MODE as string | undefined
  if (env === 'path' || env === 'subdomain') return env
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1') return 'path'
  }
  return 'subdomain'
}

export function parseStoreSlugFromHostname(
  hostname: string,
  platformHost = mcPlatformPublicHost(),
): string | null {
  const host = hostname.trim().toLowerCase()
  const platform = platformHost.trim().toLowerCase().replace(/^www\./, '')

  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length)
    if (!sub || sub.includes('.')) return null
    if (!/^[a-z0-9-]{2,80}$/.test(sub) || isReservedStoreSlug(sub)) return null
    return sub
  }

  if (host === platform || host === `www.${platform}`) return null
  if (!host.endsWith(`.${platform}`)) return null

  const sub = host.slice(0, -(platform.length + 1))
  if (!sub || sub.includes('.')) return null
  if (!/^[a-z0-9-]{2,80}$/.test(sub) || isReservedStoreSlug(sub)) return null
  return sub
}

export function resolveAppSurface(hostname?: string): McAppSurface {
  const host =
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : mcPlatformPublicHost())
  return parseStoreSlugFromHostname(host) ? 'store' : 'platform'
}

export function isStoreOriginForSlug(origin: string, slug: string): boolean {
  try {
    const parsed = new URL(origin)
    return parseStoreSlugFromHostname(parsed.hostname) === slug.trim().toLowerCase()
  } catch {
    return false
  }
}

function platformPublicOrigin(): string {
  if (typeof window !== 'undefined' && resolveAppSurface() === 'platform') {
    return window.location.origin.replace(/\/$/, '')
  }
  return mcPublicOriginForAuthEmails().replace(/\/$/, '')
}

/** Origen absoluto del catálogo público de una tienda. */
export function buildStoreOrigin(slug: string, mode: McStoreUrlMode = mcStoreUrlMode()): string {
  const normalizedSlug = slug.trim().toLowerCase()
  if (mode === 'path') {
    return `${platformPublicOrigin()}/c/${encodeURIComponent(normalizedSlug)}`
  }
  const protocol =
    typeof window !== 'undefined' ? window.location.protocol.replace(/:$/, '') : 'https'
  return `${protocol}://${normalizedSlug}.${mcPlatformPublicHost()}`
}

/** URL absoluta pública de la tienda (emails, compartir, preview externo). */
export function buildStorePublicUrl(slug: string, path = '/', mode?: McStoreUrlMode): string {
  const normalizedPath = normalizeLeadingSlash(path)
  const origin = buildStoreOrigin(slug, mode).replace(/\/$/, '')
  if (normalizedPath === '/') return origin
  return `${origin}${normalizedPath}`
}

/** Ruta interna para React Router dentro del catálogo (respeta subdominio vs path). */
export function buildStorePublicPath(
  slug: string,
  path = '/',
  opts?: { surface?: McAppSurface; mode?: McStoreUrlMode },
): string {
  const normalizedPath = normalizeLeadingSlash(path)
  const mode = opts?.mode ?? mcStoreUrlMode()
  const surface = opts?.surface ?? resolveAppSurface()

  if (mode === 'subdomain' && surface === 'store') {
    return normalizedPath
  }

  const prefix = `/c/${encodeURIComponent(slug.trim().toLowerCase())}`
  if (normalizedPath === '/') return prefix
  return `${prefix}${normalizedPath}`
}

/** URL legada path-based (redirects desde /c/:slug). */
export function buildLegacyCatalogPath(slug: string, path = '/'): string {
  const normalizedPath = normalizeLeadingSlash(path)
  const prefix = `/c/${encodeURIComponent(slug.trim().toLowerCase())}`
  if (normalizedPath === '/') return prefix
  return `${prefix}${normalizedPath}`
}

/** Hostname de preview para registro (sin protocolo). */
export function formatStorePublicHostPreview(slug: string, mode: McStoreUrlMode = mcStoreUrlMode()): string {
  if (mode === 'path') {
    try {
      return new URL(platformPublicOrigin()).host
    } catch {
      return MC_PLATFORM_HOST_FALLBACK
    }
  }
  return `${slug.trim().toLowerCase()}.${mcPlatformPublicHost()}`
}

/** Etiqueta legible de la URL pública (registro, cuenta, superadmin). */
export function formatStorePublicUrlLabel(slug: string, mode: McStoreUrlMode = mcStoreUrlMode()): string {
  if (mode === 'path') {
    return `${formatStorePublicHostPreview(slug, mode)}/c/${slug.trim().toLowerCase()}`
  }
  return formatStorePublicHostPreview(slug, mode)
}
