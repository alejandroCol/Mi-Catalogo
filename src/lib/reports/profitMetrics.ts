import { pasarelaTxFeePerPaymentCop } from '@/lib/pasarelaFees'
import { ingresoContableCop, isVentaActiva, isVentaCobrada } from '@/pos/lib/posVentaUtils'
import type { McOrdenCatalogo, McOrdenCatalogoLinea, McPosLineaVenta, McPosVenta, McProducto } from '@/types/mc'

export type ProductCostLookup = Map<string, Pick<McProducto, 'precioCostoCop'>>

export type LineProfitResult = {
  ingresoCop: number
  costoCop: number | null
  gananciaCop: number | null
  tieneCosto: boolean
  unidades: number
}

export function resolveCatalogLineUnitCost(
  line: McOrdenCatalogoLinea,
  products: ProductCostLookup,
): number | null {
  if (line.costoUnitarioCop != null && line.costoUnitarioCop >= 0) return line.costoUnitarioCop
  if (line.esCombo) return null
  const cost = products.get(line.productId)?.precioCostoCop
  return cost != null && cost >= 0 ? cost : null
}

export function resolvePosLineUnitCost(
  line: McPosLineaVenta,
  products: ProductCostLookup,
): number | null {
  if (line.costoUnitarioCop != null && line.costoUnitarioCop >= 0) return line.costoUnitarioCop
  if (line.esCombo) return null
  const cost = products.get(line.productoId)?.precioCostoCop
  return cost != null && cost >= 0 ? cost : null
}

export function catalogLineProfit(
  line: McOrdenCatalogoLinea,
  products: ProductCostLookup,
): LineProfitResult {
  const ingresoCop = line.precioUnitarioCop * line.cantidad
  const unitCost = resolveCatalogLineUnitCost(line, products)
  if (unitCost == null) {
    return { ingresoCop, costoCop: null, gananciaCop: null, tieneCosto: false, unidades: line.cantidad }
  }
  const costoCop = unitCost * line.cantidad
  return {
    ingresoCop,
    costoCop,
    gananciaCop: ingresoCop - costoCop,
    tieneCosto: true,
    unidades: line.cantidad,
  }
}

export function posLineProfit(line: McPosLineaVenta, products: ProductCostLookup): LineProfitResult {
  const ingresoCop = line.subtotalCop
  const unitCost = resolvePosLineUnitCost(line, products)
  if (unitCost == null) {
    return { ingresoCop, costoCop: null, gananciaCop: null, tieneCosto: false, unidades: line.cantidad }
  }
  const costoCop = unitCost * line.cantidad
  return {
    ingresoCop,
    costoCop,
    gananciaCop: ingresoCop - costoCop,
    tieneCosto: true,
    unidades: line.cantidad,
  }
}

export function isOrdenCatalogoVentaValida(o: McOrdenCatalogo): boolean {
  return o.estado !== 'esperando_pago' && o.estado !== 'cancelado'
}

export function ordenComisionPasarelaCop(o: McOrdenCatalogo): number {
  if (!o.pagoOnePay) return 0
  return pasarelaTxFeePerPaymentCop(o.totalCop)
}

export function ordenIngresoNetoPasarelaCop(o: McOrdenCatalogo): number {
  if (!o.pagoOnePay) return o.totalCop
  return Math.max(0, o.totalCop - ordenComisionPasarelaCop(o))
}

export type SalesProfitSummary = {
  ingresoBrutoCop: number
  ingresoProductosCop: number
  envioCop: number
  costoTotalCop: number
  costoConocidoCop: number
  costoDesconocidoLineas: number
  gananciaBrutaCop: number
  gananciaConCostoConocidoCop: number
  comisionPasarelaCop: number
  gananciaNetaCop: number
  margenPct: number | null
  transacciones: number
  unidades: number
  ticketPromedioCop: number
  lineasConCosto: number
  lineasSinCosto: number
}

export function summarizeCatalogOrdersProfit(
  orders: McOrdenCatalogo[],
  products: ProductCostLookup,
): SalesProfitSummary {
  let ingresoBrutoCop = 0
  let ingresoProductosCop = 0
  let envioCop = 0
  let costoConocidoCop = 0
  let gananciaConCostoConocidoCop = 0
  let comisionPasarelaCop = 0
  let unidades = 0
  let lineasConCosto = 0
  let lineasSinCosto = 0

  for (const o of orders) {
    if (!isOrdenCatalogoVentaValida(o)) continue
    ingresoBrutoCop += o.totalCop
    envioCop += o.envioCop ?? 0
    comisionPasarelaCop += ordenComisionPasarelaCop(o)
    for (const line of o.lineas) {
      const p = catalogLineProfit(line, products)
      ingresoProductosCop += p.ingresoCop
      unidades += p.unidades
      if (p.tieneCosto && p.costoCop != null && p.gananciaCop != null) {
        costoConocidoCop += p.costoCop
        gananciaConCostoConocidoCop += p.gananciaCop
        lineasConCosto += 1
      } else {
        lineasSinCosto += 1
      }
    }
  }

  const transacciones = orders.filter(isOrdenCatalogoVentaValida).length
  const gananciaBrutaCop = gananciaConCostoConocidoCop + envioCop
  const gananciaNetaCop = gananciaBrutaCop - comisionPasarelaCop
  const margenPct =
    ingresoProductosCop > 0 && costoConocidoCop > 0
      ? Math.round((gananciaConCostoConocidoCop / ingresoProductosCop) * 100)
      : null

  return {
    ingresoBrutoCop,
    ingresoProductosCop,
    envioCop,
    costoTotalCop: costoConocidoCop,
    costoConocidoCop,
    costoDesconocidoLineas: lineasSinCosto,
    gananciaBrutaCop,
    gananciaConCostoConocidoCop,
    comisionPasarelaCop,
    gananciaNetaCop,
    margenPct,
    transacciones,
    unidades,
    ticketPromedioCop: transacciones > 0 ? Math.round(ingresoBrutoCop / transacciones) : 0,
    lineasConCosto,
    lineasSinCosto,
  }
}

export function summarizePosVentasProfit(
  ventas: McPosVenta[],
  products: ProductCostLookup,
  filter?: (v: McPosVenta) => boolean,
): SalesProfitSummary {
  let ingresoBrutoCop = 0
  let ingresoProductosCop = 0
  let costoConocidoCop = 0
  let gananciaConCostoConocidoCop = 0
  let unidades = 0
  let lineasConCosto = 0
  let lineasSinCosto = 0
  let transacciones = 0

  for (const v of ventas) {
    if (filter && !filter(v)) continue
    if (!isVentaActiva(v)) continue
    transacciones += 1
    const ingreso = ingresoContableCop(v)
    ingresoBrutoCop += ingreso
    for (const line of v.lineas) {
      const p = posLineProfit(line, products)
      if (isVentaCobrada(v)) {
        ingresoProductosCop += p.ingresoCop
      }
      unidades += p.unidades
      if (isVentaCobrada(v) && p.tieneCosto && p.costoCop != null && p.gananciaCop != null) {
        costoConocidoCop += p.costoCop
        gananciaConCostoConocidoCop += p.gananciaCop
        lineasConCosto += 1
      } else if (!p.tieneCosto) {
        lineasSinCosto += 1
      }
    }
  }

  const margenPct =
    ingresoProductosCop > 0 && costoConocidoCop > 0
      ? Math.round((gananciaConCostoConocidoCop / ingresoProductosCop) * 100)
      : null

  return {
    ingresoBrutoCop,
    ingresoProductosCop,
    envioCop: 0,
    costoTotalCop: costoConocidoCop,
    costoConocidoCop,
    costoDesconocidoLineas: lineasSinCosto,
    gananciaBrutaCop: gananciaConCostoConocidoCop,
    gananciaConCostoConocidoCop,
    comisionPasarelaCop: 0,
    gananciaNetaCop: gananciaConCostoConocidoCop,
    margenPct,
    transacciones,
    unidades,
    ticketPromedioCop: transacciones > 0 ? Math.round(ingresoBrutoCop / transacciones) : 0,
    lineasConCosto,
    lineasSinCosto,
  }
}
