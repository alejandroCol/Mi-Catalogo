import ciiuData from '@/lib/data/ciiuColombia.json'

export type CiiuEntry = {
  code: string
  description: string
  section: string
}

const ENTRIES: CiiuEntry[] = ciiuData as CiiuEntry[]

const BY_CODE = new Map(ENTRIES.map((e) => [e.code, e]))

function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function ciiuEntryLabel(entry: CiiuEntry): string {
  return `${entry.code} · ${entry.description}`
}

export function getCiiuByCode(code: string): CiiuEntry | undefined {
  const c = code.trim()
  if (!/^\d{4}$/.test(c)) return undefined
  return BY_CODE.get(c)
}

/** Búsqueda local por código CIIU o palabras de la descripción (catálogo DANE Rev. 4 A.C.). */
export function searchCiiu(query: string, limit = 24): CiiuEntry[] {
  const q = normalizeQuery(query)
  if (!q) return ENTRIES.slice(0, limit)

  const digitsOnly = /^\d+$/.test(q)

  const hits: CiiuEntry[] = []
  for (const entry of ENTRIES) {
    if (digitsOnly) {
      if (entry.code.startsWith(q)) hits.push(entry)
    } else {
      const hay = normalizeQuery(`${entry.code} ${entry.description} ${entry.section}`)
      if (hay.includes(q)) hits.push(entry)
    }
    if (hits.length >= limit) break
  }
  return hits
}

export const CIIU_COLOMBIA_COUNT = ENTRIES.length
