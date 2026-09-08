import { whatsappUrlFromNumber } from '@/catalog-local/buildWhatsappUrl'
import type {
  McCatalogWhatsappFab,
  McCatalogWhatsappFabSide,
  McCatalogWhatsappFabStyle,
  McTenant,
} from '@/types/mc'

export const CATALOG_WHATSAPP_FAB_DEFAULTS = {
  style: 'classic' as McCatalogWhatsappFabStyle,
  side: 'right' as McCatalogWhatsappFabSide,
  label: 'WhatsApp',
  message: 'Hola, vi tu catálogo y me gustaría saber más.',
}

export const CATALOG_WHATSAPP_FAB_LABEL_LIMIT = 22

export const CATALOG_WHATSAPP_FAB_STYLE_OPTIONS: {
  id: McCatalogWhatsappFabStyle
  title: string
  description: string
}[] = [
  {
    id: 'classic',
    title: 'Clásico',
    description: 'Círculo verde, el ícono de WhatsApp.',
  },
  {
    id: 'pill',
    title: 'Con texto',
    description: 'Pastilla verde con ícono y etiqueta.',
  },
  {
    id: 'outline',
    title: 'Suave',
    description: 'Fondo claro y sombra, más discreto.',
  },
  {
    id: 'dark',
    title: 'Oscuro',
    description: 'Círculo negro, encaja con landings editoriales.',
  },
]

export const CATALOG_WHATSAPP_FAB_SIDE_OPTIONS: {
  id: McCatalogWhatsappFabSide
  title: string
  description: string
}[] = [
  { id: 'right', title: 'Derecha', description: 'Esquina inferior derecha.' },
  { id: 'left', title: 'Izquierda', description: 'Esquina inferior izquierda.' },
]

export type CatalogWhatsappFabAppearance = {
  style: McCatalogWhatsappFabStyle
  side: McCatalogWhatsappFabSide
  label: string
  showLabel: boolean
}

export type ResolvedCatalogWhatsappFab = CatalogWhatsappFabAppearance & {
  href: string
}

export function isCatalogWhatsappFabStyle(value: unknown): value is McCatalogWhatsappFabStyle {
  return value === 'classic' || value === 'pill' || value === 'outline' || value === 'dark'
}

export function isCatalogWhatsappFabSide(value: unknown): value is McCatalogWhatsappFabSide {
  return value === 'right' || value === 'left'
}

export function sanitizeCatalogWhatsappFabLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().slice(0, CATALOG_WHATSAPP_FAB_LABEL_LIMIT)
}

export function tenantHasWhatsappNumber(tenant: McTenant | null | undefined): boolean {
  const digits = tenant?.whatsappNumero?.replace(/\D/g, '') ?? ''
  return digits.length >= 10 && digits.length <= 15
}

export function resolveCatalogWhatsappFabAppearance(
  fab: McCatalogWhatsappFab | null | undefined,
): CatalogWhatsappFabAppearance | null {
  if (!fab?.enabled) return null
  const style = isCatalogWhatsappFabStyle(fab.style)
    ? fab.style
    : CATALOG_WHATSAPP_FAB_DEFAULTS.style
  const label = sanitizeCatalogWhatsappFabLabel(fab.label ?? '') || CATALOG_WHATSAPP_FAB_DEFAULTS.label
  return {
    style,
    side: isCatalogWhatsappFabSide(fab.side) ? fab.side : CATALOG_WHATSAPP_FAB_DEFAULTS.side,
    label,
    showLabel: style === 'pill',
  }
}

export function resolveCatalogWhatsappFab(
  tenant: McTenant | null | undefined,
): ResolvedCatalogWhatsappFab | null {
  const appearance = resolveCatalogWhatsappFabAppearance(tenant?.catalogWhatsappFab)
  if (!appearance || !tenantHasWhatsappNumber(tenant)) return null
  const href = whatsappUrlFromNumber(
    tenant?.whatsappNumero ?? '',
    CATALOG_WHATSAPP_FAB_DEFAULTS.message,
  )
  if (!href) return null
  return { ...appearance, href }
}

export function catalogWhatsappFabVisible(tenant: McTenant | null | undefined): boolean {
  return resolveCatalogWhatsappFab(tenant) != null
}

export function buildCatalogWhatsappFabForSave(
  enabled: boolean,
  fields: {
    style: McCatalogWhatsappFabStyle
    side: McCatalogWhatsappFabSide
    label: string
  },
): McCatalogWhatsappFab {
  const style = isCatalogWhatsappFabStyle(fields.style)
    ? fields.style
    : CATALOG_WHATSAPP_FAB_DEFAULTS.style
  const side = isCatalogWhatsappFabSide(fields.side) ? fields.side : CATALOG_WHATSAPP_FAB_DEFAULTS.side
  const label = sanitizeCatalogWhatsappFabLabel(fields.label)
  return {
    enabled,
    style,
    side,
    ...(style === 'pill' && label && label !== CATALOG_WHATSAPP_FAB_DEFAULTS.label ? { label } : {}),
  }
}
