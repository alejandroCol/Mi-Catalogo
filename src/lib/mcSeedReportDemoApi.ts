import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

export type McSeedReportDemoResult = {
  ok: true
  tenantId: string
  dias: number
  ordenesCatalogo: number
  ventasPos: number
  analyticsDaily: number
  productosCatalogoUsados: number
  productosPosUsados: number
  sedesPosUsadas: number
}

function seedErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: string }).code)
      : ''
  const message =
    err && typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: string }).message)
      : ''
  if (code === 'functions/not-found' || code === 'functions/internal') {
    return 'La función mcSeedReportDemoData no está desplegada. Ejecutá: npm run deploy:functions (o deploy solo esa función).'
  }
  if (code === 'functions/failed-precondition' && message) return message
  if (code === 'functions/permission-denied' && message) return message
  if (code === 'functions/unauthenticated') return 'Sesión expirada. Volvé a iniciar sesión.'
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'No se pudo conectar con Cloud Functions. Verificá que mcSeedReportDemoData esté desplegada.'
  }
  return message || 'No se pudo cargar la data demo para reportes.'
}

/** Genera ventas, órdenes y analytics demo usando los productos existentes de la tienda. */
export async function callMcSeedReportDemoData(
  tenantId: string,
): Promise<{ ok: true; data: McSeedReportDemoResult } | { ok: false; message: string }> {
  try {
    const fn = httpsCallable<{ tenantId: string }, McSeedReportDemoResult>(
      getFirebaseFunctions(),
      'mcSeedReportDemoData',
    )
    const res = await fn({ tenantId })
    return { ok: true, data: res.data }
  } catch (err) {
    console.error('[callMcSeedReportDemoData]', err)
    return { ok: false, message: seedErrorMessage(err) }
  }
}
