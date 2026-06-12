import type { McSalesVisit, McSalesVisitOutcome, McSalesVisitUpdate } from '@/types/mc'

function mapSalesVisitUpdate(raw: unknown): McSalesVisitUpdate | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const outcome: McSalesVisitOutcome =
    row.outcome === 'venta_exitosa' || row.outcome === 'pendiente' || row.outcome === 'rechazo'
      ? row.outcome
      : 'pendiente'
  if (typeof row.id !== 'string' || typeof row.description !== 'string') return null
  return {
    id: row.id,
    description: row.description,
    outcome,
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : 0,
  }
}

export function mapSalesVisitFromFirestore(id: string, data: Record<string, unknown>): McSalesVisit {
  const updates = Array.isArray(data.updates)
    ? data.updates.map(mapSalesVisitUpdate).filter((u): u is McSalesVisitUpdate => u != null)
    : undefined

  return {
    id,
    salesRepUid: typeof data.salesRepUid === 'string' ? data.salesRepUid : '',
    salesRepName: typeof data.salesRepName === 'string' ? data.salesRepName : '',
    storeName: typeof data.storeName === 'string' ? data.storeName : '',
    storeDetail: typeof data.storeDetail === 'string' ? data.storeDetail : undefined,
    tenantId: typeof data.tenantId === 'string' ? data.tenantId : undefined,
    tenantSlug: typeof data.tenantSlug === 'string' ? data.tenantSlug : undefined,
    outcome:
      data.outcome === 'venta_exitosa' || data.outcome === 'pendiente' || data.outcome === 'rechazo'
        ? data.outcome
        : 'pendiente',
    rejectionReason: typeof data.rejectionReason === 'string' ? data.rejectionReason : undefined,
    dateKey: typeof data.dateKey === 'string' ? data.dateKey : '',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : undefined,
    ...(updates && updates.length > 0 ? { updates } : {}),
  }
}
