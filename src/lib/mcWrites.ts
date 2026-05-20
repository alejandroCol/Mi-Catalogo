import {
  collection,
  doc,
  runTransaction,
  updateDoc,
} from 'firebase/firestore'
import type { McPlatformSettings, McProducto, McTenant } from '@/types/mc'
import { getDb } from '@/lib/firebase'
import {
  canAddProductos,
  productLimitMessage,
  resolvePlanConfig,
} from '@/lib/billingPlans'
import { MC, mcProductosCollection } from '@/lib/mcCollections'

export class ProductLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProductLimitError'
  }
}

/** Sincroniza el contador cuando difiere del inventario real (migración / corrección). */
export async function mcSyncProductCount(tenantId: string, actualCount: number) {
  await updateDoc(doc(getDb(), MC.tenants, tenantId), {
    productCount: Math.max(0, actualCount),
  })
}

export async function mcCreateProducto(
  tenantId: string,
  data: Omit<McProducto, 'id'>,
  platformSettings?: McPlatformSettings | null,
): Promise<{ id: string }> {
  const db = getDb()
  const config = resolvePlanConfig(platformSettings)
  const col = collection(db, mcProductosCollection(tenantId))
  const productRef = doc(col)

  await runTransaction(db, async (tx) => {
    const tenantRef = doc(db, MC.tenants, tenantId)
    const tenantSnap = await tx.get(tenantRef)
    if (!tenantSnap.exists()) throw new Error('Tienda no encontrada')
    const tenant = tenantSnap.data() as McTenant
    const count = typeof tenant.productCount === 'number' ? tenant.productCount : 0
    if (!canAddProductos(tenant, config, count)) {
      throw new ProductLimitError(
        productLimitMessage(tenant, config, count) ?? 'Límite de productos alcanzado.',
      )
    }
    tx.set(productRef, data)
    tx.update(tenantRef, { productCount: count + 1 })
  })

  return { id: productRef.id }
}

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
  const db = getDb()
  await runTransaction(db, async (tx) => {
    const tenantRef = doc(db, MC.tenants, tenantId)
    const productRef = doc(db, mcProductosCollection(tenantId), productId)
    const tenantSnap = await tx.get(tenantRef)
    const count =
      tenantSnap.exists() && typeof tenantSnap.data()?.productCount === 'number'
        ? tenantSnap.data()!.productCount
        : 0
    tx.delete(productRef)
    tx.update(tenantRef, { productCount: Math.max(0, count - 1) })
  })
}

export async function mcToggleProductoNovedad(tenantId: string, p: McProducto & { id: string }) {
  const db = getDb()
  await updateDoc(doc(db, mcProductosCollection(tenantId), p.id), {
    marcarNovedad: !p.marcarNovedad,
    updatedAt: Date.now(),
  })
}
