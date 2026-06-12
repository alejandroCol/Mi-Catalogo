import type { McSalesVisitOutcome } from '@/types/mc'

const OUTCOME_LABELS: Record<McSalesVisitOutcome, string> = {
  venta_exitosa: 'Venta exitosa',
  pendiente: 'Pendiente',
  rechazo: 'Rechazo',
}

export function salesVisitOutcomeLabel(outcome: McSalesVisitOutcome): string {
  return OUTCOME_LABELS[outcome]
}

export function formatSalesVisitDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return dateKey
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatSalesVisitTimestamp(ms: number): string {
  return new Date(ms).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
