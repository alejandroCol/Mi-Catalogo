import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'
import { mapRecuperacionEmailError } from '@/lib/recuperacionEmailErrors'

export type McSendCarritoRecuperacionEmailResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

export async function callMcSendCarritoRecuperacionEmail(opts: {
  carritoId: string
  descuentoPorcentaje: number
}): Promise<McSendCarritoRecuperacionEmailResult> {
  try {
    const fn = httpsCallable<
      { carritoId: string; descuentoPorcentaje: number },
      { ok?: boolean }
    >(getFirebaseFunctions(), 'mcSendCarritoRecuperacionEmail')
    await fn({
      carritoId: opts.carritoId,
      descuentoPorcentaje: opts.descuentoPorcentaje,
    })
    return { ok: true }
  } catch (e: unknown) {
    if (e instanceof FirebaseError) {
      return {
        ok: false,
        code: e.code,
        message: mapRecuperacionEmailError(e.code, e.message || e.code),
      }
    }
    return {
      ok: false,
      code: 'unknown',
      message: mapRecuperacionEmailError(
        'unknown',
        e instanceof Error ? e.message : 'Error al enviar el correo.',
      ),
    }
  }
}
