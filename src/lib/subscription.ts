/** Duración de prueba al registrarse (días). */
export const MC_TRIAL_DAYS = 7

export function trialEndMs(): number {
  return Date.now() + MC_TRIAL_DAYS * 24 * 60 * 60 * 1000
}

export function isSubscriptionActive(subscriptionEndsAt: number): boolean {
  return subscriptionEndsAt > Date.now()
}

export function extendSubscription(currentEndsAt: number, addMs: number): number {
  const base = Math.max(currentEndsAt, Date.now())
  return base + addMs
}

/** Fija el vencimiento como ahora + duración (alta o reset de plan desde hoy). */
export function setSubscriptionFromNow(addMs: number): number {
  return Date.now() + addMs
}

export const MS_DAY = 24 * 60 * 60 * 1000
/** Igual al trial de registro (ver MC_TRIAL_DAYS). */
export const MS_TRIAL = MC_TRIAL_DAYS * MS_DAY
export const MS_MONTH = 30 * 24 * 60 * 60 * 1000
export const MS_YEAR = 365 * 24 * 60 * 60 * 1000
