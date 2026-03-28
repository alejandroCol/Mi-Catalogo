import type { CSSProperties } from 'react'
import type { McCatalogTheme, McCatalogThemeColors, McCatalogThemePreset, McTenant } from '@/types/mc'

export type ResolvedCatalogColors = {
  accent: string
  accentText: string
  bg: string
  surface: string
  text: string
  muted: string
}

/**
 * Colores del catálogo público para plan Free (misma sensación que el diseño Morning anterior).
 */
export const FREE_PUBLIC_THEME_COLORS: ResolvedCatalogColors = {
  accent: '#7c5ce0',
  accentText: '#ffffff',
  bg: '#fce6ef',
  surface: '#ffffff',
  text: '#4a2c3c',
  muted: '#945172',
}

const PRESETS: Record<McCatalogThemePreset, ResolvedCatalogColors> = {
  ios: {
    accent: '#007aff',
    accentText: '#ffffff',
    bg: '#f2f2f7',
    surface: '#ffffff',
    text: '#1c1c1e',
    muted: '#636366',
  },
  /** Paleta y sensación del catálogo “Morning” original (rosados + acento lilac). */
  morning: {
    accent: '#7c5ce0',
    accentText: '#ffffff',
    bg: '#fce6ef',
    surface: '#ffffff',
    text: '#4a2c3c',
    muted: '#945172',
  },
  minimal: {
    accent: '#1c1c1e',
    accentText: '#ffffff',
    bg: '#ffffff',
    surface: '#f7f7f8',
    text: '#1c1c1e',
    muted: '#c7c7cc',
  },
  bold: {
    accent: '#ff3b30',
    accentText: '#ffffff',
    bg: '#1c1c1e',
    surface: '#2c2c2e',
    text: '#ffffff',
    muted: '#8e8e93',
  },
  boutique: {
    accent: '#8b5a2b',
    accentText: '#fffaf3',
    bg: '#faf6f0',
    surface: '#ffffff',
    text: '#2c1810',
    muted: '#7a6560',
  },
}

function pickDefined<T extends Record<string, string | undefined>>(patch: T | undefined): Partial<ResolvedCatalogColors> {
  if (!patch) return {}
  const o: Partial<ResolvedCatalogColors> = {}
  for (const k of Object.keys(patch) as (keyof ResolvedCatalogColors)[]) {
    const v = patch[k]
    if (typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v)) {
      o[k] = v
    }
  }
  return o
}

export function billingPlanOf(tenant: McTenant | null | undefined): 'free' | 'expert' {
  return tenant?.billingPlan === 'expert' ? 'expert' : 'free'
}

/** Tema del panel admin: plan free → iOS; expert aplica preset (por defecto Morning) y colores. */
export function resolveCatalogTheme(tenant: McTenant | null | undefined): {
  preset: McCatalogThemePreset
  colors: ResolvedCatalogColors
} {
  const expert = billingPlanOf(tenant) === 'expert'
  const expertPreset = tenant?.catalogTheme?.preset
  const preset: McCatalogThemePreset = expert
    ? expertPreset && expertPreset in PRESETS
      ? expertPreset
      : 'morning'
    : 'ios'
  const base = PRESETS[preset]
  const custom = expert
    ? pickDefined(tenant?.catalogTheme?.colors as unknown as Record<string, string | undefined>)
    : {}
  const colors: ResolvedCatalogColors = { ...base, ...custom }
  return { preset, colors }
}

export function catalogColorsToCssVars(colors: ResolvedCatalogColors): CSSProperties {
  return {
    '--cat-accent': colors.accent,
    '--cat-accent-text': colors.accentText,
    '--cat-bg': colors.bg,
    '--cat-surface': colors.surface,
    '--cat-text': colors.text,
    '--cat-muted': colors.muted,
    '--cat-ring': `${colors.accent}40`,
  } as CSSProperties
}

export function tenantThemeCssVars(tenant: McTenant | null | undefined): CSSProperties {
  const { colors } = resolveCatalogTheme(tenant)
  return catalogColorsToCssVars(colors)
}

/**
 * Tema del catálogo público: Expert usa `catalogTheme`; Free mantiene la paleta “Morning”.
 */
export function resolvePublicCatalogTheme(tenant: McTenant | null | undefined): {
  preset: McCatalogThemePreset
  colors: ResolvedCatalogColors
} {
  if (!tenant || billingPlanOf(tenant) !== 'expert') {
    return { preset: 'morning', colors: FREE_PUBLIC_THEME_COLORS }
  }
  return resolveCatalogTheme(tenant)
}

export function publicCatalogCssVars(tenant: McTenant | null | undefined): CSSProperties {
  const { colors } = resolvePublicCatalogTheme(tenant)
  return catalogColorsToCssVars(colors)
}

export function publicCatalogPresetClass(preset: McCatalogThemePreset): string {
  return `mc-pub-preset-${preset}`
}

export const CATALOG_PRESET_LABELS: Record<McCatalogThemePreset, string> = {
  ios: 'Clásico (iOS)',
  morning: 'Rosado (Morning · clásico)',
  minimal: 'Minimal',
  bold: 'Contraste',
  boutique: 'Boutique',
}

/** Una línea: cómo se ve el listado en el catálogo público (para el selector Expert). */
export const CATALOG_PRESET_TAGLINES: Record<McCatalogThemePreset, string> = {
  ios: 'Cuadrícula: foto al costado, datos al lado',
  morning: 'Igual que iOS, paleta y fondo rosados',
  minimal: 'Lista compacta, sin tarjetas',
  bold: 'Foto grande arriba, nombre y precio centrados',
  boutique: 'Grilla 2 columnas estilo vidriera',
}

/** Colores base de cada plantilla (para miniaturas y “Rellenar colores”). */
export function defaultColorsForPreset(preset: McCatalogThemePreset): ResolvedCatalogColors {
  return PRESETS[preset]
}

export function sanitizeThemeColors(raw: McCatalogThemeColors | undefined): McCatalogThemeColors | undefined {
  const o = pickDefined(raw as unknown as Record<string, string | undefined>) as McCatalogThemeColors
  return Object.keys(o).length ? o : undefined
}

export function buildCatalogThemeForSave(preset: McCatalogThemePreset, colors: McCatalogThemeColors): McCatalogTheme {
  const c = sanitizeThemeColors(colors)
  return c ? { preset, colors: c } : { preset }
}
