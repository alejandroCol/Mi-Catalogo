import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

export type McSendAuthVerificationResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

/**
 * Envía el correo de verificación vía Cloud Function + Resend (no usa el mail por defecto de Firebase).
 */
export async function callMcSendAuthVerificationEmail(): Promise<McSendAuthVerificationResult> {
  try {
    const fn = httpsCallable<Record<string, never>, { ok?: boolean }>(
      getFirebaseFunctions(),
      'mcSendEmailVerification',
    )
    await fn({})
    return { ok: true }
  } catch (e: unknown) {
    if (e instanceof FirebaseError) {
      return { ok: false, code: e.code, message: e.message || e.code }
    }
    return {
      ok: false,
      code: 'unknown',
      message: e instanceof Error ? e.message : 'Error al solicitar el correo.',
    }
  }
}
