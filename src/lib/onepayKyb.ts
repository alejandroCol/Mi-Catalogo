/** Debe coincidir con ONEPAY_KYB_TERMS_VERSION en `functions/src/index.ts`. */
export const ONEPAY_KYB_TERMS_VERSION = 'mc-2026-05'

export const ONEPAY_KYB_SALES_OPTIONS = [10, 35, 110, 240, 500] as const
export type OnepayKybSalesOption = (typeof ONEPAY_KYB_SALES_OPTIONS)[number]

/** Etiquetas legibles para el campo `sales` de OnePay (millones COP, tope del rango). */
export function onePayKybSalesLabel(value: OnepayKybSalesOption): string {
  if (value === 10) return 'Menos de 10 millones COP'
  if (value === 35) return 'De 10 a menos de 35 millones COP'
  if (value === 110) return 'De 35 a menos de 110 millones COP'
  if (value === 240) return 'De 110 a menos de 240 millones COP'
  return 'De 240 a menos de 500 millones COP'
}

/** Valores de `account.type` en POST /v1/companies (ej. creación de empresa). */
export const ONEPAY_KYB_ACCOUNT_TYPES_ORDER = ['savings', 'checking', 'electronic_deposit'] as const
export type OnePayKybBankAccountType = (typeof ONEPAY_KYB_ACCOUNT_TYPES_ORDER)[number]

export function isOnePayKybBankAccountType(t: string): t is OnePayKybBankAccountType {
  return (ONEPAY_KYB_ACCOUNT_TYPES_ORDER as readonly string[]).includes(t)
}

export function onePayKybAccountTypeLabel(t: string): string {
  if (t === 'savings') return 'Ahorros'
  if (t === 'checking') return 'Corriente'
  if (t === 'electronic_deposit') return 'Depósito electrónico (ej. Nequi)'
  return t
}

/**
 * Códigos que acepta POST /v1/companies (validado contra api.onepay.la).
 * OnePay NO acepta R_99_PN / R-99-PN aunque figure en el RUT como «no aplica».
 */
export const ONEPAY_KYB_FISCAL_CODES = ['O_13', 'O_15', 'O_23', 'O_47'] as const
export type OnepayKybFiscalCode = (typeof ONEPAY_KYB_FISCAL_CODES)[number]

/** Normaliza entrada UI (guiones o guiones bajos) al formato API. */
export function normalizeOnePayFiscalCode(raw: string): OnepayKybFiscalCode | null {
  const f = raw.trim().replace(/\s+/g, '').replace(/-/g, '_').toUpperCase()
  return (ONEPAY_KYB_FISCAL_CODES as readonly string[]).includes(f) ? (f as OnepayKybFiscalCode) : null
}

export function onePayFiscalCodeForApi(code: string): OnepayKybFiscalCode | null {
  return normalizeOnePayFiscalCode(code)
}

export function isOnePayKybFiscalCode(code: string): boolean {
  return normalizeOnePayFiscalCode(code) !== null
}

export function resolveOnepayFiscalResponsibilities(selected: string[]): OnepayKybFiscalCode[] {
  const out: OnepayKybFiscalCode[] = []
  for (const raw of selected) {
    const code = normalizeOnePayFiscalCode(raw)
    if (code && !out.includes(code)) out.push(code)
  }
  return out
}

export const ONEPAY_KYB_FISCAL_PRESETS: { code: OnepayKybFiscalCode; label: string; hint: string }[] = [
  {
    code: 'O_47',
    label: 'Régimen simple de tributación',
    hint: 'O-47 · Solo si estás inscrito en RST (persona natural o jurídica).',
  },
  {
    code: 'O_23',
    label: 'Agente de retención IVA',
    hint: 'O-23 · Si figura en tu RUT.',
  },
  {
    code: 'O_15',
    label: 'Autorretenedor',
    hint: 'O-15 · Si figura en tu RUT.',
  },
  {
    code: 'O_13',
    label: 'Gran contribuyente',
    hint: 'O-13 · Si figura en tu RUT.',
  },
]
