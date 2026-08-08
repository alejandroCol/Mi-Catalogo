import type { CSSProperties } from 'react'
import type {
  McCatalogFontId,
  McCatalogFontScope,
  McCatalogThemeFonts,
  McCatalogThemePreset,
  McTenant,
} from '@/types/mc'

export type ResolvedCatalogFonts = {
  body: string
  display: string
  bannerTitle: string
  bannerSub: string
  /** Barra de anuncio (marquee superior). */
  announcement: string
  scope: McCatalogFontScope
  /** Fuente personalizada activa (no solo preset). */
  custom: boolean
  family?: McCatalogFontId
}

const FONT_STACKS: Record<McCatalogFontId, string> = {
  'inter-tight': "'Inter Tight', ui-sans-serif, system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, 'Times New Roman', serif",
  fredoka: "'Fredoka', 'Segoe UI Rounded', 'Hiragino Maru Gothic ProN', ui-rounded, system-ui, sans-serif",
  quicksand: "'Quicksand', ui-sans-serif, system-ui, sans-serif",
  'dm-serif': "'DM Serif Display', Georgia, 'Times New Roman', serif",
}

export const CATALOG_FONT_IDS: McCatalogFontId[] = [
  'inter-tight',
  'playfair',
  'fredoka',
  'quicksand',
  'dm-serif',
]

export const CATALOG_FONT_LABELS: Record<McCatalogFontId, string> = {
  'inter-tight': 'Moderna',
  playfair: 'Editorial',
  fredoka: 'Divertida',
  quicksand: 'Suave',
  'dm-serif': 'Clásica',
}

export const CATALOG_FONT_TAGLINES: Record<McCatalogFontId, string> = {
  'inter-tight': 'Moda, tech y catálogos limpios',
  playfair: 'Lujo, joyería y piezas únicas',
  fredoka: 'Niños, juguetes y color',
  quicksand: 'Boutique, loungewear y detalles',
  'dm-serif': 'Tradicional, elegante y atemporal',
}

/** Texto de muestra en el selector (título + descripción). */
export const CATALOG_FONT_SAMPLES: Record<McCatalogFontId, { title: string; body: string }> = {
  'inter-tight': { title: 'Tu tienda', body: 'Descubrí la colección' },
  playfair: { title: 'Tu tienda', body: 'Piezas que cuentan historias' },
  fredoka: { title: 'Tu tienda', body: '¡Diversión para todos!' },
  quicksand: { title: 'Tu tienda', body: 'Comodidad y estilo' },
  'dm-serif': { title: 'Tu tienda', body: 'Calidad que perdura' },
}

export function catalogFontStack(id: McCatalogFontId): string {
  return FONT_STACKS[id]
}

export function isValidFontId(v: unknown): v is McCatalogFontId {
  return typeof v === 'string' && v in FONT_STACKS
}

function fontStack(id: McCatalogFontId): string {
  return catalogFontStack(id)
}

export function normalizeFontScope(raw: unknown): McCatalogFontScope {
  if (raw === 'banner' || raw === 'announcement') return raw
  return 'store'
}

/** Tipografía por defecto según plantilla (sin personalización). */
export function defaultFontStacksForPreset(
  preset: McCatalogThemePreset,
): Omit<ResolvedCatalogFonts, 'scope' | 'custom' | 'family'> {
  const inter = FONT_STACKS['inter-tight']
  const playfair = FONT_STACKS.playfair
  const fredoka = FONT_STACKS.fredoka
  const quicksand = FONT_STACKS.quicksand

  switch (preset) {
    case 'minimal':
      return {
        body: inter,
        display: playfair,
        bannerTitle: playfair,
        bannerSub: inter,
        announcement: inter,
      }
    case 'bold':
      return {
        body: fredoka,
        display: fredoka,
        bannerTitle: fredoka,
        bannerSub: fredoka,
        announcement: fredoka,
      }
    case 'boutique':
      return {
        body: quicksand,
        display: quicksand,
        bannerTitle: quicksand,
        bannerSub: quicksand,
        announcement: quicksand,
      }
    case 'ios':
    case 'morning':
    default:
      return {
        body: inter,
        display: inter,
        bannerTitle: inter,
        bannerSub: inter,
        announcement: inter,
      }
  }
}

export function defaultFontIdForPreset(preset: McCatalogThemePreset): McCatalogFontId {
  switch (preset) {
    case 'minimal':
      return 'playfair'
    case 'bold':
      return 'fredoka'
    case 'boutique':
      return 'quicksand'
    case 'ios':
    case 'morning':
    default:
      return 'inter-tight'
  }
}

export function resolveCatalogFonts(
  tenant: McTenant | null | undefined,
  preset: McCatalogThemePreset,
): ResolvedCatalogFonts {
  const presetDefaults = defaultFontStacksForPreset(preset)
  const saved = tenant?.catalogTheme?.fonts

  if (!saved?.family || !isValidFontId(saved.family)) {
    return {
      ...presetDefaults,
      scope: 'store',
      custom: false,
    }
  }

  const stack = fontStack(saved.family)
  const scope = normalizeFontScope(saved.scope)

  if (scope === 'banner') {
    return {
      body: presetDefaults.body,
      display: presetDefaults.display,
      bannerTitle: stack,
      bannerSub: stack,
      announcement: presetDefaults.announcement,
      scope: 'banner',
      custom: true,
      family: saved.family,
    }
  }

  if (scope === 'announcement') {
    return {
      body: presetDefaults.body,
      display: presetDefaults.display,
      bannerTitle: presetDefaults.bannerTitle,
      bannerSub: presetDefaults.bannerSub,
      announcement: stack,
      scope: 'announcement',
      custom: true,
      family: saved.family,
    }
  }

  return {
    body: stack,
    display: stack,
    bannerTitle: stack,
    bannerSub: stack,
    announcement: stack,
    scope: 'store',
    custom: true,
    family: saved.family,
  }
}

export function catalogFontsToCssVars(fonts: ResolvedCatalogFonts): CSSProperties {
  return {
    '--cat-font-body': fonts.body,
    '--cat-font-display': fonts.display,
    '--cat-font-banner-title': fonts.bannerTitle,
    '--cat-font-banner-sub': fonts.bannerSub,
    '--cat-font-announcement': fonts.announcement,
  } as CSSProperties
}

export function sanitizeThemeFonts(raw: McCatalogThemeFonts | undefined): McCatalogThemeFonts | undefined {
  if (!raw?.family || !isValidFontId(raw.family)) return undefined
  return { family: raw.family, scope: normalizeFontScope(raw.scope) }
}

/** Vista previa en panel: fuente y alcance en borrador. */
export function resolveDraftCatalogFonts(
  preset: McCatalogThemePreset,
  family: McCatalogFontId,
  scope: McCatalogFontScope,
): ResolvedCatalogFonts {
  const draftTenant = {
    catalogTheme: { preset, fonts: { family, scope } },
  } as McTenant
  return resolveCatalogFonts(draftTenant, preset)
}
