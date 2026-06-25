import {
  collection,
  doc,
  runTransaction,
  updateDoc,
} from 'firebase/firestore'
import type { McCategoria, McPlatformSettings, McProducto, McTenant } from '@/types/mc'
import { getDb } from '@/lib/firebase'
import {
  canAddProductos,
  productLimitMessage,
  resolvePlanConfig,
} from '@/lib/billingPlans'
import { MC, mcCategoriasCollection, mcProductosCollection } from '@/lib/mcCollections'
import { markPosProductPublished } from '@/pos/lib/posCatalogSync'

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
    tx.update(tenantRef, { productCount: Math.max(0, Math.trunc(count + 1)) })
  })

  return { id: productRef.id }
}

const BORRADOR_NOMBRE_DEFAULT = 'Borrador sin título'

/** Crea un producto marcado como borrador (inactivo y oculto del catálogo). */
export async function mcCreateProductoBorrador(
  tenantId: string,
  data: Omit<McProducto, 'id'>,
  platformSettings?: McPlatformSettings | null,
): Promise<{ id: string }> {
  return mcCreateProducto(
    tenantId,
    {
      ...data,
      nombre: data.nombre.trim() || BORRADOR_NOMBRE_DEFAULT,
      esBorrador: true,
      activo: false,
      enCatalogo: false,
    },
    platformSettings,
  )
}

export async function mcUpdateProductoBorrador(
  tenantId: string,
  productId: string,
  data: Partial<Omit<McProducto, 'id'>>,
) {
  const db = getDb()
  await updateDoc(doc(db, mcProductosCollection(tenantId), productId), {
    ...data,
    ...(data.nombre !== undefined && !data.nombre.trim()
      ? { nombre: BORRADOR_NOMBRE_DEFAULT }
      : {}),
    esBorrador: true,
    activo: false,
    enCatalogo: false,
    updatedAt: Date.now(),
  })
}

export async function mcToggleProductoCatalogo(
  tenantId: string,
  p: McProducto & { id: string },
) {
  const db = getDb()
  const nextEnCatalogo = !p.enCatalogo
  await updateDoc(doc(db, mcProductosCollection(tenantId), p.id), {
    enCatalogo: nextEnCatalogo,
    updatedAt: Date.now(),
  })
  if (nextEnCatalogo && p.origenPos && p.posPendientePublicar) {
    await markPosProductPublished(tenantId, p.id, p.posProductoId)
  }
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

export async function mcCreateCategoria(
  tenantId: string,
  data: Omit<McCategoria, 'id'>,
): Promise<{ id: string }> {
  const db = getDb()
  const ref = doc(collection(db, mcCategoriasCollection(tenantId)))
  await runTransaction(db, async (tx) => {
    tx.set(ref, data)
  })
  return { id: ref.id }
}

export async function mcUpdateCategoria(
  tenantId: string,
  categoriaId: string,
  patch: Partial<Pick<McCategoria, 'nombre' | 'orden' | 'activa' | 'parentId'>>,
) {
  const db = getDb()
  await updateDoc(doc(db, mcCategoriasCollection(tenantId), categoriaId), {
    ...patch,
    updatedAt: Date.now(),
  })
}

export async function mcDeleteCategoria(tenantId: string, categoriaId: string) {
  const db = getDb()
  await runTransaction(db, async (tx) => {
    tx.delete(doc(db, mcCategoriasCollection(tenantId), categoriaId))
  })
}
