/**
 * Origen público para enlaces en correos de Firebase Authentication (verificación de cuenta).
 * En producción definí `VITE_MC_PUBLIC_ORIGIN=https://micatalogo.io` en el build.
 *
 * El **host** de la URL que arma `mcAuthEmailContinueUrl()` tiene que estar en
 * Firebase Console → Authentication → Configuración → Dominios autorizados
 * (incluí `localhost` para desarrollo y el host real de hosting / preview).
 */
export const MC_PUBLIC_ORIGIN_FALLBACK = 'https://micatalogo.io'

/** Ruta pública donde aterriza el usuario tras abrir el enlace del correo de Firebase. */
export const MC_AUTH_EMAIL_CONTINUE_PATH = '/verificar-email'

export function mcPublicOriginForAuthEmails(): string {
  const env = import.meta.env.VITE_MC_PUBLIC_ORIGIN as string | undefined
  const trimmed = env?.trim().replace(/\/$/, '')
  if (trimmed?.startsWith('http://') || trimmed?.startsWith('https://')) {
    return trimmed
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return MC_PUBLIC_ORIGIN_FALLBACK
}

/** URL del enlace post-verificación (misma que usa la Cloud Function con `MC_PUBLIC_ORIGIN`). */
export function mcAuthEmailContinueUrl(): string {
  const origin = mcPublicOriginForAuthEmails().replace(/\/$/, '')
  return `${origin}${MC_AUTH_EMAIL_CONTINUE_PATH}`
}

/** Si usás SMTP propio en Firebase Authentication → Templates (mismo dominio que Resend). */
export const MC_FIREBASE_SMTP_SENDER = 'Mi Catálogo <notificaciones@micatalogo.io>'
