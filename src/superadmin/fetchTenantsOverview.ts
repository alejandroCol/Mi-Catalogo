import {
  type Firestore,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'
import { MC, mcPedidosCollection, mcProductosCollection } from '@/lib/mcCollections'
import type { McTenant, McUser } from '@/types/mc'

export type TenantOverviewRow = {
  tenant: McTenant & { id: string }
  productCount: number
  pedidosCount: number
  ownerEmail: string | null
  ownerDisplayName: string | null
}

export async function fetchTenantsOverview(db: Firestore): Promise<TenantOverviewRow[]> {
  const q = query(collection(db, MC.tenants), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data() as Omit<McTenant, 'id'>
      const id = d.id
      const tenant = { id, ...data }
      const [prodCount, pedCount, ownerSnap] = await Promise.all([
        getCountFromServer(collection(db, mcProductosCollection(id))),
        getCountFromServer(collection(db, mcPedidosCollection(id))),
        getDoc(doc(db, MC.users, data.ownerUid)),
      ])
      let ownerEmail: string | null = null
      let ownerDisplayName: string | null = null
      if (ownerSnap.exists()) {
        const u = ownerSnap.data() as Omit<McUser, 'uid'>
        ownerEmail = u.email ?? null
        ownerDisplayName = u.displayName ?? null
      }
      return {
        tenant,
        productCount: prodCount.data().count,
        pedidosCount: pedCount.data().count,
        ownerEmail,
        ownerDisplayName,
      }
    }),
  )
}
