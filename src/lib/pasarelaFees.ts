/** Tarifa Mi Catálogo al retirar con pasarela sin registro OnePay (no por transacción). */
export const PASARELA_MICATALOGO_WITHDRAWAL_RATE = 0.0002
export const PASARELA_MICATALOGO_WITHDRAWAL_FIXED_COP = 900

/** Comisión OnePay documentada en KYB (referencia para pasarela propia). */
export const ONEPAY_MERCHANT_TX_RATE = 0.0349
export const ONEPAY_MERCHANT_TX_FIXED_COP = 800

/** Comisión proporcional estimada por cobro (solo visualización en saldo). */
export function pasarelaMicatalogoFeePerPaymentCop(grossCop: number): number {
  const g = Math.max(0, Math.round(grossCop))
  return Math.ceil(g * PASARELA_MICATALOGO_WITHDRAWAL_RATE)
}

export function pasarelaMicatalogoNetPerPaymentCop(grossCop: number): number {
  const g = Math.max(0, Math.round(grossCop))
  return Math.max(0, g - pasarelaMicatalogoFeePerPaymentCop(g))
}

/** Costo total al retirar un monto (incluye fijo $900). */
export function pasarelaMicatalogoWithdrawalFeeCop(amountCop: number): number {
  const a = Math.max(0, Math.round(amountCop))
  return pasarelaMicatalogoFeePerPaymentCop(a) + PASARELA_MICATALOGO_WITHDRAWAL_FIXED_COP
}

export function pasarelaMicatalogoNetAfterWithdrawalCop(amountCop: number): number {
  const a = Math.max(0, Math.round(amountCop))
  return Math.max(0, a - pasarelaMicatalogoWithdrawalFeeCop(a))
}

export function onepayMerchantFeePerPaymentCop(grossCop: number): number {
  const g = Math.max(0, Math.round(grossCop))
  return Math.ceil(g * ONEPAY_MERCHANT_TX_RATE + ONEPAY_MERCHANT_TX_FIXED_COP)
}

export function onepayMerchantNetPerPaymentCop(grossCop: number): number {
  const g = Math.max(0, Math.round(grossCop))
  return Math.max(0, g - onepayMerchantFeePerPaymentCop(g))
}
