/** Prefijos comunes para WhatsApp (E.164 sin +). */
export const WA_COUNTRY_PREFIXES: { dial: string; label: string }[] = [
  { dial: '57', label: 'CO +57' },
  { dial: '52', label: 'MX +52' },
  { dial: '54', label: 'AR +54' },
  { dial: '51', label: 'PE +51' },
  { dial: '56', label: 'CL +56' },
  { dial: '593', label: 'EC +593' },
  { dial: '58', label: 'VE +58' },
  { dial: '595', label: 'PY +595' },
  { dial: '598', label: 'UY +598' },
  { dial: '1', label: 'US/CA +1' },
  { dial: '34', label: 'ES +34' },
]

export const DEFAULT_WA_PREFIX = '57'

export function combineWaDigits(prefixDial: string, localDigits: string): string {
  const p = prefixDial.replace(/\D/g, '')
  const l = localDigits.replace(/\D/g, '')
  return `${p}${l}`
}

/** Parte dígitos guardados estilo E.164 (sin +) en prefijo conocido + número local según lista de país. */
export function splitStoredWaDigits(digitsRaw: string): { prefix: string; local: string } {
  const d = digitsRaw.replace(/\D/g, '')
  if (!d) return { prefix: DEFAULT_WA_PREFIX, local: '' }
  const sorted = [...WA_COUNTRY_PREFIXES].sort((a, b) => b.dial.length - a.dial.length)
  for (const { dial } of sorted) {
    if (d.startsWith(dial)) {
      return { prefix: dial, local: d.slice(dial.length) }
    }
  }
  return { prefix: DEFAULT_WA_PREFIX, local: d }
}
