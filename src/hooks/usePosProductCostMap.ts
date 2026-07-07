import { useMemo } from 'react'
import { usePosProductos } from '@/pos/hooks/usePosProductos'
import type { ProductCostLookup } from '@/lib/reports/profitMetrics'

export function usePosProductCostMap(tenantId: string | null | undefined, sedeId?: string | null) {
  const { productos, loading } = usePosProductos(tenantId, sedeId ?? undefined)

  const costMap: ProductCostLookup = useMemo(() => {
    const map: ProductCostLookup = new Map()
    for (const p of productos) {
      map.set(p.id, { precioCostoCop: p.precioCostoCop })
    }
    return map
  }, [productos])

  return { productos, costMap, loading }
}
