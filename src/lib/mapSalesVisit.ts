import type { McSalesVisit } from '@/types/mc'

export function mapSalesVisitFromFirestore(id: string, data: Record<string, unknown>): McSalesVisit {
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
  }
}
