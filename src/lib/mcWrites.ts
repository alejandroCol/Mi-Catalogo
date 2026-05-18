import { deleteDoc, doc, updateDoc } from 'firebase/firestore'
import type { McProducto } from '@/types/mc'
import { getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'

export async function mcToggleProductoCatalogo(
  tenantId: string,
  p: McProducto & { id: string },
) {
  const db = getDb()
  await updateDoc(doc(db, mcProductosCollection(tenantId), p.id), {
    enCatalogo: !p.enCatalogo,
    updatedAt: Date.now(),
  })
}

export async function mcToggleProductoActivo(tenantId: string, p: McProducto & { id: string }) {
  const db = getDb()
  await updateDoc(doc(db, mcProductosCollection(tenantId), p.id), {
    activo: !p.activo,
    updatedAt: Date.now(),
  })
}

export async function mcDeleteProductoDoc(tenantId: string, productId: string) {
  await deleteDoc(doc(getDb(), mcProductosCollection(tenantId), productId))
}

export async function mcToggleProductoNovedad(tenantId: string, p: McProducto & { id: string }) {
  const db = getDb()
  await updateDoc(doc(db, mcProductosCollection(tenantId), p.id), {
    marcarNovedad: !p.marcarNovedad,
    updatedAt: Date.now(),
  })
}
