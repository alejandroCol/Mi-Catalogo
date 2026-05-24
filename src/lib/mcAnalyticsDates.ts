/** Zona horaria de negocio para agrupar métricas diarias. */
export const MC_ANALYTICS_TIMEZONE = 'America/Bogota'

export function mcAnalyticsDateKeyBogota(ms = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MC_ANALYTICS_TIMEZONE }).format(new Date(ms))
}

export function mcAnalyticsDateKeysForPeriod(days: number, endMs = Date.now()): string[] {
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(mcAnalyticsDateKeyBogota(endMs - i * 24 * 60 * 60 * 1000))
  }
  return keys
}

export function mcAnalyticsShortDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return dateKey
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
  })
}

const SESSION_STORAGE_KEY = 'mc_analytics_session_id'

/** Identificador de sesión anónimo para deduplicar visitas diarias. */
export function getMcAnalyticsSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) return existing
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
    return id
  } catch {
    return `fallback-${Date.now()}`
  }
}
