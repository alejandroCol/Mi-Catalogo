import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

/** Debe coincidir con `MC_IMPERSONATE_TENANT_CLAIM` en Cloud Functions. */
export const MC_IMPERSONATE_TENANT_CLAIM = 'mcImpersonateTenantId'

export type McStartStoreImpersonationResult =
  | {
      ok: true
      sessionId: string
      tenantId: string
      tenantSlug: string
      tenantName: string
      startedAt: number
    }
  | { ok: false; code: string; message: string }

export type McStopStoreImpersonationResult =
  | { ok: true; sessionId: string; tenantId: string }
  | { ok: false; code: string; message: string }

function callableError(e: unknown, fallback: string): { code: string; message: string } {
  if (e instanceof FirebaseError) {
    return { code: e.code, message: e.message || e.code }
  }
  return {
    code: 'unknown',
    message: e instanceof Error ? e.message : fallback,
  }
}

export async function callMcStartStoreImpersonation(
  tenantId: string,
): Promise<McStartStoreImpersonationResult> {
  try {
    const fn = httpsCallable<{ tenantId: string }, McStartStoreImpersonationResult & { ok: true }>(
      getFirebaseFunctions(),
      'mcStartStoreImpersonation',
    )
    const res = await fn({ tenantId })
    const data = res.data
    return {
      ok: true,
      sessionId: data.sessionId,
      tenantId: data.tenantId,
      tenantSlug: data.tenantSlug,
      tenantName: data.tenantName,
      startedAt: data.startedAt,
    }
  } catch (e: unknown) {
    const err = callableError(e, 'No se pudo iniciar el modo soporte.')
    return { ok: false, ...err }
  }
}

export async function callMcStopStoreImpersonation(): Promise<McStopStoreImpersonationResult> {
  try {
    const fn = httpsCallable<Record<string, never>, McStopStoreImpersonationResult & { ok: true }>(
      getFirebaseFunctions(),
      'mcStopStoreImpersonation',
    )
    const res = await fn({})
    const data = res.data
    return { ok: true, sessionId: data.sessionId, tenantId: data.tenantId }
  } catch (e: unknown) {
    const err = callableError(e, 'No se pudo salir del modo soporte.')
    return { ok: false, ...err }
  }
}

export function readImpersonateTenantIdFromClaims(
  claims: Record<string, unknown> | undefined,
): string | null {
  if (!claims) return null
  const raw = claims[MC_IMPERSONATE_TENANT_CLAIM]
  if (typeof raw !== 'string') return null
  const tid = raw.trim()
  return tid.length > 0 ? tid : null
}
