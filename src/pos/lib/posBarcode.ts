/** Código de barras interno POS (EAN-13, prefijo 20 = uso en tienda). */
export function generatePosCodigoBarras(): string {
  const ts = String(Date.now()).slice(-10)
  const raw = `20${ts}`.slice(0, 12)
  const digits = raw.padEnd(12, '0').split('').map(Number)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i]! * (i % 2 === 0 ? 1 : 3)
  }
  const check = (10 - (sum % 10)) % 10
  return `${raw}${check}`
}

/** Código interno / SKU autogenerado para artículos POS. */
export function generatePosCodigoInterno(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-6)
  return `P-${ts}`
}
