/** Teléfono Colombia → E.164 para OnePay (mismo criterio que pedidos en index.ts). */

function formatCoPhone(raw: string): string | undefined {
  const d = raw.replace(/\D/g, '')
  if (!d) return undefined
  if (d.startsWith('57') && d.length >= 12) return `+${d}`
  if (d.length === 10 && d.startsWith('3')) return `+57${d}`
  return undefined
}

export function billingPhoneE164Co(raw: string): string {
  const t = raw.trim().replace(/\s/g, '')
  if (t.startsWith('+')) {
    if (/^\+[1-9]\d{7,14}$/.test(t)) return t
  }
  const co = formatCoPhone(raw)
  if (co) return co
  throw new Error('Teléfono inválido. Usá móvil colombiano de 10 dígitos (ej. 3001234567).')
}
