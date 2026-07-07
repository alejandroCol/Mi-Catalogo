type FirebaseLikeError = {
  code?: string
  message?: string
}

function errorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as FirebaseLikeError).code ?? '')
  }
  return ''
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim()
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as FirebaseLikeError).message ?? '').trim()
    if (msg) return msg
  }
  return ''
}

/** Mensaje claro para fallos al guardar productos (Firestore / Storage). */
export function productSaveErrorMessage(err: unknown, fallback: string): string {
  const code = errorCode(err)
  const msg = errorMessage(err)

  if (msg === 'Tienda no encontrada') {
    return 'No encontramos la tienda. Recargá la página e intentá de nuevo.'
  }

  if (code === 'permission-denied') {
    return 'Permiso denegado al guardar. Si la tienda fue creada desde admin, asegurate de haber iniciado sesión con el correo del comerciante o usá «Entrar como tienda» desde súper admin. Si acabás de cambiar el plan a Expert, asigná una fecha de vencimiento.'
  }

  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return 'Sin conexión estable con el servidor. Revisá tu internet e intentá otra vez.'
  }

  if (code === 'failed-precondition') {
    return 'No se pudo completar la operación (conflicto de datos). Recargá inventario e intentá de nuevo.'
  }

  if (code === 'storage/unauthorized') {
    return 'No se pudo subir la imagen: permiso denegado en Storage.'
  }

  if (code.startsWith('storage/')) {
    return 'No se pudo subir la imagen. Revisá conexión e intentá otra vez.'
  }

  if (msg.includes('Unsupported field value: undefined')) {
    return 'Hay un dato incompleto en el formulario. Revisá nombre, precio y productos del combo.'
  }

  if (msg) return msg

  return fallback
}
