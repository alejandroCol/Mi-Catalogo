import {
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore'
import { mcProductosCollection } from '@/lib/mcCollections'
import type { McProducto } from '@/types/mc'

export const TENANT_PRODUCTS_PAGE_SIZE = 10

export type TenantProductPreview = Pick<
  McProducto,
  'nombre' | 'precioCop' | 'referencia' | 'imageUrl' | 'activo' | 'enCatalogo'
> & { id: string }

export type FetchTenantProductsPageResult = {
  products: TenantProductPreview[]
  hasMore: boolean
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
}

function mapProductDoc(d: QueryDocumentSnapshot<DocumentData>): TenantProductPreview {
  const data = d.data() as Omit<McProducto, 'id'>
  return {
    id: d.id,
    nombre: data.nombre,
    precioCop: data.precioCop,
    referencia: data.referencia,
    imageUrl: data.imageUrl,
    activo: data.activo,
    enCatalogo: data.enCatalogo,
  }
}

export async function fetchTenantProductsPage(
  db: Firestore,
  tenantId: string,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null,
): Promise<FetchTenantProductsPageResult> {
  const base = collection(db, mcProductosCollection(tenantId))
  const q = cursor
    ? query(
        base,
        orderBy('orden', 'asc'),
        startAfter(cursor),
        limit(TENANT_PRODUCTS_PAGE_SIZE + 1),
      )
    : query(base, orderBy('orden', 'asc'), limit(TENANT_PRODUCTS_PAGE_SIZE + 1))

  const snap = await getDocs(q)
  const docs = snap.docs
  const hasMore = docs.length > TENANT_PRODUCTS_PAGE_SIZE
  const pageDocs = hasMore ? docs.slice(0, TENANT_PRODUCTS_PAGE_SIZE) : docs

  return {
    products: pageDocs.map(mapProductDoc),
    hasMore,
    lastDoc: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1]! : null,
  }
}
