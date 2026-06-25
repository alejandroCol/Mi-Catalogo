import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { mcProductosCollection } from '@/lib/mcCollections'
import { mcPosProductosCollection } from '@/lib/mcPosCollections'
import { getDb } from '@/lib/firebase'
import type { McPosProducto, McPosStock } from '@/types/mc'

export function sumStockForProduct(stock: McPosStock[], productoId: string): number {
  return stock.reduce((s, row) => (row.productoId === productoId ? s + row.cantidad : s), 0)
}

export function stockByVarianteForProduct(
  stock: McPosStock[],
  productoId: string,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of stock) {
    if (row.productoId !== productoId || !row.varianteId) continue
    map.set(row.varianteId, (map.get(row.varianteId) ?? 0) + row.cantidad)
  }
  return map
}

/** Reemplaza stock de un producto en una sede y devuelve el inventario global simulado. */
export function mergeSedeStockIntoGlobal(
  stockGlobal: McPosStock[],
  productoId: string,
  sedeId: string,
  sedeRows: { varianteId?: string; cantidad: number }[],
): McPosStock[] {
  const rest = stockGlobal.filter((s) => !(s.productoId === productoId && s.sedeId === sedeId))
  return [
    ...rest,
    ...sedeRows.map((r) => ({
      id: '',
      sedeId,
      productoId,
      varianteId: r.varianteId,
      cantidad: r.cantidad,
      updatedAt: Date.now(),
    })),
  ]
}

/** Sincroniza stock del catálogo desde el stock POS total de un producto. */
export async function syncCatalogStockFromPos(
  tenantId: string,
  posProductoId: string,
  stockTotal: number,
  stockGlobal?: McPosStock[],
) {
  const db = getDb()
  const posSnap = await getDoc(doc(db, mcPosProductosCollection(tenantId), posProductoId))
  if (!posSnap.exists()) return
  const pos = posSnap.data() as McPosProducto
  if (!pos.catalogProductoId) return

  const catalogRef = doc(db, mcProductosCollection(tenantId), pos.catalogProductoId)
  const catalogSnap = await getDoc(catalogRef)
  if (!catalogSnap.exists()) return
  const catalog = catalogSnap.data() as { esRopa?: boolean; tallas?: { id: string; nombre: string; stock: number }[] }

  const patch: Record<string, unknown> = {
    stock: Math.max(0, stockTotal),
    updatedAt: Date.now(),
  }

  if (catalog.esRopa && catalog.tallas?.length && stockGlobal) {
    const byVariante = stockByVarianteForProduct(stockGlobal, posProductoId)
    patch.tallas = catalog.tallas.map((t) => ({
      ...t,
      stock: Math.max(0, byVariante.get(t.id) ?? 0),
    }))
  }

  await updateDoc(catalogRef, patch)
}

/** Marca producto POS y catálogo como publicados tras completar ficha. */
export async function markPosProductPublished(
  tenantId: string,
  catalogProductoId: string,
  posProductoId?: string,
) {
  const db = getDb()
  const batch = writeBatch(db)
  batch.update(doc(db, mcProductosCollection(tenantId), catalogProductoId), {
    posPendientePublicar: false,
    esBorrador: false,
    updatedAt: Date.now(),
  })
  if (posProductoId) {
    batch.update(doc(db, mcPosProductosCollection(tenantId), posProductoId), {
      publicadoEnCatalogo: true,
      updatedAt: Date.now(),
    })
  }
  await batch.commit()
}

/** Al guardar producto de catálogo originado en POS, limpia flag pendiente si tiene imagen. */
export async function maybeClearPosPendienteOnCatalogSave(
  tenantId: string,
  productoId: string,
  data: { imageUrl?: string; posProductoId?: string; origenPos?: boolean },
) {
  if (!data.origenPos || !data.imageUrl?.trim()) return
  const db = getDb()
  await updateDoc(doc(db, mcProductosCollection(tenantId), productoId), {
    posPendientePublicar: false,
    updatedAt: Date.now(),
  })
  if (data.posProductoId) {
    await updateDoc(doc(db, mcPosProductosCollection(tenantId), data.posProductoId), {
      publicadoEnCatalogo: true,
      catalogProductoId: productoId,
      updatedAt: Date.now(),
    })
  }
}
