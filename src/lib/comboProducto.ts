import { productoPrecioVenta } from '@/lib/productoDescuento'
import { productoUsaMatrizSku } from '@/lib/productoSkus'
import { tallasValidas } from '@/lib/productoTallas'
import {
  productoUsaStockPorVariante,
  varianteStockRaw,
  variantesValidas,
} from '@/lib/productoVariantes'
import type {
  McComboComponente,
  McComboColorSeleccion,
  McComboComponenteExpandido,
  McPosProducto,
  McProducto,
  McProductoTalla,
  McProductoVariante,
} from '@/types/mc'
import { posStockCantidadProducto } from '@/lib/mcPosStockMapKey'

export type ProductoLookup = Map<string, McProducto & { id: string }>

export type PosProductoLookup = Map<string, McPosProducto & { id: string }>

export type CatalogToPosMap = Map<string, string>

export type StockDelta = {
  productId: string
  varianteId?: string
  cantidad: number
}

export type PosStockDelta = {
  productoId: string
  varianteId?: string
  tallaId?: string
  cantidad: number
}

export function esProductoCombo(
  prod: Pick<McProducto, 'tipoProducto'> | Pick<McPosProducto, 'tipoProducto'> | null | undefined,
): boolean {
  return prod?.tipoProducto === 'combo'
}

export function comboComponentesValidos(
  prod: Pick<McProducto, 'comboComponentes'> | Pick<McPosProducto, 'comboComponentes'>,
): McComboComponente[] {
  return (prod.comboComponentes ?? []).filter(
    (c) => c.productId?.trim() && Number.isFinite(c.cantidad) && c.cantidad > 0,
  )
}

export function variantesColorComponente(prod: McProducto): McProductoVariante[] {
  return variantesValidas(prod).filter((v) => {
    const tipo = v.tipo?.trim().toLowerCase() ?? ''
    if (prod.esRopa) return tipo === 'color' || tipo === 'tela'
    return tipo === 'color' || tipo === 'tela' || Boolean(v.hex?.trim())
  })
}

export function componenteTieneColoresElegibles(prod: McProducto): boolean {
  return variantesColorComponente(prod).length > 0
}

export function componenteTieneTallasElegibles(prod: McProducto): boolean {
  return prod.esRopa === true && tallasValidas(prod).length > 0
}

export function componentePermiteElegirColor(
  c: McComboComponente,
  prod: McProducto | undefined,
  comboPermiteElegirColor?: boolean,
): boolean {
  if (!comboPermiteElegirColor || !prod) return false
  if (c.permiteElegirColor === false) return false
  return componenteTieneColoresElegibles(prod)
}

export function componentePermiteElegirTalla(
  c: McComboComponente,
  prod: McProducto | undefined,
  comboPermiteElegirTalla?: boolean,
): boolean {
  if (!comboPermiteElegirTalla || !prod) return false
  if (c.permiteElegirTalla === false) return false
  return componenteTieneTallasElegibles(prod)
}

/** @deprecated Usar `ComboClienteSlot`. */
export type ComboColorSlot = ComboClienteSlot

export type ComboClienteSlot = {
  componenteIndex: number
  slotIndex: number
  productId: string
  nombre: string
  eligeColor: boolean
  eligeTalla: boolean
  usaMatrizSku: boolean
  variantes: McProductoVariante[]
  tallas: McProductoTalla[]
}

/** Slots de opciones a elegir por el cliente (color y/o talla) por un combo vendido (cantidad 1). */
export function comboClienteSlots(
  combo: Pick<McProducto, 'comboComponentes' | 'comboPermiteElegirColor' | 'comboPermiteElegirTalla'>,
  products: ProductoLookup,
): ComboClienteSlot[] {
  const out: ComboClienteSlot[] = []
  comboComponentesValidos(combo).forEach((c, componenteIndex) => {
    const prod = products.get(c.productId)
    const eligeColor = componentePermiteElegirColor(c, prod, combo.comboPermiteElegirColor)
    const eligeTalla = componentePermiteElegirTalla(c, prod, combo.comboPermiteElegirTalla)
    if (!eligeColor && !eligeTalla) return
    const variantes = eligeColor && prod ? variantesColorComponente(prod) : []
    const tallas = eligeTalla && prod ? tallasValidas(prod) : []
    if (eligeColor && variantes.length === 0) return
    if (eligeTalla && tallas.length === 0) return
    for (let slotIndex = 0; slotIndex < c.cantidad; slotIndex++) {
      out.push({
        componenteIndex,
        slotIndex,
        productId: c.productId,
        nombre: c.nombreSnapshot ?? prod?.nombre ?? 'Prenda',
        eligeColor,
        eligeTalla,
        usaMatrizSku: Boolean(prod && productoUsaMatrizSku(prod)),
        variantes,
        tallas,
      })
    }
  })
  return out
}

/** @deprecated Usar `comboClienteSlots`. */
export function comboColorSlots(
  combo: Pick<McProducto, 'comboComponentes' | 'comboPermiteElegirColor' | 'comboPermiteElegirTalla'>,
  products: ProductoLookup,
): ComboClienteSlot[] {
  return comboClienteSlots(combo, products)
}

export function comboRequiereSeleccionCliente(
  combo: Pick<McProducto, 'comboComponentes' | 'comboPermiteElegirColor' | 'comboPermiteElegirTalla'>,
  products: ProductoLookup,
): boolean {
  return comboClienteSlots(combo, products).length > 0
}

export function comboRequiereSeleccionColor(
  combo: Pick<McProducto, 'comboComponentes' | 'comboPermiteElegirColor' | 'comboPermiteElegirTalla'>,
  products: ProductoLookup,
): boolean {
  return comboRequiereSeleccionCliente(combo, products)
}

export function comboColorSeleccionKey(seleccion: McComboColorSeleccion[]): string {
  if (!seleccion.length) return ''
  return [...seleccion]
    .sort((a, b) => a.componenteIndex - b.componenteIndex || a.slotIndex - b.slotIndex)
    .map((s) => `${s.componenteIndex}:${s.slotIndex}:${s.varianteId ?? ''}:${s.tallaId ?? ''}`)
    .join('|')
}

export function comboColorSeleccionCompleta(
  combo: Pick<McProducto, 'comboComponentes' | 'comboPermiteElegirColor' | 'comboPermiteElegirTalla'>,
  products: ProductoLookup,
  seleccion: McComboColorSeleccion[] | undefined,
): boolean {
  const slots = comboClienteSlots(combo, products)
  if (slots.length === 0) return true
  if (!seleccion?.length) return false
  return slots.every((slot) => {
    const pick = seleccion.find(
      (s) => s.componenteIndex === slot.componenteIndex && s.slotIndex === slot.slotIndex,
    )
    if (slot.eligeColor && !pick?.varianteId?.trim()) return false
    if (slot.eligeTalla && !pick?.tallaId?.trim()) return false
    return true
  })
}

export function comboColorSeleccionResumen(
  combo: Pick<McProducto, 'comboComponentes' | 'comboPermiteElegirColor' | 'comboPermiteElegirTalla'>,
  products: ProductoLookup,
  seleccion: McComboColorSeleccion[] | undefined,
): string {
  if (!seleccion?.length) return ''
  const parts: string[] = []
  for (const s of seleccion) {
    const c = combo.comboComponentes?.[s.componenteIndex]
    const prod = c ? products.get(c.productId) : undefined
    const v = s.varianteId ? prod?.variantes?.find((x) => x.id === s.varianteId) : undefined
    const t = s.tallaId ? prod?.tallas?.find((x) => x.id === s.tallaId) : undefined
    const color = s.varianteNombre ?? v?.nombre
    const talla = s.tallaNombre ?? t?.nombre
    const base = c?.nombreSnapshot ?? prod?.nombre ?? 'Ítem'
    const detalle = [color, talla].filter(Boolean).join(' · ')
    parts.push(detalle ? `${base}: ${detalle}` : base)
  }
  return parts.join(' · ')
}

/** Prepara componentes al guardar combo con opción de color/talla del cliente. */
export function normalizeComboComponentesForSave(
  componentes: McComboComponente[],
  comboPermiteElegirColor: boolean,
  comboPermiteElegirTalla: boolean,
  products: ProductoLookup,
): McComboComponente[] {
  return componentes.map((c) => {
    const prod = products.get(c.productId)
    let row: McComboComponente = { ...c }

    const puedeColor =
      comboPermiteElegirColor && prod && componenteTieneColoresElegibles(prod)
    if (puedeColor) {
      const { varianteId: _v, ...rest } = row
      row = { ...rest, permiteElegirColor: true }
    } else {
      const { permiteElegirColor: _p, ...rest } = row
      row = rest
    }

    const puedeTalla =
      comboPermiteElegirTalla && prod && componenteTieneTallasElegibles(prod)
    if (puedeTalla) {
      const { tallaId: _t, ...rest } = row
      row = { ...rest, permiteElegirTalla: true }
    } else {
      const { permiteElegirTalla: _p, ...rest } = row
      row = rest
    }

    return row
  })
}

/** Firestore rechaza `undefined`; deja solo campos con valor. */
export function comboComponentesForFirestore(componentes: McComboComponente[]): McComboComponente[] {
  return componentes.map((c) => {
    const row: McComboComponente = {
      productId: c.productId,
      cantidad: Math.max(1, Math.floor(c.cantidad || 1)),
    }
    if (c.varianteId?.trim()) row.varianteId = c.varianteId.trim()
    if (c.tallaId?.trim()) row.tallaId = c.tallaId.trim()
    if (c.permiteElegirColor) row.permiteElegirColor = true
    if (c.permiteElegirTalla) row.permiteElegirTalla = true
    if (c.nombreSnapshot?.trim()) row.nombreSnapshot = c.nombreSnapshot.trim()
    if (c.imageUrlSnapshot?.trim()) row.imageUrlSnapshot = c.imageUrlSnapshot.trim()
    return row
  })
}


function tallaIdForSlot(
  componenteIndex: number,
  slotIndex: number,
  c: McComboComponente,
  prod: McProducto | undefined,
  comboPermiteElegirTalla: boolean | undefined,
  seleccion: McComboColorSeleccion[] | undefined,
): string | undefined {
  if (componentePermiteElegirTalla(c, prod, comboPermiteElegirTalla)) {
    const pick = seleccion?.find(
      (s) => s.componenteIndex === componenteIndex && s.slotIndex === slotIndex,
    )
    return pick?.tallaId ?? c.tallaId
  }
  return c.tallaId
}

function varianteIdForSlot(
  componenteIndex: number,
  slotIndex: number,
  c: McComboComponente,
  prod: McProducto | undefined,
  comboPermiteElegirColor: boolean | undefined,
  seleccion: McComboColorSeleccion[] | undefined,
): string | undefined {
  if (componentePermiteElegirColor(c, prod, comboPermiteElegirColor)) {
    const pick = seleccion?.find(
      (s) => s.componenteIndex === componenteIndex && s.slotIndex === slotIndex,
    )
    return pick?.varianteId ?? c.varianteId
  }
  return c.varianteId
}

function resolveComponenteCosto(prod: McProducto, c: McComboComponente, varianteId?: string): number | null {
  const vid = varianteId ?? c.varianteId
  if (vid) {
    const v = (prod.variantes ?? []).find((x) => x.id === vid)
    if (v?.precioCostoCop != null && v.precioCostoCop >= 0) return Math.round(v.precioCostoCop)
  }
  const cost = prod.precioCostoCop
  return cost != null && cost >= 0 ? Math.round(cost) : null
}

function resolveComponentePrecioVenta(prod: McProducto, c: McComboComponente, varianteId?: string): number {
  const vid = varianteId ?? c.varianteId
  if (vid) {
    const v = (prod.variantes ?? []).find((x) => x.id === vid)
    if (v) return productoPrecioVenta({ ...prod, precioCop: v.precioCop ?? prod.precioCop })
  }
  return productoPrecioVenta(prod)
}

/** Stock disponible de un componente según talla, variante o stock base. */
export function stockComponenteCatalog(prod: McProducto, c: McComboComponente): number {
  return stockComponenteCatalogConOpciones(prod, c)
}

function stockComponenteCatalogConOpciones(
  prod: McProducto,
  c: McComboComponente,
  combo?: Pick<McProducto, 'comboPermiteElegirColor' | 'comboPermiteElegirTalla'>,
): number {
  const eligeTalla = combo
    ? componentePermiteElegirTalla(c, prod, combo.comboPermiteElegirTalla)
    : false
  const eligeColor = combo
    ? componentePermiteElegirColor(c, prod, combo.comboPermiteElegirColor)
    : false

  if (eligeTalla || (eligeColor && !c.tallaId)) {
    if (productoUsaMatrizSku(prod)) {
      return (prod.skus ?? []).reduce((s, sku) => s + Math.max(0, Math.floor(sku.stock ?? 0)), 0)
    }
    if (prod.esRopa && prod.tallas?.length) {
      return prod.tallas.reduce((s, t) => s + Math.max(0, Math.floor(t.stock ?? 0)), 0)
    }
  }

  if (prod.esRopa && c.tallaId) {
    if (productoUsaMatrizSku(prod) && c.varianteId) {
      const sku = prod.skus?.find((s) => s.varianteId === c.varianteId && s.tallaId === c.tallaId)
      return Math.max(0, Math.floor(sku?.stock ?? 0))
    }
    const t = (prod.tallas ?? []).find((x) => x.id === c.tallaId)
    return Math.max(0, Math.floor(t?.stock ?? 0))
  }
  if (c.varianteId) {
    const v = (prod.variantes ?? []).find((x) => x.id === c.varianteId)
    if (v && productoUsaStockPorVariante(prod)) return varianteStockRaw(v)
  }
  return Math.max(0, Math.floor(prod.stock ?? 0))
}

/** Cuántos combos se pueden armar con el stock actual de componentes. */
export function comboStockDisponible(
  combo: Pick<McProducto, 'tipoProducto' | 'comboComponentes' | 'comboPermiteElegirColor' | 'comboPermiteElegirTalla'>,
  products: ProductoLookup,
): number {
  const componentes = comboComponentesValidos(combo)
  if (!esProductoCombo(combo) || componentes.length === 0) return 0

  let min = Number.POSITIVE_INFINITY
  for (const c of componentes) {
    const prod = products.get(c.productId)
    if (!prod || !prod.activo) return 0
    const disp = stockComponenteCatalogConOpciones(prod, c, combo)
    const packs = Math.floor(disp / c.cantidad)
    min = Math.min(min, packs)
  }
  return Number.isFinite(min) ? Math.max(0, min) : 0
}

export function comboCostoUnitario(
  combo: Pick<McProducto, 'tipoProducto' | 'comboComponentes'>,
  products: ProductoLookup,
): number | null {
  const componentes = comboComponentesValidos(combo)
  if (!esProductoCombo(combo) || componentes.length === 0) return null

  let total = 0
  let tieneCosto = false
  for (const c of componentes) {
    const prod = products.get(c.productId)
    if (!prod) return null
    const unit = resolveComponenteCosto(prod, c)
    if (unit == null) continue
    tieneCosto = true
    total += unit * c.cantidad
  }
  return tieneCosto ? total : null
}

export function comboPrecioSeparado(
  combo: Pick<McProducto, 'tipoProducto' | 'comboComponentes'>,
  products: ProductoLookup,
): number {
  const componentes = comboComponentesValidos(combo)
  if (!esProductoCombo(combo) || componentes.length === 0) return 0

  return componentes.reduce((sum, c) => {
    const prod = products.get(c.productId)
    if (!prod) return sum
    return sum + resolveComponentePrecioVenta(prod, c) * c.cantidad
  }, 0)
}

export function expandComboComponentes(
  combo: Pick<
    McProducto,
    'nombre' | 'tipoProducto' | 'comboComponentes' | 'comboPermiteElegirColor' | 'comboPermiteElegirTalla'
  >,
  comboQty: number,
  products: ProductoLookup,
  colorSeleccion?: McComboColorSeleccion[],
): McComboComponenteExpandido[] {
  const componentes = comboComponentesValidos(combo)
  const out: McComboComponenteExpandido[] = []
  for (let componenteIndex = 0; componenteIndex < componentes.length; componenteIndex++) {
    const c = componentes[componenteIndex]!
    const prod = products.get(c.productId)
    const eligeColor = componentePermiteElegirColor(c, prod, combo.comboPermiteElegirColor)
    const eligeTalla = componentePermiteElegirTalla(c, prod, combo.comboPermiteElegirTalla)

    if ((eligeColor || eligeTalla) && colorSeleccion?.length) {
      for (let comboUnit = 0; comboUnit < comboQty; comboUnit++) {
        for (let slotIndex = 0; slotIndex < c.cantidad; slotIndex++) {
          const varianteId = eligeColor
            ? varianteIdForSlot(
                componenteIndex,
                slotIndex,
                c,
                prod,
                combo.comboPermiteElegirColor,
                colorSeleccion,
              )
            : c.varianteId
          const tallaId = eligeTalla
            ? tallaIdForSlot(
                componenteIndex,
                slotIndex,
                c,
                prod,
                combo.comboPermiteElegirTalla,
                colorSeleccion,
              )
            : c.tallaId
          const v = varianteId ? prod?.variantes?.find((x) => x.id === varianteId) : undefined
          const t = tallaId ? prod?.tallas?.find((x) => x.id === tallaId) : undefined
          const pick = colorSeleccion.find(
            (s) => s.componenteIndex === componenteIndex && s.slotIndex === slotIndex,
          )
          const cost = prod ? resolveComponenteCosto(prod, c, varianteId) : null
          out.push({
            productId: c.productId,
            ...(varianteId ? { varianteId } : {}),
            ...(tallaId ? { tallaId } : {}),
            cantidad: 1,
            ...(cost != null ? { costoUnitarioCop: cost } : {}),
            nombre: c.nombreSnapshot ?? prod?.nombre ?? combo.nombre,
            ...(pick?.varianteNombre ?? v?.nombre
              ? { varianteNombre: pick?.varianteNombre ?? v?.nombre }
              : {}),
            ...(pick?.tallaNombre ?? t?.nombre ? { tallaNombre: pick?.tallaNombre ?? t?.nombre } : {}),
          })
        }
      }
      continue
    }

    const qty = c.cantidad * comboQty
    if (qty <= 0) continue
    const cost = prod ? resolveComponenteCosto(prod, c) : null
    const v = c.varianteId ? prod?.variantes?.find((x) => x.id === c.varianteId) : undefined
    const t = c.tallaId ? prod?.tallas?.find((x) => x.id === c.tallaId) : undefined
    out.push({
      productId: c.productId,
      ...(c.varianteId ? { varianteId: c.varianteId } : {}),
      ...(c.tallaId ? { tallaId: c.tallaId } : {}),
      cantidad: qty,
      ...(cost != null ? { costoUnitarioCop: cost } : {}),
      nombre: c.nombreSnapshot ?? prod?.nombre ?? combo.nombre,
      ...(v?.nombre ? { varianteNombre: v.nombre } : {}),
      ...(t?.nombre ? { tallaNombre: t.nombre } : {}),
    })
  }
  return consolidateExpandidos(out)
}

function consolidateExpandidos(rows: McComboComponenteExpandido[]): McComboComponenteExpandido[] {
  const map = new Map<string, McComboComponenteExpandido>()
  for (const row of rows) {
    const key = `${row.productId}|${row.varianteId ?? ''}|${row.tallaId ?? ''}|${row.varianteNombre ?? ''}|${row.tallaNombre ?? ''}`
    const prev = map.get(key)
    if (prev) {
      map.set(key, { ...prev, cantidad: prev.cantidad + row.cantidad })
    } else {
      map.set(key, { ...row })
    }
  }
  return [...map.values()]
}

export function catalogStockDeltasFromComboExpansion(
  expandidos: McComboComponenteExpandido[],
): StockDelta[] {
  return expandidos.map((e) => ({
    productId: e.productId,
    ...(e.tallaId ? { varianteId: e.tallaId } : e.varianteId ? { varianteId: e.varianteId } : {}),
    cantidad: e.cantidad,
  }))
}

/** Stock POS de un componente (talla = varianteId en POS). */
export function resolvePosProductIdForComboComponente(
  c: McComboComponente,
  catalogProduct: McProducto | undefined,
  catalogToPos: CatalogToPosMap,
  posProductsInSede: (McPosProducto & { id: string })[] = [],
): string {
  const mapped = catalogToPos.get(c.productId)
  if (mapped) return mapped

  const linked = posProductsInSede.find((p) => p.catalogProductoId === c.productId)
  if (linked) return linked.id

  const posId = catalogProduct?.posProductoId?.trim()
  if (posId && posProductsInSede.some((p) => p.id === posId)) return posId

  return posId ?? c.productId
}

export function stockComponentePos(
  posStockMap: Map<string, number>,
  catalogProduct: McProducto | undefined,
  c: McComboComponente,
  catalogToPos: CatalogToPosMap,
  posProductsInSede: (McPosProducto & { id: string })[] = [],
): number {
  const posProductId = resolvePosProductIdForComboComponente(
    c,
    catalogProduct,
    catalogToPos,
    posProductsInSede,
  )
  const posProduct =
    posProductsInSede.find((p) => p.id === posProductId) ??
    posProductsInSede.find((p) => p.catalogProductoId === c.productId)
  const varianteId = c.tallaId ?? c.varianteId
  return posStockCantidadProducto(posProductId, posStockMap, posProduct, varianteId)
}

export function comboStockDisponiblePos(
  combo: Pick<McPosProducto, 'tipoProducto' | 'comboComponentes'>,
  products: ProductoLookup,
  posStockMap: Map<string, number>,
  catalogToPos: CatalogToPosMap,
  posProductsInSede: (McPosProducto & { id: string })[] = [],
): number {
  const componentes = comboComponentesValidos(combo)
  if (!esProductoCombo(combo) || componentes.length === 0) return 0

  let min = Number.POSITIVE_INFINITY
  for (const c of componentes) {
    const prod = products.get(c.productId)
    const disp = stockComponentePos(posStockMap, prod, c, catalogToPos, posProductsInSede)
    const packs = Math.floor(disp / c.cantidad)
    min = Math.min(min, packs)
  }
  return Number.isFinite(min) ? Math.max(0, min) : 0
}

export function posStockDeltasFromComboExpansion(
  expandidos: McComboComponenteExpandido[],
  catalogToPos: CatalogToPosMap,
  products: ProductoLookup,
): PosStockDelta[] {
  return expandidos.map((e) => {
    const catalog = products.get(e.productId)
    const posProductId = catalogToPos.get(e.productId) ?? catalog?.posProductoId ?? e.productId
    return {
      productoId: posProductId,
      ...(e.varianteId
        ? { varianteId: e.varianteId }
        : e.tallaId
          ? { varianteId: e.tallaId }
          : {}),
      ...(e.varianteId && e.tallaId ? { tallaId: e.tallaId } : {}),
      cantidad: e.cantidad,
    }
  })
}

export function buildCatalogToPosMap(
  posProducts: (McPosProducto & { id: string })[],
  sedeId: string,
  catalogProducts?: (McProducto & { id: string })[],
): CatalogToPosMap {
  const map = new Map<string, string>()
  const posInSede = posProducts.filter((p) => p.sedeId === sedeId)
  const posIdsInSede = new Set(posInSede.map((p) => p.id))

  for (const p of posInSede) {
    if (p.catalogProductoId) map.set(p.catalogProductoId, p.id)
  }

  if (catalogProducts) {
    for (const c of catalogProducts) {
      if (map.has(c.id)) continue
      const posId = c.posProductoId?.trim()
      if (posId && posIdsInSede.has(posId)) map.set(c.id, posId)
    }
  }

  return map
}

export function comboComponenteEtiqueta(
  c: McComboComponente,
  prod?: McProducto,
  opts?: { comboPermiteElegirColor?: boolean; comboPermiteElegirTalla?: boolean },
): string {
  const base = c.nombreSnapshot ?? prod?.nombre ?? 'Producto'
  const parts: string[] = []
  const eligeTalla = componentePermiteElegirTalla(c, prod, opts?.comboPermiteElegirTalla)
  if (eligeTalla) {
    parts.push('talla a elegir')
  } else if (c.tallaId && prod?.tallas) {
    const t = prod.tallas.find((x) => x.id === c.tallaId)
    if (t) parts.push(t.nombre)
  }
  const eligeColor = componentePermiteElegirColor(c, prod, opts?.comboPermiteElegirColor)
  if (eligeColor) {
    parts.push('color a elegir')
  } else if (c.varianteId && prod?.variantes) {
    const v = prod.variantes.find((x) => x.id === c.varianteId)
    if (v?.nombre) parts.push(v.nombre)
  }
  const suffix = parts.length > 0 ? ` (${parts.join(' · ')})` : ''
  return `${c.cantidad}× ${base}${suffix}`
}

export function comboIncluyeResumen(
  combo: Pick<McProducto, 'comboComponentes' | 'comboPermiteElegirColor' | 'comboPermiteElegirTalla'>,
  products: ProductoLookup,
  colorSeleccion?: McComboColorSeleccion[],
): string[] {
  if (colorSeleccion?.length) {
    const colorTxt = comboColorSeleccionResumen(combo, products, colorSeleccion)
    if (colorTxt) return [colorTxt]
  }
  return comboComponentesValidos(combo).map((c) =>
    comboComponenteEtiqueta(c, products.get(c.productId), {
      comboPermiteElegirColor: combo.comboPermiteElegirColor,
      comboPermiteElegirTalla: combo.comboPermiteElegirTalla,
    }),
  )
}

export function comboReferenciasValidas(
  componentes: McComboComponente[],
  products: ProductoLookup,
  comboProductId?: string,
  comboPermiteElegirColor?: boolean,
  comboPermiteElegirTalla?: boolean,
): string | null {
  if (componentes.length === 0) return 'Agregá al menos un producto al combo.'
  if (comboPermiteElegirColor) {
    const algunoConColor = componentes.some((c) => {
      const prod = products.get(c.productId)
      return prod && componenteTieneColoresElegibles(prod)
    })
    if (!algunoConColor) {
      return 'Para permitir elegir color, incluí al menos una prenda con variantes de color o tela.'
    }
  }
  if (comboPermiteElegirTalla) {
    const algunoConTalla = componentes.some((c) => {
      const prod = products.get(c.productId)
      return prod && componenteTieneTallasElegibles(prod)
    })
    if (!algunoConTalla) {
      return 'Para permitir elegir talla, incluí al menos una prenda con curva de tallas.'
    }
  }
  for (const c of componentes) {
    if (!Number.isFinite(c.cantidad) || c.cantidad < 1) {
      const prod = products.get(c.productId)
      return `Indicá la cantidad de «${prod?.nombre ?? 'producto'}».`
    }
    if (comboProductId && c.productId === comboProductId) {
      return 'Un combo no puede incluirse a sí mismo.'
    }
    const prod = products.get(c.productId)
    if (!prod) return 'Hay un producto del combo que ya no existe.'
    if (!prod.activo) return `«${prod.nombre}» está inactivo.`
    if (esProductoCombo(prod)) return 'Un combo no puede incluir otro combo.'
    const eligeTalla = componentePermiteElegirTalla(c, prod, comboPermiteElegirTalla)
    if (prod.esRopa && (prod.tallas?.length ?? 0) > 0 && !c.tallaId && !eligeTalla) {
      return `Elegí la talla de «${prod.nombre}» o activá «cliente elige talla».`
    }
    const eligeColor = componentePermiteElegirColor(c, prod, comboPermiteElegirColor)
    const vs = variantesValidas(prod).filter((v) => !prod.esRopa || v.tipo?.trim().toLowerCase() !== 'talla')
    if (
      vs.length > 0 &&
      productoUsaStockPorVariante(prod) &&
      !c.varianteId &&
      !prod.esRopa &&
      !eligeColor
    ) {
      return `Elegí la variante de «${prod.nombre}».`
    }
    if (
      vs.length > 0 &&
      !prod.esRopa &&
      !eligeColor &&
      componenteTieneColoresElegibles(prod) &&
      !c.varianteId
    ) {
      return `Elegí el color de «${prod.nombre}» o activá «cliente elige color».`
    }
  }
  return null
}
