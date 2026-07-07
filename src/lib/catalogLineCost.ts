import { doc, getDoc } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import {
  comboCostoUnitario,
  expandComboComponentes,
  esProductoCombo,
  type ProductoLookup,
} from '@/lib/comboProducto'
import type { McOrdenCatalogoLinea, McProducto } from '@/types/mc'

async function loadProductsForLines(
  tenantId: string,
  lineas: McOrdenCatalogoLinea[],
): Promise<ProductoLookup> {
  const db = getDb()
  const map: ProductoLookup = new Map()
  const ids = [...new Set(lineas.map((l) => l.productId))]
  await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(doc(db, mcProductosCollection(tenantId), id))
      if (snap.exists()) map.set(id, { id: snap.id, ...(snap.data() as Omit<McProducto, 'id'>) })
    }),
  )
  for (const line of lineas) {
    const combo = map.get(line.productId)
    if (!combo || !esProductoCombo(combo)) continue
    for (const c of combo.comboComponentes ?? []) {
      if (map.has(c.productId)) continue
      const snap = await getDoc(doc(db, mcProductosCollection(tenantId), c.productId))
      if (snap.exists()) map.set(c.productId, { id: snap.id, ...(snap.data() as Omit<McProducto, 'id'>) })
    }
  }
  return map
}

export async function enrichCatalogLineasWithCost(
  tenantId: string,
  lineas: McOrdenCatalogoLinea[],
): Promise<McOrdenCatalogoLinea[]> {
  const products = await loadProductsForLines(tenantId, lineas)
  const out: McOrdenCatalogoLinea[] = []

  for (const line of lineas) {
    const product = products.get(line.productId)
    if (!product) {
      out.push(line)
      continue
    }
    if (esProductoCombo(product)) {
      const cost = comboCostoUnitario(product, products)
      const componentesExpandidos = expandComboComponentes(
        product,
        line.cantidad,
        products,
        line.comboColorSeleccion,
      )
      out.push({
        ...line,
        esCombo: true,
        ...(cost != null ? { costoUnitarioCop: cost } : {}),
        componentesExpandidos,
      })
      continue
    }
    out.push(catalogLineCostFromProduct(line, product))
  }
  return out
}

export function catalogLineCostFromProduct(
  line: McOrdenCatalogoLinea,
  product?: Pick<McProducto, 'precioCostoCop'> | null,
): McOrdenCatalogoLinea {
  const cost = product?.precioCostoCop
  return cost != null && cost >= 0 ? { ...line, costoUnitarioCop: Math.round(cost) } : line
}

export function catalogLineasPiezasEnvio(lineas: McOrdenCatalogoLinea[]): number {
  return lineas.reduce((sum, l) => {
    if (l.esCombo && l.componentesExpandidos?.length) {
      return sum + l.componentesExpandidos.reduce((s, c) => s + c.cantidad, 0)
    }
    return sum + l.cantidad
  }, 0)
}
