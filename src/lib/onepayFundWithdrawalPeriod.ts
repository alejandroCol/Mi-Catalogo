export type OnepayFundWithdrawalPeriod = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export const ONEPAY_FUND_WITHDRAWAL_PERIODS: OnepayFundWithdrawalPeriod[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
]

export function isOnepayFundWithdrawalPeriod(v: unknown): v is OnepayFundWithdrawalPeriod {
  return (
    v === 'daily' || v === 'weekly' || v === 'biweekly' || v === 'monthly'
  )
}

export function onepayFundWithdrawalPeriodLabel(p: OnepayFundWithdrawalPeriod): string {
  switch (p) {
    case 'daily':
      return 'Diariamente'
    case 'weekly':
      return 'Semanalmente'
    case 'biweekly':
      return 'Quincenalmente'
    case 'monthly':
      return 'Mensualmente'
  }
}

export function onepayFundWithdrawalPeriodShort(p: OnepayFundWithdrawalPeriod): string {
  switch (p) {
    case 'daily':
      return 'cada día'
    case 'weekly':
      return 'cada semana'
    case 'biweekly':
      return 'cada quincena'
    case 'monthly':
      return 'cada mes'
  }
}
