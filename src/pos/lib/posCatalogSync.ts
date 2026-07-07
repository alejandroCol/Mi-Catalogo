import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { mcProductosCollection } from '@/lib/mcCollections'
import { mcPosProductosCollection } from '@/lib/mcPosCollections'
import {
  comboComponentesValidos,
  comboStockDisponible,
  esProductoCombo,
} from '@/lib/comboProducto'
import { getDb } from '@/lib/firebase'
import { catalogVariantesFromPosVariantes, inferPosStockModo } from '@/pos/lib/posProductoVariantes'
import type { McPosProducto, McPosStock, McProducto } from '@/types/mc'

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
  sedeRows: { varianteId?: string; tallaId?: string; cantidad: number }[],
): McPosStock[] {
  const rest = stockGlobal.filter((s) => !(s.productoId === productoId && s.sedeId === sedeId))
  return [
    ...rest,
    ...sedeRows.map((r) => ({
      id: '',
      sedeId,
      productoId,
      varianteId: r.varianteId,
      tallaId: r.tallaId,
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
  const catalog = catalogSnap.data() as {
    esRopa?: boolean
    tallas?: { id: string; nombre: string; stock: number }[]
    variantes?: { id: string; nombre: string; stock?: number }[]
  }

  const patch: Record<string, unknown> = {
    stock: Math.max(0, stockTotal),
    updatedAt: Date.now(),
  }

  if (catalog.esRopa && pos.posStockModo === 'skus' && stockGlobal) {
    const skuRows = stockGlobal.filter(
      (s) => s.productoId === posProductoId && s.varianteId && s.tallaId,
    )
    if (catalog.tallas?.length && (pos.variantes?.length || pos.posColores?.length)) {
      patch.tallas = (catalog.tallas ?? []).map((t) => ({
        ...t,
        stock: skuRows
          .filter((s) => s.tallaId === t.id)
          .reduce((sum, s) => sum + Math.max(0, s.cantidad), 0),
      }))
    }
    if (pos.posColores?.length) {
      patch.variantes = pos.posColores.map((c) => {
        const prev = (catalog.variantes ?? []).find((v) => v.id === c.id)
        return {
          id: c.id,
          nombre: c.nombre,
          ...(c.tipo ? { tipo: c.tipo } : {}),
          ...(c.hex ? { hex: c.hex } : {}),
          ...(prev && 'imageUrl' in prev && prev.imageUrl ? { imageUrl: prev.imageUrl } : {}),
        }
      })
      patch.skus = skuRows.map((s) => ({
        id: `${s.varianteId}__${s.tallaId}`,
        varianteId: s.varianteId!,
        tallaId: s.tallaId!,
        stock: Math.max(0, s.cantidad),
      }))
    }
  } else if (catalog.esRopa && catalog.tallas?.length && stockGlobal) {
    const byVariante = stockByVarianteForProduct(stockGlobal, posProductoId)
    patch.tallas = catalog.tallas.map((t) => ({
      ...t,
      stock: Math.max(0, byVariante.get(t.id) ?? 0),
    }))
  } else if (!catalog.esRopa && pos.posStockModo === 'variantes' && pos.variantes?.length && stockGlobal) {
    const byVariante = stockByVarianteForProduct(stockGlobal, posProductoId)
    const catalogById = new Map((catalog.variantes ?? []).map((v) => [v.id, v]))
    patch.variantes = catalogVariantesFromPosVariantes(pos.variantes, byVariante).map((v) => {
      const prev = catalogById.get(v.id) as { imageUrl?: string } | undefined
      return prev?.imageUrl ? { ...v, imageUrl: prev.imageUrl } : v
    })
  }

  await updateDoc(catalogRef, patch)

  await refreshComboCatalogStocksUsingComponent(tenantId, pos.catalogProductoId)
}

/** Recalcula el stock guardado de combos que incluyen este producto como componente. */
export async function refreshComboCatalogStocksUsingComponent(
  tenantId: string,
  componentCatalogId: string,
) {
  if (!componentCatalogId.trim()) return

  const db = getDb()
  const snap = await getDocs(collection(db, mcProductosCollection(tenantId)))
  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) }))
  const lookup = new Map<string, McProducto & { id: string }>(all.map((p) => [p.id, p]))
  const combos = all.filter((p) => esProductoCombo(p))
  if (combos.length === 0) return

  const now = Date.now()
  const batch = writeBatch(db)
  let writes = 0

  for (const combo of combos) {
    const usaComponente = comboComponentesValidos(combo).some((c) => c.productId === componentCatalogId)
    if (!usaComponente) continue
    const stock = comboStockDisponible(combo, lookup)
    batch.update(doc(db, mcProductosCollection(tenantId), combo.id), { stock, updatedAt: now })
    writes++
  }

  if (writes > 0) await batch.commit()
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

/** Crea borradores de catálogo para productos POS sin vínculo (necesario para combos). */
export async function ensureCatalogDraftsForPosProducts(
  tenantId: string,
  posProducts: (McPosProducto & { id: string })[],
  stockGlobal: McPosStock[],
) {
  const pending = posProducts.filter(
    (p) => !p.catalogProductoId && p.activo !== false && !esProductoCombo(p),
  )
  if (pending.length === 0) return

  const db = getDb()
  const batch = writeBatch(db)
  const now = Date.now()

  for (const pos of pending) {
    const stockTotal = sumStockForProduct(stockGlobal, pos.id)
    const byVariante = stockByVarianteForProduct(stockGlobal, pos.id)
    const stockModo = inferPosStockModo(pos)
    const catalogRef = doc(collection(db, mcProductosCollection(tenantId)))

    batch.set(catalogRef, {
      nombre: pos.nombre,
      precioCop: pos.precioCop,
      ...(pos.precioCostoCop != null && pos.precioCostoCop >= 0 ? { precioCostoCop: pos.precioCostoCop } : {}),
      stock: stockTotal,
      activo: true,
      enCatalogo: false,
      esBorrador: true,
      origenPos: true,
      posProductoId: pos.id,
      posSedeId: pos.sedeId,
      posPendientePublicar: true,
      orden: now,
      createdAt: now,
      updatedAt: now,
      ...(stockModo === 'skus' && pos.posColores?.length && pos.variantes?.length
        ? {
            esRopa: true,
            tallas: pos.variantes.map((t) => ({
              id: t.id,
              nombre: t.nombre,
              stock: 0,
            })),
            variantes: pos.posColores.map((c) => ({
              id: c.id,
              nombre: c.nombre,
              ...(c.tipo ? { tipo: c.tipo } : {}),
              ...(c.hex ? { hex: c.hex } : {}),
            })),
            skus: pos.posColores.flatMap((c) =>
              pos.variantes!.map((t) => {
                const row = stockGlobal.find(
                  (s) =>
                    s.productoId === pos.id &&
                    s.varianteId === c.id &&
                    s.tallaId === t.id,
                )
                return {
                  id: `${c.id}__${t.id}`,
                  varianteId: c.id,
                  tallaId: t.id,
                  stock: Math.max(0, row?.cantidad ?? 0),
                }
              }),
            ),
          }
        : {}),
      ...(stockModo === 'tallas' && pos.variantes?.length
        ? {
            esRopa: true,
            tallas: pos.variantes.map((t) => ({
              id: t.id,
              nombre: t.nombre,
              stock: Math.max(0, byVariante.get(t.id) ?? 0),
            })),
          }
        : {}),
      ...(stockModo === 'variantes' && pos.variantes?.length
        ? { variantes: catalogVariantesFromPosVariantes(pos.variantes, byVariante) }
        : {}),
    })
    batch.update(doc(db, mcPosProductosCollection(tenantId), pos.id), {
      catalogProductoId: catalogRef.id,
      updatedAt: now,
    })
  }

  await batch.commit()
}

async function resolveCatalogIdForPosProduct(
  tenantId: string,
  posProduct: Pick<McPosProducto, 'id' | 'catalogProductoId'>,
): Promise<string | null> {
  const direct = posProduct.catalogProductoId?.trim()
  if (direct) return direct

  const db = getDb()
  const snap = await getDocs(
    query(
      collection(db, mcProductosCollection(tenantId)),
      where('posProductoId', '==', posProduct.id),
    ),
  )
  return snap.docs[0]?.id ?? null
}

/** Al desactivar o eliminar un producto POS, oculta su espejo de catálogo (usado en combos). */
export async function removeCatalogMirrorForPosProduct(
  tenantId: string,
  posProduct: Pick<McPosProducto, 'id' | 'catalogProductoId'>,
  mode: 'deactivate' | 'delete',
) {
  const catalogId = await resolveCatalogIdForPosProduct(tenantId, posProduct)
  if (!catalogId) return

  const db = getDb()
  const catalogRef = doc(db, mcProductosCollection(tenantId), catalogId)
  const catalogSnap = await getDoc(catalogRef)
  if (!catalogSnap.exists()) return

  const catalog = catalogSnap.data() as McProducto
  const now = Date.now()

  if (mode === 'delete' && catalog.origenPos && catalog.esBorrador && !catalog.enCatalogo) {
    await deleteDoc(catalogRef)
  } else {
    await updateDoc(catalogRef, { activo: false, updatedAt: now })
  }

  await refreshComboCatalogStocksUsingComponent(tenantId, catalogId)
}
