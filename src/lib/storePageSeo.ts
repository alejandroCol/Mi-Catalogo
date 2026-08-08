/** SEO dinámico de tienda pública (pestaña + OG/Twitter para crawlers vía /share). */

import { applyMcPageSeoLike, removeJsonLd, upsertJsonLd } from '@/seo/mcSeo'
import { formatCop } from '@/lib/formatCop'

export function applyStoreHomeSeo(opts: {
  nombreTienda: string
  descripcion?: string
  imageUrl?: string
  canonicalUrl: string
  logoUrl?: string
}) {
  const title = opts.nombreTienda
  const description =
    opts.descripcion?.trim() ||
    `Catálogo online de ${opts.nombreTienda}. Comprá en línea con envío a todo Colombia.`
  const image = opts.imageUrl?.trim() || opts.logoUrl?.trim() || ''

  applyMcPageSeoLike({
    title,
    description,
    canonicalUrl: opts.canonicalUrl,
    imageUrl: image || undefined,
    ogType: 'website',
  })

  upsertJsonLd('mc-store-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: opts.nombreTienda,
    url: opts.canonicalUrl,
    ...(image ? { image } : {}),
    description,
  })
}

export function applyStoreProductSeo(opts: {
  nombreTienda: string
  productName: string
  description?: string
  imageUrl?: string
  priceCop?: number
  canonicalUrl: string
  availability?: 'InStock' | 'OutOfStock'
}) {
  const priceLabel =
    opts.priceCop != null && opts.priceCop > 0 ? ` · ${formatCop(opts.priceCop)}` : ''
  const title = `${opts.productName}${priceLabel} · ${opts.nombreTienda}`
  const description =
    opts.description?.trim() ||
    `${opts.productName} en ${opts.nombreTienda}${priceLabel}. Envíos a Colombia.`

  applyMcPageSeoLike({
    title,
    description,
    canonicalUrl: opts.canonicalUrl,
    imageUrl: opts.imageUrl,
    ogType: 'product',
  })

  upsertJsonLd('mc-product-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.productName,
    description,
    ...(opts.imageUrl ? { image: [opts.imageUrl] } : {}),
    brand: { '@type': 'Brand', name: opts.nombreTienda },
    offers: {
      '@type': 'Offer',
      url: opts.canonicalUrl,
      priceCurrency: 'COP',
      ...(opts.priceCop != null ? { price: String(opts.priceCop) } : {}),
      availability: `https://schema.org/${opts.availability ?? 'InStock'}`,
    },
  })
}

export function clearStoreProductSeo() {
  removeJsonLd('mc-product-jsonld')
}

export function clearStoreHomeSeo() {
  removeJsonLd('mc-store-jsonld')
}
