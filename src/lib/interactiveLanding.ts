import { hasInteractiveLandingAccess } from '@/lib/billingAccess'
import type { McInteractiveLanding, McInteractiveLandingMood, McProducto, McTenant } from '@/types/mc'

export const INTERACTIVE_LANDING_LIMITS = {
  minProducts: 3,
  maxProducts: 8,
} as const

export const INTERACTIVE_LANDING_MOODS: {
  id: McInteractiveLandingMood
  label: string
  description: string
  swatch: string
  lite: boolean
}[] = [
  { id: 'mist', label: 'Niebla', description: 'Gris perla, muy claro', swatch: 'linear-gradient(135deg,#f4f2f0,#e4e0db)', lite: true },
  { id: 'blush', label: 'Blush', description: 'Rosa pastel', swatch: 'linear-gradient(135deg,#fbe8ee,#f3d4dc)', lite: true },
  { id: 'sage', label: 'Sage', description: 'Verde menta suave', swatch: 'linear-gradient(135deg,#e7f0e8,#d3e4d6)', lite: true },
  { id: 'cream', label: 'Crema', description: 'Marfil cálido', swatch: 'linear-gradient(135deg,#f7f0e4,#efe2cc)', lite: true },
  { id: 'midnight', label: 'Midnight', description: 'Carbón, glow cian', swatch: 'linear-gradient(135deg,#1c1430,#07080c)', lite: false },
  { id: 'atelier', label: 'Atelier', description: 'Oscuro cálido', swatch: 'linear-gradient(135deg,#2a1a12,#0c0908)', lite: false },
  { id: 'noir', label: 'Noir', description: 'Negro, spotlight', swatch: 'linear-gradient(135deg,#2a2a2e,#050506)', lite: false },
]

export function normalizeInteractiveLandingMood(raw: unknown): McInteractiveLandingMood {
  if (
    raw === 'mist' ||
    raw === 'blush' ||
    raw === 'sage' ||
    raw === 'cream' ||
    raw === 'atelier' ||
    raw === 'noir' ||
    raw === 'midnight'
  ) {
    return raw
  }
  return 'mist'
}

export function isInteractiveLandingLiteMood(mood: McInteractiveLandingMood): boolean {
  return mood === 'mist' || mood === 'blush' || mood === 'sage' || mood === 'cream'
}

function uniqueIds(ids: string[] | undefined, max: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of ids ?? []) {
    const id = raw.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= max) break
  }
  return out
}

export function sanitizeInteractiveProductIds(ids: string[] | undefined): string[] {
  return uniqueIds(ids, INTERACTIVE_LANDING_LIMITS.maxProducts)
}

export function buildInteractiveLandingForSave(input: {
  enabled: boolean
  productIds: string[]
  mood: McInteractiveLandingMood
}): McInteractiveLanding {
  return {
    enabled: input.enabled,
    productIds: sanitizeInteractiveProductIds(input.productIds),
    mood: normalizeInteractiveLandingMood(input.mood),
    updatedAtMs: Date.now(),
  }
}

export function resolveInteractiveLanding(
  tenant: McTenant | null | undefined,
): McInteractiveLanding | null {
  const banner = tenant?.seasonBanner
  if (banner?.enabled && banner.heroMode === 'interactive') {
    const productIds = sanitizeInteractiveProductIds(banner.interactiveProductIds)
    if (productIds.length >= INTERACTIVE_LANDING_LIMITS.minProducts) {
      return {
        enabled: true,
        productIds,
        mood: normalizeInteractiveLandingMood(banner.interactiveMood),
        updatedAtMs: banner.updatedAt,
      }
    }
  }

  const raw = tenant?.interactiveLanding
  if (!raw?.enabled) return null
  const productIds = sanitizeInteractiveProductIds(raw.productIds)
  if (productIds.length < INTERACTIVE_LANDING_LIMITS.minProducts) return null
  return {
    enabled: true,
    productIds,
    mood: normalizeInteractiveLandingMood(raw.mood),
    updatedAtMs: raw.updatedAtMs,
  }
}

export function resolveInteractiveLandingProducts(
  products: McProducto[],
  productIds: string[] | undefined,
): McProducto[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  const out: McProducto[] = []
  for (const id of sanitizeInteractiveProductIds(productIds)) {
    const p = byId.get(id)
    if (!p || !p.activo || !p.enCatalogo || p.esBorrador) continue
    if (!p.imageUrl?.trim()) continue
    out.push(p)
  }
  return out
}

/** Configurado en admin (Expert/Master + enabled + ids). Puede aún no resolverse si faltan productos. */
export function isInteractiveLandingConfigured(tenant: McTenant | null | undefined): boolean {
  if (!hasInteractiveLandingAccess(tenant)) return false
  const resolved = resolveInteractiveLanding(tenant)
  return Boolean(resolved)
}

export function isInteractiveLandingActive(
  tenant: McTenant | null | undefined,
  products: McProducto[] = [],
): boolean {
  if (!hasInteractiveLandingAccess(tenant)) return false
  const resolved = resolveInteractiveLanding(tenant)
  if (!resolved) return false
  const items = resolveInteractiveLandingProducts(products, resolved.productIds)
  return items.length >= INTERACTIVE_LANDING_LIMITS.minProducts
}
