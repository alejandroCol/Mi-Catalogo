import { onRequest } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import { db } from '../firebaseAdmin.js'
import { buildStorePublicUrl } from '../storePublicUrl.js'
import { productoPrecioVentaFromData } from '../productoDescuento.js'

const mcPublicOrigin = defineString('MC_PUBLIC_ORIGIN', { default: 'https://micatalogo.io' })

const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Discordbot|SkypeUriPreview|Slackbot|Pinterest|Googlebot|bingbot|Applebot|Embed/i

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatCopLabel(n: number): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `$${n}`
  }
}

function isBot(ua: string): boolean {
  return BOT_RE.test(ua)
}

/** Preview OG para compartir productos (bots) + redirect a humanos. */
export const mcCatalogSharePreview = onRequest({ invoker: 'public' }, async (req, res) => {
  const path = (req.path || '').replace(/^\/+/, '')
  // Esperado: share/:slug/p/:productId  (Hosting puede pasar path completo o relativo)
  const parts = path.split('/').filter(Boolean)
  let slug = ''
  let productId = ''
  const shareIdx = parts.indexOf('share')
  if (shareIdx >= 0 && parts[shareIdx + 1] && parts[shareIdx + 2] === 'p' && parts[shareIdx + 3]) {
    slug = decodeURIComponent(parts[shareIdx + 1]!).toLowerCase()
    productId = decodeURIComponent(parts[shareIdx + 3]!)
  } else if (parts[0] && parts[1] === 'p' && parts[2]) {
    slug = decodeURIComponent(parts[0]!).toLowerCase()
    productId = decodeURIComponent(parts[2]!)
  }

  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug) || !productId || productId.length > 128) {
    res.status(404).type('html').send('<!doctype html><title>No encontrado</title><p>Enlace inválido.</p>')
    return
  }

  const platformOrigin = mcPublicOrigin.value()
  const storeUrl = buildStorePublicUrl(platformOrigin, slug, `/p/${productId}`)
  const ua = String(req.get('user-agent') || '')

  if (!isBot(ua)) {
    res.redirect(302, storeUrl)
    return
  }

  const slugSnap = await db.doc(`mc_slugs/${slug}`).get()
  if (!slugSnap.exists) {
    res.status(404).type('html').send('<!doctype html><title>No encontrado</title><p>Tienda no encontrada.</p>')
    return
  }
  const tenantId = (slugSnap.data() as { tenantId: string }).tenantId
  const [tenantSnap, productSnap] = await Promise.all([
    db.doc(`mc_tenants/${tenantId}`).get(),
    db.doc(`mc_tenants/${tenantId}/productos/${productId}`).get(),
  ])

  const tenant = (tenantSnap.data() || {}) as {
    nombreTienda?: string
    storeLogoUrl?: string
    catalogoPublicado?: boolean
  }
  const nombreTienda = (tenant.nombreTienda || 'Tienda').trim() || 'Tienda'

  if (!productSnap.exists) {
    res.status(404).type('html').send('<!doctype html><title>No encontrado</title><p>Producto no encontrado.</p>')
    return
  }

  const prod = productSnap.data() as {
    activo?: boolean
    enCatalogo?: boolean
    nombre?: string
    descripcion?: string
    imageUrl?: string
    galeriaImagenes?: string[]
    precioCop?: number
    descuentoActivo?: boolean
    descuentoTipo?: 'porcentaje' | 'monto_fijo'
    descuentoValor?: number
  }
  if (prod.activo !== true || prod.enCatalogo !== true) {
    res.status(404).type('html').send('<!doctype html><title>No disponible</title><p>Producto no disponible.</p>')
    return
  }

  const productName = String(prod.nombre || 'Producto').trim().slice(0, 120)
  const descRaw = typeof prod.descripcion === 'string' ? prod.descripcion.trim() : ''
  const price = productoPrecioVentaFromData(prod)
  const priceLabel = price > 0 ? ` · ${formatCopLabel(price)}` : ''
  const title = `${productName}${priceLabel} · ${nombreTienda}`
  const description =
    descRaw.slice(0, 180) ||
    `${productName} en ${nombreTienda}${priceLabel}. Comprá en línea.`
  const image =
    (typeof prod.imageUrl === 'string' && prod.imageUrl) ||
    (Array.isArray(prod.galeriaImagenes) && typeof prod.galeriaImagenes[0] === 'string'
      ? prod.galeriaImagenes[0]
      : '') ||
    (typeof tenant.storeLogoUrl === 'string' ? tenant.storeLogoUrl : '')

  const shareCanonical = `${platformOrigin.replace(/\/$/, '')}/share/${encodeURIComponent(slug)}/p/${encodeURIComponent(productId)}`

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<meta property="og:type" content="product"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:url" content="${escapeHtml(shareCanonical)}"/>
${image ? `<meta property="og:image" content="${escapeHtml(image)}"/>` : ''}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escapeHtml(title)}"/>
<meta name="twitter:description" content="${escapeHtml(description)}"/>
${image ? `<meta name="twitter:image" content="${escapeHtml(image)}"/>` : ''}
<link rel="canonical" href="${escapeHtml(storeUrl)}"/>
<meta http-equiv="refresh" content="0;url=${escapeHtml(storeUrl)}"/>
</head>
<body>
<p><a href="${escapeHtml(storeUrl)}">Ver ${escapeHtml(productName)} en ${escapeHtml(nombreTienda)}</a></p>
</body>
</html>`

  res
    .status(200)
    .set('Cache-Control', 'public, max-age=300')
    .type('html')
    .send(html)
})
