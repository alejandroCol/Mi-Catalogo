/** Mensaje legible desde errores de httpsCallable (Firebase Functions). */
export function liveCallableErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const o = err as { message?: unknown; details?: unknown }
    if (typeof o.message === 'string' && o.message.trim()) {
      return o.message.trim()
    }
    if (typeof o.details === 'string' && o.details.trim()) {
      return o.details.trim()
    }
  }
  return 'No se pudo completar la operación.'
}
