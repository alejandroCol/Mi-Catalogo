import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

function callableError(e: unknown, fallback: string): { code: string; message: string } {
  if (e instanceof FirebaseError) {
    return { code: e.code, message: e.message || e.code }
  }
  return {
    code: 'unknown',
    message: e instanceof Error ? e.message : fallback,
  }
}

export async function callMcCreateSalesRep(input: {
  email: string
  password: string
  displayName: string
}): Promise<{ ok: true; uid: string } | { ok: false; message: string }> {
  try {
    const fn = httpsCallable<
      { email: string; password: string; displayName: string },
      { ok: true; uid: string }
    >(getFirebaseFunctions(), 'mcCreateSalesRep')
    const res = await fn(input)
    return { ok: true, uid: res.data.uid }
  } catch (e: unknown) {
    const err = callableError(e, 'No se pudo crear el vendedor.')
    return { ok: false, message: err.message }
  }
}

export async function callMcSetSalesRepActive(
  salesRepUid: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const fn = httpsCallable<{ salesRepUid: string; active: boolean }, { ok: true }>(
      getFirebaseFunctions(),
      'mcSetSalesRepActive',
    )
    await fn({ salesRepUid, active })
    return { ok: true }
  } catch (e: unknown) {
    const err = callableError(e, 'No se pudo actualizar el vendedor.')
    return { ok: false, message: err.message }
  }
}
