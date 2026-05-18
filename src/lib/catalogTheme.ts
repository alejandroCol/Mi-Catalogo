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
 * Catálogo público Free: acento único neutro (acción principal), fondo hueso, grises cálidos.
 */
export const FREE_PUBLIC_THEME_COLORS: ResolvedCatalogColors = {
  accent: '#171717',
  accentText: '#fafaf9',
  bg: '#f4f3f0',
  surface: '#ffffff',
  text: '#0a0a0a',
  muted: '#737373',
}

const PRESETS: Record<McCatalogThemePreset, ResolvedCatalogColors> = {
  /** Ropa y marcas: cuadrícula limpia, acento índigo. */
  ios: {
    accent: '#1d4ed8',
    accentText: '#eff6ff',
    bg: '#e8edf5',
    surface: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
  },
  /** El rey: editorial cálido, mismo criterio que Free en layout. */
  morning: {
    accent: '#171717',
    accentText: '#fafaf9',
    bg: '#f4f3f0',
    surface: '#ffffff',
    text: '#0a0a0a',
    muted: '#737373',
  },
  /** Lujo / joyería: crema, bronce y serif en títulos. */
  minimal: {
    accent: '#854d0e',
    accentText: '#fffbeb',
    bg: '#f8f5ee',
    surface: '#f2ebe0',
    text: '#1c1917',
    muted: '#78716c',
  },
  /** Niños y color: fondo claro alegre, acento mandarina. */
  bold: {
    accent: '#ea580c',
    accentText: '#fff7ed',
    bg: '#ecfeff',
    surface: '#ffffff',
    text: '#0e7490',
    muted: '#0d9488',
  },
  /** Dulce / loungewear: rosa empolvado y tipografía redonda. */
  boutique: {
    accent: '#be185d',
    accentText: '#fdf2f8',
    bg: '#fdf2f8',
    surface: '#ffffff',
    text: '#831843',
    muted: '#9d174d',
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

/** Tema del panel admin: plan free → editorial neutro (morning); expert aplica preset elegido y colores. */
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
    : 'morning'
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
  ios: 'Moda · ropa',
  morning: 'El clásico · rey',
  minimal: 'Lujo · joyería',
  bold: 'Niños & color',
  boutique: 'Dulce · loungewear',
}

/** Una línea: listado público + para qué tienda encaja (selector Expert). */
export const CATALOG_PRESET_TAGLINES: Record<McCatalogThemePreset, string> = {
  ios: 'Cuadrícula tipo lookbook; ideal jeans, remeras, temporada',
  morning: 'Editorial hueso: tu plantilla estrella, limpia y versátil',
  minimal: 'Lista fina y elegantísima; joyas, relojes, piezas únicas',
  bold: 'Foto grande y claridad; juguetería, infancias, regalos',
  boutique: 'Vidriera 2 columnas; pijamas, casa, detalles femeninos',
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
