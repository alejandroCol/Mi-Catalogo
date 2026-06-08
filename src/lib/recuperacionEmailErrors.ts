/** Mensajes amigables para errores al enviar correo de recuperación de carrito. */
export function mapRecuperacionEmailError(code: string, message: string): string {
  const msg = message.trim()
  if (code === 'functions/resource-exhausted') {
    return 'Esperá unos minutos antes de reenviar el correo a este cliente.'
  }
  if (code === 'functions/unauthenticated') {
    return 'Tu sesión expiró. Volvé a iniciar sesión e intentá de nuevo.'
  }
  if (code === 'functions/not-found') {
    return 'No encontramos ese carrito. Actualizá la página e intentá de nuevo.'
  }
  if (code === 'functions/permission-denied') {
    return 'Solo el dueño de la tienda puede enviar recordatorios por correo.'
  }
  if (code === 'functions/failed-precondition') {
    if (msg.length > 8 && !msg.startsWith('Firebase')) return msg
    return 'No se puede enviar el correo con los datos actuales del carrito.'
  }
  if (code === 'functions/internal') {
    if (msg.length > 8 && !msg.startsWith('Firebase') && !msg.startsWith('INTERNAL')) return msg
    return 'No pudimos enviar el correo. Revisá la conexión e intentá en unos minutos.'
  }
  if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') {
    return 'El servicio no respondió a tiempo. Intentá de nuevo en unos segundos.'
  }
  if (code === 'functions/not-found' || msg.includes('not-found') || msg.includes('NOT FOUND')) {
    return 'El servicio de correo aún no está disponible. Contactá soporte si persiste.'
  }
  if (msg.length > 8 && !msg.startsWith('Firebase')) return msg
  return 'No se pudo enviar el correo de recuperación.'
}
