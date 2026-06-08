import { formatIntegerEsCo } from '@/lib/formatCop'
import type { McEnvioCiudadPrecio } from '@/types/mc'

export type EnvioCiudadRow = { id: string; departamento: string; ciudad: string; copInput: string }

export function newEnvioCiudadRow(): EnvioCiudadRow {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `r-${Date.now()}`
  return { id, departamento: '', ciudad: '', copInput: '' }
}

export function parseCopInput(raw: string): number {
  const d = raw.replace(/\D/g, '')
  if (!d) return 0
  return Math.max(0, Math.min(999_999_999, Math.round(Number(d))))
}

export function parseDecimalInput(raw: string, max: number): number {
  const n = Number.parseFloat(raw.replace(',', '.').trim())
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(max, n)
}

export function envioCiudadRowsFromTenant(list: McEnvioCiudadPrecio[] | undefined): EnvioCiudadRow[] {
  const items = list ?? []
  if (!items.length) return []
  return items.map((x, i) => ({
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `x-${i}-${String(x.ciudad)}`,
    departamento: String(x.departamento ?? ''),
    ciudad: String(x.ciudad ?? ''),
    copInput: x.cop != null && Number.isFinite(x.cop) && x.cop > 0 ? formatIntegerEsCo(Math.round(x.cop)) : '',
  }))
}

export const ENVIO_FIELD_INPUT_CLASS = 'mc-input mt-1 py-2.5'
