import { doc, increment, writeBatch } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { mcPosStockCollection, mcPosStockDocId } from '@/lib/mcPosCollections'
import {
  expandComboComponentes,
  esProductoCombo,
  comboCostoUnitario,
  posStockDeltasFromComboExpansion,
  type CatalogToPosMap,
  type PosStockDelta,
  type ProductoLookup,
} from '@/lib/comboProducto'
import type { McPosLineaVenta, McPosProducto, McProducto } from '@/types/mc'

export type PosStockApplyLine = {
  productoId: string
  varianteId?: string
  tallaId?: string
  cantidad: number
  esCombo?: boolean
  componentesExpandidos?: McPosLineaVenta['componentesExpandidos']
  comboColorSeleccion?: McPosLineaVenta['comboColorSeleccion']
}

export function buildPosStockDeltasForLine(
  line: PosStockApplyLine,
  posProduct: McPosProducto & { id: string },
  catalogProducts: ProductoLookup,
  catalogToPos: CatalogToPosMap,
  comboCatalog?: Pick<
    McProducto,
    'comboPermiteElegirColor' | 'comboPermiteElegirTalla' | 'comboComponentes' | 'nombre' | 'tipoProducto'
  >,
): PosStockDelta[] {
  if (line.componentesExpandidos?.length) {
    return posStockDeltasFromComboExpansion(line.componentesExpandidos, catalogToPos, catalogProducts)
  }
  if (esProductoCombo(posProduct)) {
    const comboAsCatalog = {
      nombre: posProduct.nombre,
      tipoProducto: 'combo' as const,
      comboComponentes: posProduct.comboComponentes,
      comboPermiteElegirColor:
        posProduct.comboPermiteElegirColor ?? comboCatalog?.comboPermiteElegirColor,
      comboPermiteElegirTalla:
        posProduct.comboPermiteElegirTalla ?? comboCatalog?.comboPermiteElegirTalla,
    }
    const expanded = expandComboComponentes(
      comboAsCatalog,
      line.cantidad,
      catalogProducts,
      line.comboColorSeleccion,
    )
    return posStockDeltasFromComboExpansion(expanded, catalogToPos, catalogProducts)
  }
  return [
    {
      productoId: line.productoId,
      ...(line.varianteId ? { varianteId: line.varianteId } : {}),
      ...(line.tallaId ? { tallaId: line.tallaId } : {}),
      cantidad: line.cantidad,
    },
  ]
}

export function applyPosStockDeltasBatch(
  batch: ReturnType<typeof writeBatch>,
  db: Firestore,
  tenantId: string,
  sedeId: string,
  deltas: PosStockDelta[],
  sign: 1 | -1,
  now: number,
) {
  for (const d of deltas) {
    const stockRef = doc(
      db,
      mcPosStockCollection(tenantId),
      mcPosStockDocId(sedeId, d.productoId, d.varianteId, d.tallaId),
    )
    batch.set(
      stockRef,
      {
        sedeId,
        productoId: d.productoId,
        ...(d.varianteId ? { varianteId: d.varianteId } : {}),
        ...(d.tallaId ? { tallaId: d.tallaId } : {}),
        cantidad: increment(sign * d.cantidad),
        updatedAt: now,
      },
      { merge: true },
    )
  }
}

export function catalogProductLookup(rows: (McProducto & { id: string })[]): ProductoLookup {
  const m = new Map<string, McProducto & { id: string }>()
  for (const p of rows) m.set(p.id, p)
  return m
}

export function posComboCostoUnitario(
  posProduct: McPosProducto,
  catalogProducts: ProductoLookup,
): number | undefined {
  if (!esProductoCombo(posProduct)) return undefined
  const cost = comboCostoUnitario(
    { tipoProducto: 'combo', comboComponentes: posProduct.comboComponentes },
    catalogProducts,
  )
  return cost ?? undefined
}
