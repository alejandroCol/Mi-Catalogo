import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

export async function callMcCatalogPublish(): Promise<{ ok: true; publishedAt: number }> {
  const fn = httpsCallable<Record<string, never>, { ok: true; publishedAt: number }>(
    getFirebaseFunctions(),
    'mcCatalogPublish',
  )
  const res = await fn({})
  return res.data
}

export async function callMcCatalogUnpublish(): Promise<{ ok: true; alreadyUnpublished?: boolean }> {
  const fn = httpsCallable<Record<string, never>, { ok: true; alreadyUnpublished?: boolean }>(
    getFirebaseFunctions(),
    'mcCatalogUnpublish',
  )
  const res = await fn({})
  return res.data
}
