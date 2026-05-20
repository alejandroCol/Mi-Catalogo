/** Tokens de marca Mi Catálogo (app / panel; no catálogos de tienda). */
export const MC_BRAND = {
  wordmark: 'mi catálogo',
  gray: '#3F3D45',
  gold: '#C5A367',
  /** Gris más claro para fondos oscuros (mejor contraste WCAG). */
  grayOnDark: '#E8E6EB',
} as const

export type McBrandTone = 'onLight' | 'onDark'

export function mcBrandColors(tone: McBrandTone) {
  return tone === 'onDark'
    ? { mark: MC_BRAND.grayOnDark, accent: MC_BRAND.gold, text: MC_BRAND.grayOnDark }
    : { mark: MC_BRAND.gray, accent: MC_BRAND.gold, text: MC_BRAND.gray }
}
