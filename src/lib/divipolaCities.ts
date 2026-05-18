/**
 * Municipios Colombia (DIVIPOLA) vía datos.gov.co — dataset público.
 * Endpoint: DIVIPOLA códigos municipio (referencia habitual para códigos DANE enteros).
 * OnePay espera city_id como entero; usamos numeric(cod_mpio) como valor sugerido.
 */

export type DivipolaMunicipio = {
  cod_dpto: string
  dpto: string
  cod_mpio: string
  nom_mpio: string
}

const DIVIPOLA_RESOURCE =
  'https://www.datos.gov.co/resource/gdxc-w37w.json'

function latinizeUpper(s: string): string {
  return s.normalize('NFKD').replace(/\p{M}+/gu, '').toUpperCase()
}

/** Número sugerido para OnePay.city_id */
export function divipolaCodMpioToSuggestedCityId(codMpio: string): number | null {
  const n = parseInt(String(codMpio).trim(), 10)
  return Number.isFinite(n) ? n : null
}

function buildLikeToken(query: string): string | null {
  const latin = latinizeUpper(query.trim())
  const compact = latin.replace(/[^A-Z0-9]+/g, '')
  if (compact.length < 3) return null
  return compact.slice(0, 12)
}

function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''")
}

/**
 * Busca municipios por nombre/depto o código DANE de 5 dígitos (cod_mpio).
 */
export async function searchDivipolaMunicipios(
  query: string,
  opts?: { limit?: number; signal?: AbortSignal },
): Promise<DivipolaMunicipio[]> {
  const limit = opts?.limit ?? 15
  const signal = opts?.signal

  const raw = query.trim()
  if (raw.length < 3) return []

  const parts: string[] = []
  const likeTok = buildLikeToken(raw)
  if (likeTok) {
    const needle = `%${escapeSqlString(likeTok)}%`
    parts.push(`(upper(nom_mpio) like '${needle}' OR upper(dpto) like '${needle}')`)
  }

  const digitsOnly = raw.replace(/\D/g, '')
  if (/^\d{5}$/.test(digitsOnly)) {
    parts.push(`cod_mpio = '${escapeSqlString(digitsOnly)}'`)
  }

  if (parts.length === 0) return []

  const whereClause = parts.length === 1 ? parts[0]! : `(${parts.join(' OR ')})`

  const u = new URL(DIVIPOLA_RESOURCE)
  u.searchParams.set('$where', whereClause)
  u.searchParams.set('$order', 'nom_mpio ASC')
  u.searchParams.set('$limit', String(limit))

  const res = await fetch(u.toString(), { signal })
  if (!res.ok) {
    throw new Error(`divipola_${res.status}`)
  }

  const json: unknown = await res.json()
  if (!Array.isArray(json)) return []

  const out: DivipolaMunicipio[] = []
  for (const row of json) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const cod_dpto = typeof r.cod_dpto === 'string' ? r.cod_dpto : ''
    const dpto = typeof r.dpto === 'string' ? r.dpto : ''
    const cod_mpio = typeof r.cod_mpio === 'string' ? r.cod_mpio : ''
    const nom_mpio = typeof r.nom_mpio === 'string' ? r.nom_mpio : ''
    if (!cod_mpio || !nom_mpio) continue
    out.push({ cod_dpto, dpto, cod_mpio, nom_mpio })
  }

  return out
}
