import { doc, writeBatch, type WriteBatch } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosVentasCollection } from '@/lib/mcPosCollections'
import { sumStockForProduct, syncCatalogStockFromPos } from '@/pos/lib/posCatalogSync'
import {
  applyPosStockDeltasBatch,
  buildPosStockDeltasForLine,
  catalogProductLookup,
} from '@/pos/lib/posComboStock'
import { isVentaActiva } from '@/pos/lib/posVentaUtils'
import { revertClienteVentaStatsBatch } from '@/pos/lib/posClientes'
import { buildCatalogToPosMap } from '@/lib/comboProducto'
import type { McPosProducto, McPosStock, McPosVenta, McProducto } from '@/types/mc'

type StockRestoreOpts = {
  posProductos?: (McPosProducto & { id: string })[]
  catalogProductos?: (McProducto & { id: string })[]
}

function appendRestaurarStockVenta(
  batch: WriteBatch,
  tenantId: string,
  venta: McPosVenta,
  sedeId: string,
  now: number,
  opts?: StockRestoreOpts,
): Set<string> {
  const db = getDb()
  const catalogLookup = catalogProductLookup(opts?.catalogProductos ?? [])
  const catalogToPos = buildCatalogToPosMap(opts?.posProductos ?? [], sedeId, opts?.catalogProductos ?? [])
  const posById = new Map((opts?.posProductos ?? []).map((p) => [p.id, p]))
  const posProductoIdsToSync = new Set<string>()

  for (const l of venta.lineas) {
    const posProduct = posById.get(l.productoId)
    if (!posProduct) continue
    const deltas = buildPosStockDeltasForLine(l, posProduct, catalogLookup, catalogToPos)
    applyPosStockDeltasBatch(batch, db, tenantId, sedeId, deltas, 1, now)
    for (const d of deltas) posProductoIdsToSync.add(d.productoId)
  }

  return posProductoIdsToSync
}

async function syncCatalogStockAfterRestore(
  tenantId: string,
  posProductoIdsToSync: Set<string>,
  stockGlobal: McPosStock[],
) {
  try {
    await Promise.all(
      [...posProductoIdsToSync].map((pid) =>
        syncCatalogStockFromPos(tenantId, pid, sumStockForProduct(stockGlobal, pid), stockGlobal),
      ),
    )
  } catch (syncErr) {
    console.warn('[POS] Stock restaurado; falló sync catálogo:', syncErr)
  }
}

export async function anularPosVenta(
  tenantId: string,
  venta: McPosVenta & { id: string },
  sedeId: string,
  anuladaPorUid: string,
  stockGlobal: McPosStock[],
  opts?: StockRestoreOpts,
) {
  const db = getDb()
  const batch = writeBatch(db)
  const now = Date.now()

  batch.update(doc(db, mcPosVentasCollection(tenantId), venta.id), {
    estado: 'anulada',
    anuladaAt: now,
    anuladaPorUid,
  })

  const posProductoIdsToSync = appendRestaurarStockVenta(batch, tenantId, venta, sedeId, now, opts)

  if (isVentaActiva(venta) && venta.clienteId) {
    revertClienteVentaStatsBatch(batch, db, tenantId, venta.clienteId, venta.totalCop, now)
  }

  await batch.commit()
  await syncCatalogStockAfterRestore(tenantId, posProductoIdsToSync, stockGlobal)
}

/** Elimina el documento de venta. Si aún estaba activa, restaura inventario antes. */
export async function eliminarPosVenta(
  tenantId: string,
  venta: McPosVenta & { id: string },
  stockGlobal: McPosStock[],
  opts?: StockRestoreOpts,
) {
  const db = getDb()
  const batch = writeBatch(db)
  const now = Date.now()
  let posProductoIdsToSync = new Set<string>()

  if (isVentaActiva(venta)) {
    posProductoIdsToSync = appendRestaurarStockVenta(batch, tenantId, venta, venta.sedeId, now, opts)
    if (venta.clienteId) {
      revertClienteVentaStatsBatch(batch, db, tenantId, venta.clienteId, venta.totalCop, now)
    }
  }

  batch.delete(doc(db, mcPosVentasCollection(tenantId), venta.id))
  await batch.commit()

  if (posProductoIdsToSync.size > 0) {
    await syncCatalogStockAfterRestore(tenantId, posProductoIdsToSync, stockGlobal)
  }
}
