/** SEO canónico del sitio público (landing / marketing). */

export const MC_SITE_ORIGIN = 'https://micatalogo.io' as const
export const MC_SITE_NAME = 'Mi Catálogo' as const

export const MC_SEO = {
  home: {
    title: 'Mi Catálogo — Crear tienda virtual en Colombia',
    description:
      'Crea tu tienda virtual en minutos: catálogo online, ventas por WhatsApp y POS integrado. Registro gratis, sin tarjeta. Para emprendedores en Colombia.',
    path: '/',
    ogImagePath: '/brand/og-image.png',
  },
  faq: {
    title: 'Preguntas frecuentes — Mi Catálogo',
    description:
      'Planes, productos, personalización, pasarela OnePay y WhatsApp. Respuestas claras para crear tu tienda en Mi Catálogo.',
    path: '/preguntas-frecuentes',
    ogImagePath: '/brand/og-image.png',
  },
  pos: {
    title: 'Mi Catálogo POS — Punto de venta para tu negocio',
    description:
      'Punto de venta con inventario, cajas y reportes. Ideal si ya vendés en local y querés unificar con tu catálogo online.',
    path: '/pos',
    ogImagePath: '/brand/og-image.png',
  },
} as const

export type McSeoPageKey = keyof typeof MC_SEO

export function mcAbsoluteUrl(path: string): string {
  if (path.startsWith('http')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${MC_SITE_ORIGIN}${normalized === '/' ? '/' : normalized}`
}

function setMeta(selector: string, attr: string, value: string) {
  const el = document.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

function ensureMeta(propertyOrName: { property?: string; name?: string }, content: string) {
  const attr = propertyOrName.property ? 'property' : 'name'
  const key = propertyOrName.property ?? propertyOrName.name ?? ''
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** SEO genérico (landing o tienda) con URL/imagen absolutas ya resueltas. */
export function applyMcPageSeoLike(page: {
  title: string
  description: string
  canonicalUrl: string
  imageUrl?: string
  ogType?: string
}) {
  document.title = page.title
  setMeta('meta[name="description"]', 'content', page.description)
  ensureMeta({ property: 'og:title' }, page.title)
  ensureMeta({ property: 'og:description' }, page.description)
  ensureMeta({ property: 'og:url' }, page.canonicalUrl)
  ensureMeta({ property: 'og:type' }, page.ogType ?? 'website')
  if (page.imageUrl) {
    ensureMeta({ property: 'og:image' }, page.imageUrl)
    ensureMeta({ name: 'twitter:image' }, page.imageUrl)
  }
  ensureMeta({ name: 'twitter:title' }, page.title)
  ensureMeta({ name: 'twitter:description' }, page.description)
  ensureMeta({ name: 'twitter:card' }, page.imageUrl ? 'summary_large_image' : 'summary')

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = page.canonicalUrl
}

export function applyMcPageSeo(page: (typeof MC_SEO)[McSeoPageKey]) {
  applyMcPageSeoLike({
    title: page.title,
    description: page.description,
    canonicalUrl: mcAbsoluteUrl(page.path),
    imageUrl: mcAbsoluteUrl(page.ogImagePath),
    ogType: 'website',
  })
}

export function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  let script = document.getElementById(id) as HTMLScriptElement | null
  if (!script) {
    script = document.createElement('script')
    script.id = id
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(data)
}

export function removeJsonLd(id: string) {
  document.getElementById(id)?.remove()
}
