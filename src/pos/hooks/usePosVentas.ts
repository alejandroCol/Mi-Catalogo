import { useEffect, useState } from 'react'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosVentasCollection } from '@/lib/mcPosCollections'
import type { McPosVenta } from '@/types/mc'

function mergeVentasById(
  primary: (McPosVenta & { id: string })[],
  secondary: (McPosVenta & { id: string })[],
): (McPosVenta & { id: string })[] {
  const map = new Map<string, McPosVenta & { id: string }>()
  for (const v of primary) map.set(v.id, v)
  for (const v of secondary) map.set(v.id, v)
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt)
}

export function usePosVentas(
  tenantId: string | null | undefined,
  opts?: {
    sedeId?: string | null
    desdeMs?: number
    hastaMs?: number
    /** Incluye ventas contra entrega cobradas en el rango (aunque se hayan creado antes). */
    cobradasDesdeMs?: number
    cobradasHastaMs?: number
    max?: number
    enabled?: boolean
  },
) {
  const [ventas, setVentas] = useState<(McPosVenta & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const enabled = opts?.enabled !== false

  useEffect(() => {
    if (!tenantId || !enabled) {
      setVentas([])
      setLoading(false)
      return
    }
    const db = getDb()
    const constraints: QueryConstraint[] = []
    if (opts?.sedeId) constraints.push(where('sedeId', '==', opts.sedeId))
    if (opts?.desdeMs != null) constraints.push(where('createdAt', '>=', opts.desdeMs))
    if (opts?.hastaMs != null) constraints.push(where('createdAt', '<', opts.hastaMs))
    constraints.push(orderBy('createdAt', 'desc'))
    if (opts?.max) constraints.push(limit(opts.max))

    const q = query(collection(db, mcPosVentasCollection(tenantId)), ...constraints)

    const cobradasDesdeMs = opts?.cobradasDesdeMs
    const cobradasHastaMs = opts?.cobradasHastaMs
    const needsCobradasQuery = cobradasDesdeMs != null && cobradasHastaMs != null

    let primary: (McPosVenta & { id: string })[] = []
    let secondary: (McPosVenta & { id: string })[] = []
    let primaryReady = false
    let secondaryReady = !needsCobradasQuery

    function publish() {
      if (!primaryReady || !secondaryReady) return
      setVentas(needsCobradasQuery ? mergeVentasById(primary, secondary) : primary)
      setLoading(false)
    }

    const unsubPrimary = onSnapshot(
      q,
      (snap) => {
        primary = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPosVenta, 'id'>) }))
        primaryReady = true
        publish()
      },
      () => {
        primaryReady = true
        publish()
      },
    )

    let unsubSecondary = () => {}
    if (needsCobradasQuery) {
      const cobradasConstraints: QueryConstraint[] = [
        where('pagadoAt', '>=', cobradasDesdeMs!),
        where('pagadoAt', '<', cobradasHastaMs!),
        orderBy('pagadoAt', 'desc'),
      ]
      if (opts?.sedeId) {
        cobradasConstraints.unshift(where('sedeId', '==', opts.sedeId))
      }
      const qCobradas = query(collection(db, mcPosVentasCollection(tenantId)), ...cobradasConstraints)
      unsubSecondary = onSnapshot(
        qCobradas,
        (snap) => {
          secondary = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPosVenta, 'id'>) }))
          secondaryReady = true
          publish()
        },
        () => {
          secondaryReady = true
          publish()
        },
      )
    }

    return () => {
      unsubPrimary()
      unsubSecondary()
    }
  }, [
    tenantId,
    enabled,
    opts?.sedeId,
    opts?.desdeMs,
    opts?.hastaMs,
    opts?.cobradasDesdeMs,
    opts?.cobradasHastaMs,
    opts?.max,
  ])

  return { ventas, loading }
}
