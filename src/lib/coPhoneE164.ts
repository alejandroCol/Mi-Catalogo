/** Normaliza teléfono colombiano a E.164 (+57…). */
export function normalizeCoPhoneE164(raw: string): string | null {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return null
  const digits = (t.startsWith('+') ? t.slice(1) : t).replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('57') && digits.length >= 12) return `+${digits.slice(0, 12)}`
  if (digits.length === 10 && digits.startsWith('3')) return `+57${digits}`
  if (/^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`
  return null
}
