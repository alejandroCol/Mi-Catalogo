import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

export type McChangeStoreSlugResult = {
  ok: true
  slug: string
  storeUrl: string
  unchanged?: boolean
  changedAt?: number
}

export async function callMcChangeStoreSlug(slug: string): Promise<McChangeStoreSlugResult> {
  const fn = httpsCallable<{ slug: string }, McChangeStoreSlugResult>(
    getFirebaseFunctions(),
    'mcChangeStoreSlug',
  )
  const res = await fn({ slug })
  return res.data
}

export function mapChangeStoreSlugError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: string }).code)
    if (code === 'functions/unauthenticated') return 'Iniciá sesión para continuar.'
    if (code === 'functions/permission-denied') {
      const message =
        'message' in err && typeof (err as { message: string }).message === 'string'
          ? (err as { message: string }).message
          : ''
      return message || 'No tenés permiso para cambiar el dominio.'
    }
    if (code === 'functions/failed-precondition' || code === 'functions/invalid-argument') {
      const message =
        'message' in err && typeof (err as { message: string }).message === 'string'
          ? (err as { message: string }).message
          : ''
      return message || 'No se pudo cambiar el dominio.'
    }
  }
  return 'No se pudo cambiar el dominio. Intentá de nuevo.'
}
