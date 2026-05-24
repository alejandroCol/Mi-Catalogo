import divipolaJson from '@/data/colombia-divipola.json'

export interface DivipolaRow {
  cod_dpto: string
  dpto: string
  cod_mpio: string
  nom_mpio: string
}

const ROWS = divipolaJson as DivipolaRow[]

const DEPTOS_ORDENADOS = Array.from(new Set(ROWS.map((r) => r.dpto))).sort((a, b) =>
  a.localeCompare(b, 'es'),
)

/** Departamentos DIVIPOLA (nombre oficial en mayúsculas, como en los datos abiertos). */
export const COLOMBIA_DEPARTAMENTOS: readonly string[] = DEPTOS_ORDENADOS

/** Municipios oficiales por departamento (`dpto` debe coincidir con un valor de la lista anterior). */
export function municipiosDelDepartamento(departamento: string): string[] {
  const d = departamento.trim()
  if (!d) return []
  const set = new Set<string>()
  for (const r of ROWS) {
    if (r.dpto === d) set.add(r.nom_mpio)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
}

export const MC_CHECKOUT_DOCUMENTO_TIPOS: { value: string; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PEP', label: 'PEP' },
  { value: 'OTRO', label: 'Otro documento' },
]

/** Etiqueta legible para selects (DIVIPOLA viene en mayúsculas). */
export function formatoDepartamentoEtiqueta(d: string): string {
  return d
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function normalizeGeoKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

/** Fila DIVIPOLA que coincide con departamento + municipio (nombres oficiales). */
export function buscarDivipolaMunicipio(
  departamento: string,
  municipio: string,
): DivipolaRow | null {
  const d = departamento.trim()
  const m = municipio.trim()
  if (!d || !m) return null
  const mk = normalizeGeoKey(m)
  for (const r of ROWS) {
    if (r.dpto !== d) continue
    if (normalizeGeoKey(r.nom_mpio) === mk) return r
  }
  return null
}

/** Código municipal DANE de 5 dígitos (`cod_mpio`). */
export function codigoDaneMunicipio(departamento: string, municipio: string): string | null {
  return buscarDivipolaMunicipio(departamento, municipio)?.cod_mpio ?? null
}

/** Código de 8 dígitos que exige Envia.com para `city` / `postalCode` en Colombia. */
export function codigoDaneEnviaCiudad(departamento: string, municipio: string): string | null {
  const cod = codigoDaneMunicipio(departamento, municipio)
  if (!cod) return null
  return cod.length >= 8 ? cod.slice(0, 8) : cod.padEnd(8, '0')
}

/** Código de departamento para Envia (`state`): `DC` en Bogotá, si no `cod_dpto`. */
export function codigoEnviaDepartamento(departamento: string): string | null {
  const row = buscarDivipolaMunicipio(departamento, municipioPlaceholder(departamento))
  if (!row) {
    const d = departamento.trim()
    if (!d) return null
    const any = ROWS.find((r) => r.dpto === d)
    if (!any) return null
    return any.cod_dpto === '11' ? 'DC' : any.cod_dpto
  }
  return row.cod_dpto === '11' ? 'DC' : row.cod_dpto
}

function municipioPlaceholder(departamento: string): string {
  const d = departamento.trim()
  const first = ROWS.find((r) => r.dpto === d)
  return first?.nom_mpio ?? ''
}
