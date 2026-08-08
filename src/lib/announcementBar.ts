import type {
  McAnnouncementBar,
  McAnnouncementBarSpacing,
  McAnnouncementBarTheme,
  McTenant,
} from '@/types/mc'

export const ANNOUNCEMENT_BAR_LIMITS = {
  text: 120,
  maxTexts: 2,
} as const

export const ANNOUNCEMENT_BAR_DEFAULTS = {
  text: 'Envíos GRATIS desde $250.000',
  text2: 'Actitud y comodidad en cada movimiento',
  theme: 'black' as McAnnouncementBarTheme,
  spacing: 'normal' as McAnnouncementBarSpacing,
}

export const ANNOUNCEMENT_BAR_THEME_OPTIONS: {
  id: McAnnouncementBarTheme
  title: string
  description: string
}[] = [
  { id: 'black', title: 'Negro', description: 'Fondo oscuro y texto claro.' },
  { id: 'white', title: 'Blanco', description: 'Fondo claro y texto oscuro.' },
]

export const ANNOUNCEMENT_BAR_SPACING_OPTIONS: {
  id: McAnnouncementBarSpacing
  title: string
  description: string
}[] = [
  { id: 'near', title: 'Cerca', description: 'Mensajes más juntos.' },
  { id: 'normal', title: 'Normal', description: 'Separación equilibrada.' },
  { id: 'far', title: 'Lejos', description: 'Más aire entre textos.' },
]

export type AnnouncementBarDraftFields = {
  text1: string
  text2: string
  theme: McAnnouncementBarTheme
  spacing: McAnnouncementBarSpacing
}

export type ResolvedAnnouncementBar = {
  texts: string[]
  theme: McAnnouncementBarTheme
  spacing: McAnnouncementBarSpacing
}

export function sanitizeAnnouncementBarText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, ANNOUNCEMENT_BAR_LIMITS.text)
}

export function isAnnouncementBarTheme(value: unknown): value is McAnnouncementBarTheme {
  return value === 'black' || value === 'white'
}

export function isAnnouncementBarSpacing(value: unknown): value is McAnnouncementBarSpacing {
  return value === 'near' || value === 'normal' || value === 'far'
}

function sanitizeTexts(text1: string, text2: string): string[] {
  const primary = sanitizeAnnouncementBarText(text1)
  const secondary = sanitizeAnnouncementBarText(text2)
  const texts = [primary, secondary].filter(Boolean)
  return texts.slice(0, ANNOUNCEMENT_BAR_LIMITS.maxTexts)
}

function resolveTextsFromBar(bar: McAnnouncementBar): string[] {
  const fromArray = (bar.texts ?? [])
    .map((t) => sanitizeAnnouncementBarText(t ?? ''))
    .filter(Boolean)
    .slice(0, ANNOUNCEMENT_BAR_LIMITS.maxTexts)
  if (fromArray.length > 0) return fromArray
  const legacy = sanitizeAnnouncementBarText(bar.text ?? '')
  return legacy ? [legacy] : []
}

/** Construye el payload listo para Firestore, o null si no debe persistirse. */
export function buildAnnouncementBarForSave(
  enabled: boolean,
  fields: AnnouncementBarDraftFields,
): McAnnouncementBar | null {
  if (!enabled) return null
  const texts = sanitizeTexts(fields.text1, fields.text2)
  if (texts.length === 0) return null
  const theme = isAnnouncementBarTheme(fields.theme) ? fields.theme : ANNOUNCEMENT_BAR_DEFAULTS.theme
  const spacing = isAnnouncementBarSpacing(fields.spacing)
    ? fields.spacing
    : ANNOUNCEMENT_BAR_DEFAULTS.spacing
  return {
    enabled: true,
    texts,
    theme,
    spacing,
  }
}

export function resolveAnnouncementBar(
  tenant: McTenant | null | undefined,
): ResolvedAnnouncementBar | null {
  const bar = tenant?.announcementBar
  if (!bar?.enabled) return null
  const texts = resolveTextsFromBar(bar)
  if (texts.length === 0) return null
  return {
    texts,
    theme: isAnnouncementBarTheme(bar.theme) ? bar.theme : ANNOUNCEMENT_BAR_DEFAULTS.theme,
    spacing: isAnnouncementBarSpacing(bar.spacing) ? bar.spacing : ANNOUNCEMENT_BAR_DEFAULTS.spacing,
  }
}

export function announcementBarVisible(tenant: McTenant | null | undefined): boolean {
  return resolveAnnouncementBar(tenant) != null
}

export function announcementBarAriaLabel(bar: ResolvedAnnouncementBar): string {
  return bar.texts.join(' · ')
}
