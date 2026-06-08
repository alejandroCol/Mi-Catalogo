export type McBillingPeriod = 'monthly' | 'yearly'

export type NequiAccountStatus = {
  status?: string
  authorization?: boolean
}

/** Misma lógica que el backend (`accountReadyForDebit`). */
export function isNequiAccountReadyForDebit(acc: NequiAccountStatus): boolean {
  const st = (acc.status ?? '').toLowerCase()
  if (st === 'rejected' || st === 'inactive' || st === 'failed') return false
  if (st === 'pending' || st === 'validating' || st === 'waiting') return false
  if (acc.authorization === true) return true
  if (
    (st === 'active' || st === 'approved' || st === 'enabled' || st === 'linked') &&
    acc.authorization !== false
  ) {
    return true
  }
  return false
}
