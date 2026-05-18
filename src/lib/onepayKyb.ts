/** Debe coincidir con ONEPAY_KYB_TERMS_VERSION en `functions/src/index.ts`. */
export const ONEPAY_KYB_TERMS_VERSION = 'mc-2026-05'

export const ONEPAY_KYB_SALES_OPTIONS = [10, 35, 110, 240, 500] as const

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

/** Códigos según ejemplo oficial OnePay POST /v1/companies (`O_47`, `R_99_PN`). */
export const ONEPAY_KYB_FISCAL_PRESETS: { code: string; label: string }[] = [
  { code: 'O_47', label: 'O_47 · Régimen simple de tributación' },
  { code: 'R_99_PN', label: 'R_99_PN · No responsable de IVA' },
]
