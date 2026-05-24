/** Tarifa Mi Catálogo al retirar con pasarela sin registro OnePay (no por transacción). */
export const PASARELA_MICATALOGO_WITHDRAWAL_RATE = 0.0002
export const PASARELA_MICATALOGO_WITHDRAWAL_FIXED_COP = 900

/** Comisión OnePay por transacción en pasarela (3,49% + $800 + IVA sobre la comisión). */
export const ONEPAY_MERCHANT_TX_RATE = 0.0349
export const ONEPAY_MERCHANT_TX_FIXED_COP = 800
export const ONEPAY_COMMISSION_IVA_RATE = 0.19

function pasarelaTxBaseCommissionCop(grossCop: number): number {
  const g = Math.max(0, Math.round(grossCop))
  return g * ONEPAY_MERCHANT_TX_RATE + ONEPAY_MERCHANT_TX_FIXED_COP
}

/** Comisión base de pasarela sin IVA (3,49% + $800). */
export function pasarelaTxBaseFeePerPaymentCop(grossCop: number): number {
  return Math.ceil(pasarelaTxBaseCommissionCop(grossCop))
}

/** IVA calculado sobre la comisión base de pasarela. */
export function pasarelaTxIvaOnCommissionCop(grossCop: number): number {
  const base = pasarelaTxBaseCommissionCop(grossCop)
  return Math.ceil(base * ONEPAY_COMMISSION_IVA_RATE)
}

/** Comisión total por transacción: 3,49% + $800 + IVA sobre la comisión. */
export function pasarelaTxFeePerPaymentCop(grossCop: number): number {
  return pasarelaTxBaseFeePerPaymentCop(grossCop) + pasarelaTxIvaOnCommissionCop(grossCop)
}

export function pasarelaTxNetPerPaymentCop(grossCop: number): number {
  const g = Math.max(0, Math.round(grossCop))
  return Math.max(0, g - pasarelaTxFeePerPaymentCop(g))
}

/** Alias para pasarela Mi Catálogo: misma comisión OnePay por transacción. */
export function pasarelaMicatalogoFeePerPaymentCop(grossCop: number): number {
  return pasarelaTxFeePerPaymentCop(grossCop)
}

export function pasarelaMicatalogoNetPerPaymentCop(grossCop: number): number {
  return pasarelaTxNetPerPaymentCop(grossCop)
}

function pasarelaMicatalogoWithdrawalProportionalFeeCop(amountCop: number): number {
  const a = Math.max(0, Math.round(amountCop))
  return Math.ceil(a * PASARELA_MICATALOGO_WITHDRAWAL_RATE)
}

/** Costo total al retirar un monto (0,02% + $900 fijos). */
export function pasarelaMicatalogoWithdrawalFeeCop(amountCop: number): number {
  return (
    pasarelaMicatalogoWithdrawalProportionalFeeCop(amountCop) + PASARELA_MICATALOGO_WITHDRAWAL_FIXED_COP
  )
}

export function pasarelaMicatalogoNetAfterWithdrawalCop(amountCop: number): number {
  const a = Math.max(0, Math.round(amountCop))
  return Math.max(0, a - pasarelaMicatalogoWithdrawalFeeCop(a))
}

export function onepayMerchantFeePerPaymentCop(grossCop: number): number {
  return pasarelaTxFeePerPaymentCop(grossCop)
}

export function onepayMerchantNetPerPaymentCop(grossCop: number): number {
  return pasarelaTxNetPerPaymentCop(grossCop)
}
