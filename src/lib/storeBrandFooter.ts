import { whatsappUrlFromNumber } from '@/catalog-local/buildWhatsappUrl'
import type { McStoreAbout, McStoreSocialFooter, McTenant } from '@/types/mc'

export const STORE_ABOUT_LIMITS = {
  title: 80,
  body: 1200,
  extraTitle: 80,
  extraBody: 800,
} as const

export const STORE_ABOUT_DEFAULTS = {
  title: 'Sobre nosotros',
} as const

export type StoreSocialLinkId = 'whatsapp' | 'instagram' | 'facebook'

export type ResolvedStoreSocialLink = {
  id: StoreSocialLinkId
  label: string
  href: string
}

export function sanitizeStoreAboutFields(fields: {
  title: string
  body: string
  extraTitle: string
  extraBody: string
}): Pick<McStoreAbout, 'title' | 'body' | 'extraTitle' | 'extraBody'> {
  const title = fields.title.trim().slice(0, STORE_ABOUT_LIMITS.title)
  const body = fields.body.trim().slice(0, STORE_ABOUT_LIMITS.body)
  const extraTitle = fields.extraTitle.trim().slice(0, STORE_ABOUT_LIMITS.extraTitle)
  const extraBody = fields.extraBody.trim().slice(0, STORE_ABOUT_LIMITS.extraBody)
  return {
    ...(title ? { title } : {}),
    ...(body ? { body } : {}),
    ...(extraTitle ? { extraTitle } : {}),
    ...(extraBody ? { extraBody } : {}),
  }
}

export function buildStoreAboutForSave(
  enabled: boolean,
  fields: { title: string; body: string; extraTitle: string; extraBody: string },
): McStoreAbout | null {
  if (!enabled) return null
  const sanitized = sanitizeStoreAboutFields(fields)
  if (!sanitized.body?.trim()) return null
  return { enabled: true, ...sanitized }
}

export function resolveStoreAbout(tenant: McTenant | null | undefined): McStoreAbout | null {
  const about = tenant?.storeAbout
  if (!about?.enabled) return null
  const body = about.body?.trim()
  if (!body) return null
  return {
    ...about,
    title: about.title?.trim() || STORE_ABOUT_DEFAULTS.title,
    body,
    ...(about.extraBody?.trim()
      ? {
          extraTitle: about.extraTitle?.trim() || undefined,
          extraBody: about.extraBody.trim(),
        }
      : {}),
  }
}

export function storeAboutVisible(tenant: McTenant | null | undefined): boolean {
  return resolveStoreAbout(tenant) != null
}

function normalizeSocialUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('www.')) return `https://${trimmed}`
  return `https://${trimmed}`
}

export function buildStoreSocialFooterForSave(
  enabled: boolean,
  fields: { whatsapp: boolean; instagramUrl: string; facebookUrl: string },
): McStoreSocialFooter | null {
  if (!enabled) return null
  const instagramUrl = normalizeSocialUrl(fields.instagramUrl) ?? undefined
  const facebookUrl = normalizeSocialUrl(fields.facebookUrl) ?? undefined
  const whatsapp = fields.whatsapp || undefined
  if (!whatsapp && !instagramUrl && !facebookUrl) return null
  return {
    enabled: true,
    ...(whatsapp ? { whatsapp: true } : {}),
    ...(instagramUrl ? { instagramUrl } : {}),
    ...(facebookUrl ? { facebookUrl } : {}),
  }
}

export function resolveStoreSocialLinks(tenant: McTenant | null | undefined): ResolvedStoreSocialLink[] {
  const social = tenant?.storeSocialFooter
  if (!social?.enabled) return []

  const links: ResolvedStoreSocialLink[] = []

  if (social.whatsapp && tenant?.whatsappNumero) {
    const href = whatsappUrlFromNumber(tenant.whatsappNumero, 'Hola, vi tu catálogo y me gustaría saber más.')
    if (href) {
      links.push({ id: 'whatsapp', label: 'WhatsApp', href })
    }
  }

  const instagramUrl = normalizeSocialUrl(social.instagramUrl)
  if (instagramUrl) {
    links.push({ id: 'instagram', label: 'Instagram', href: instagramUrl })
  }

  const facebookUrl = normalizeSocialUrl(social.facebookUrl)
  if (facebookUrl) {
    links.push({ id: 'facebook', label: 'Facebook', href: facebookUrl })
  }

  return links
}

export function storeSocialFooterVisible(tenant: McTenant | null | undefined): boolean {
  return resolveStoreSocialLinks(tenant).length > 0
}
