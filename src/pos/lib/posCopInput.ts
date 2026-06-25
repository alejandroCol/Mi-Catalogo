import { formatIntegerEsCo } from '@/lib/formatCop'

export function formatCopInputWhileTyping(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const n = Math.min(999_999_999, Number(digits))
  return formatIntegerEsCo(n)
}

export function parseCopInput(raw: string): number {
  const d = raw.replace(/\D/g, '')
  if (!d) return 0
  return Math.max(0, Math.min(999_999_999, Math.round(Number(d))))
}
