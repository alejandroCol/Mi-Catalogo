import { seedPosDemoData, type SeedPosDemoResult } from '@/lib/seedPosDemoData'

export type McSeedPosDemoResult = SeedPosDemoResult

/** Carga data demo POS directo en Firestore (sin Cloud Function). */
export async function callMcSeedPosDemoData(
  tenantId: string,
): Promise<{ ok: true; data: McSeedPosDemoResult } | { ok: false; message: string }> {
  return seedPosDemoData(tenantId)
}
