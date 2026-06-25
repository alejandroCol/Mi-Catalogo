import { doc, increment, writeBatch } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosStockCollection, mcPosStockDocId, mcPosVentasCollection } from '@/lib/mcPosCollections'
import { sumStockForProduct, syncCatalogStockFromPos } from '@/pos/lib/posCatalogSync'
import type { McPosStock, McPosVenta } from '@/types/mc'

export async function anularPosVenta(
  tenantId: string,
  venta: McPosVenta & { id: string },
  sedeId: string,
  anuladaPorUid: string,
  stockGlobal: McPosStock[],
) {
  const db = getDb()
  const batch = writeBatch(db)
  const now = Date.now()

  batch.update(doc(db, mcPosVentasCollection(tenantId), venta.id), {
    estado: 'anulada',
    anuladaAt: now,
    anuladaPorUid,
  })

  for (const l of venta.lineas) {
    const stockRef = doc(
      db,
      mcPosStockCollection(tenantId),
      mcPosStockDocId(sedeId, l.productoId, l.varianteId),
    )
    batch.set(stockRef, { cantidad: increment(l.cantidad), updatedAt: now }, { merge: true })
  }

  await batch.commit()

  const restauradoPorProducto = new Map<string, number>()
  for (const l of venta.lineas) {
    restauradoPorProducto.set(l.productoId, (restauradoPorProducto.get(l.productoId) ?? 0) + l.cantidad)
  }
  try {
    await Promise.all(
      [...restauradoPorProducto.entries()].map(([pid, qty]) =>
        syncCatalogStockFromPos(tenantId, pid, sumStockForProduct(stockGlobal, pid) + qty, stockGlobal),
      ),
    )
  } catch (syncErr) {
    console.warn('[POS] Venta anulada; falló sync catálogo:', syncErr)
  }
}
