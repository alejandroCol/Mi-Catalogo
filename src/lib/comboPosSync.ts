import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosProductosCollection, mcPosSedesCollection } from '@/lib/mcPosCollections'
import { esProductoCombo, comboComponentesForFirestore } from '@/lib/comboProducto'
import type { McPosProducto, McPosSede, McProducto } from '@/types/mc'

function sedeActivaParaPos(sede: McPosSede): boolean {
  return sede.activa !== false
}

/** Crea o actualiza artículos POS espejo para un combo de catálogo en todas las sedes activas. */
export async function syncComboToPosProductos(
  tenantId: string,
  catalogProduct: McProducto & { id: string },
) {
  if (!esProductoCombo(catalogProduct)) return

  const db = getDb()
  const sedesSnap = await getDocs(collection(db, mcPosSedesCollection(tenantId)))
  const sedesActivas = sedesSnap.docs.filter((d) => sedeActivaParaPos(d.data() as McPosSede))
  if (sedesActivas.length === 0) return

  const existingSnap = await getDocs(
    query(
      collection(db, mcPosProductosCollection(tenantId)),
      where('catalogProductoId', '==', catalogProduct.id),
    ),
  )
  const bySede = new Map<string, string>()
  for (const d of existingSnap.docs) {
    const row = d.data() as McPosProducto
    if (row.sedeId) bySede.set(row.sedeId, d.id)
  }

  const now = Date.now()
  const batch = writeBatch(db)
  const payload = {
    nombre: catalogProduct.nombre,
    tipoProducto: 'combo' as const,
    comboComponentes: comboComponentesForFirestore(catalogProduct.comboComponentes ?? []),
    comboPermiteElegirColor: catalogProduct.comboPermiteElegirColor ?? false,
    comboPermiteElegirTalla: catalogProduct.comboPermiteElegirTalla ?? false,
    precioCop: catalogProduct.precioCop,
    activo: catalogProduct.activo,
    catalogProductoId: catalogProduct.id,
    publicadoEnCatalogo: catalogProduct.enCatalogo,
    updatedAt: now,
  }

  for (const sedeDoc of sedesActivas) {
    const sedeId = sedeDoc.id
    const existingId = bySede.get(sedeId)
    if (existingId) {
      batch.update(doc(db, mcPosProductosCollection(tenantId), existingId), payload)
    } else {
      const ref = doc(collection(db, mcPosProductosCollection(tenantId)))
      batch.set(ref, {
        ...payload,
        sedeId,
        createdAt: now,
      })
    }
  }

  await batch.commit()
}

/** Crea o repara espejos POS de combos en una sede (p. ej. al abrir Ventas). */
export async function ensureComboPosMirrorsForSede(
  tenantId: string,
  sedeId: string,
  catalogCombos: (McProducto & { id: string })[],
  existingPosInSede: (McPosProducto & { id: string })[],
) {
  if (!sedeId || catalogCombos.length === 0) return

  const byCatalogId = new Map<string, McPosProducto & { id: string }>()
  for (const p of existingPosInSede) {
    if (p.sedeId === sedeId && p.catalogProductoId) {
      byCatalogId.set(p.catalogProductoId, p)
    }
  }

  const db = getDb()
  const now = Date.now()
  const batch = writeBatch(db)
  let writes = 0

  for (const catalogProduct of catalogCombos) {
    if (!esProductoCombo(catalogProduct) || catalogProduct.activo === false) continue

    const payload = {
      nombre: catalogProduct.nombre,
      tipoProducto: 'combo' as const,
      comboComponentes: comboComponentesForFirestore(catalogProduct.comboComponentes ?? []),
      comboPermiteElegirColor: catalogProduct.comboPermiteElegirColor ?? false,
    comboPermiteElegirTalla: catalogProduct.comboPermiteElegirTalla ?? false,
      precioCop: catalogProduct.precioCop,
      activo: true,
      catalogProductoId: catalogProduct.id,
      publicadoEnCatalogo: catalogProduct.enCatalogo ?? false,
      updatedAt: now,
    }

    const existing = byCatalogId.get(catalogProduct.id)
    if (existing) {
      const needsUpdate =
        existing.tipoProducto !== 'combo' ||
        comboComponentesForFirestore(existing.comboComponentes ?? []).length === 0
      if (needsUpdate) {
        batch.update(doc(db, mcPosProductosCollection(tenantId), existing.id), payload)
        writes++
      }
    } else {
      const ref = doc(collection(db, mcPosProductosCollection(tenantId)))
      batch.set(ref, { ...payload, sedeId, createdAt: now })
      writes++
    }
  }

  if (writes > 0) await batch.commit()
}
