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
