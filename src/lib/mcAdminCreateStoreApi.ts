import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

const CALLABLE_MESSAGES: Record<string, string> = {
  'functions/unauthenticated': 'Sesión expirada. Volvé a iniciar sesión.',
  'functions/permission-denied': 'Solo súper admin puede crear tiendas.',
  'functions/invalid-argument': 'Revisá los datos del formulario.',
  'functions/already-exists': 'Ya existe una cuenta o enlace con esos datos.',
  'functions/resource-exhausted': 'No se pudo generar un enlace disponible. Probá otro nombre.',
  'functions/internal':
    'Error del servidor al crear la tienda. Si persiste, contactá soporte.',
}

function callableError(e: unknown, fallback: string): string {
  if (e instanceof FirebaseError) {
    const byCode = CALLABLE_MESSAGES[e.code]
    if (byCode) return byCode
    const msg = (e.message || '').trim()
    if (msg && msg !== 'internal' && !msg.startsWith('functions/')) return msg
    return e.code.replace(/^functions\//, '') || fallback
  }
  return e instanceof Error ? e.message : fallback
}

export type McAdminCreateStoreInput = {
  nombreTienda: string
  email: string
  password: string
  whatsappNumero: string
  slug?: string
}

export type McAdminCreateStoreResult = {
  tenantId: string
  ownerUid: string
  slug: string
  storeUrl: string
  emailVerified: boolean
}

export async function callMcAdminCreateStore(
  input: McAdminCreateStoreInput,
): Promise<{ ok: true; data: McAdminCreateStoreResult } | { ok: false; message: string }> {
  try {
    const fn = httpsCallable<McAdminCreateStoreInput, McAdminCreateStoreResult & { ok: true }>(
      getFirebaseFunctions(),
      'mcAdminCreateStore',
    )
    const res = await fn(input)
    const { tenantId, ownerUid, slug, storeUrl, emailVerified } = res.data
    return {
      ok: true,
      data: { tenantId, ownerUid, slug, storeUrl, emailVerified },
    }
  } catch (e: unknown) {
    return { ok: false, message: callableError(e, 'No se pudo crear la tienda.') }
  }
}
