import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type Firestore,
} from 'firebase/firestore'
import { MC } from '@/lib/mcCollections'
import { mapFirestoreDataToMcUser } from '@/lib/mcUserFromFirestore'
import { mapSalesVisitFromFirestore } from '@/lib/mapSalesVisit'
import type { McSalesVisit, McUser } from '@/types/mc'

export type SalesRepRow = McUser & { visitCount: number; soldCount: number }

export type SalesVisitRow = McSalesVisit

export async function fetchSalesReps(db: Firestore): Promise<SalesRepRow[]> {
  const usersSnap = await getDocs(
    query(collection(db, MC.users), where('role', '==', 'sales_rep'), orderBy('createdAt', 'desc')),
  )
  const visitsSnap = await getDocs(collection(db, MC.salesVisits))

  const visitStats = new Map<string, { total: number; sold: number }>()
  visitsSnap.docs.forEach((d) => {
    const v = mapSalesVisitFromFirestore(d.id, d.data() as Record<string, unknown>)
    const prev = visitStats.get(v.salesRepUid) ?? { total: 0, sold: 0 }
    prev.total += 1
    if (v.outcome === 'venta_exitosa') prev.sold += 1
    visitStats.set(v.salesRepUid, prev)
  })

  return usersSnap.docs.map((d) => {
    const user = mapFirestoreDataToMcUser(d.id, d.data())
    const stats = visitStats.get(d.id) ?? { total: 0, sold: 0 }
    return { ...user, visitCount: stats.total, soldCount: stats.sold }
  })
}

export async function fetchAllSalesVisits(db: Firestore, dateKey?: string): Promise<SalesVisitRow[]> {
  const col = collection(db, MC.salesVisits)
  const q = dateKey
    ? query(col, where('dateKey', '==', dateKey), orderBy('createdAt', 'desc'))
    : query(col, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapSalesVisitFromFirestore(d.id, d.data() as Record<string, unknown>))
}

export function groupVisitsByDate(visits: SalesVisitRow[]): Map<string, SalesVisitRow[]> {
  const map = new Map<string, SalesVisitRow[]>()
  for (const v of visits) {
    const key = v.dateKey || 'sin-fecha'
    const list = map.get(key) ?? []
    list.push(v)
    map.set(key, list)
  }
  return map
}
