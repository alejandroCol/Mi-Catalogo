import type { Firestore } from 'firebase-admin/firestore'

type ComboComponente = {
  productId: string
  cantidad: number
  varianteId?: string
  tallaId?: string
  permiteElegirColor?: boolean
  permiteElegirTalla?: boolean
}

type ComboColorSeleccion = {
  componenteIndex: number
  slotIndex: number
  varianteId?: string
  varianteNombre?: string
  tallaId?: string
  tallaNombre?: string
}

type VarianteDoc = {
  id: string
  stock?: number
  precioCostoCop?: number
  tipo?: string
  hex?: string
  nombre?: string
}

type ProductoDoc = {
  nombre?: string
  tipoProducto?: string
  comboComponentes?: ComboComponente[]
  comboPermiteElegirColor?: boolean
  comboPermiteElegirTalla?: boolean
  stock?: number
  esRopa?: boolean
  tallas?: { id: string; nombre: string; stock: number }[]
  skus?: { id: string; varianteId: string; tallaId: string; stock: number }[]
  variantes?: VarianteDoc[]
  precioCostoCop?: number
  activo?: boolean
  enCatalogo?: boolean
}

type OrdenLinea = {
  productId: string
  nombre: string
  cantidad: number
  precioUnitarioCop: number
  costoUnitarioCop?: number
  varianteId?: string
  tallaId?: string
  esCombo?: boolean
  comboColorSeleccion?: ComboColorSeleccion[]
  componentesExpandidos?: {
    productId: string
    varianteId?: string
    tallaId?: string
    cantidad: number
    costoUnitarioCop?: number
    nombre?: string
    varianteNombre?: string
    tallaNombre?: string
  }[]
}

type StockDeduction = {
  productId: string
  varianteId?: string
  tallaId?: string
  cantidad: number
}

function usaMatrizSku(prod: ProductoDoc): boolean {
  return !!(prod.esRopa && prod.skus?.length)
}

function sumarStockSkusServer(skus: NonNullable<ProductoDoc['skus']>): number {
  return skus.reduce((s, sku) => s + Math.max(0, Math.floor(sku.stock ?? 0)), 0)
}

function syncTallasStockFromSkusServer(
  tallas: NonNullable<ProductoDoc['tallas']>,
  skus: NonNullable<ProductoDoc['skus']>,
): ProductoDoc['tallas'] {
  return tallas.map((t) => ({
    ...t,
    stock: skus
      .filter((s) => s.tallaId === t.id)
      .reduce((sum, s) => sum + Math.max(0, Math.floor(s.stock ?? 0)), 0),
  }))
}

function stockRopaLine(
  product: ProductoDoc,
  line: { varianteId?: string; tallaId?: string },
): number {
  if (usaMatrizSku(product) && line.varianteId && line.tallaId) {
    const sku = product.skus!.find((s) => s.varianteId === line.varianteId && s.tallaId === line.tallaId)
    return Math.floor(sku?.stock ?? 0)
  }
  if (product.esRopa && line.tallaId) {
    const t = (product.tallas ?? []).find((x) => x.id === line.tallaId)
    return Math.floor(t?.stock ?? 0)
  }
  if (line.varianteId) {
    const v = (product.variantes ?? []).find((x) => x.id === line.varianteId)
    if (v && typeof v.stock === 'number') return Math.floor(v.stock)
  }
  return Math.floor(product.stock ?? 0)
}

function applySkuDelta(
  prod: ProductoDoc,
  d: StockDeduction,
  sign: -1 | 1,
): ProductoDoc | null {
  if (!usaMatrizSku(prod) || !d.varianteId || !d.tallaId || !prod.skus?.length) return null
  const next = { ...prod }
  next.skus = prod.skus.map((s) =>
    s.varianteId === d.varianteId && s.tallaId === d.tallaId
      ? { ...s, stock: Math.max(0, Math.floor(s.stock) + sign * d.cantidad) }
      : s,
  )
  if (prod.tallas?.length) {
    next.tallas = syncTallasStockFromSkusServer(prod.tallas, next.skus)
  }
  next.stock = sumarStockSkusServer(next.skus)
  return next
}

function esCombo(p: ProductoDoc | undefined): boolean {
  return p?.tipoProducto === 'combo'
}

function componentesValidos(p: ProductoDoc): ComboComponente[] {
  return (p.comboComponentes ?? []).filter(
    (c) => c.productId?.trim() && Number.isFinite(c.cantidad) && c.cantidad > 0,
  )
}

function stockComponente(prod: ProductoDoc, c: ComboComponente, combo?: ProductoDoc): number {
  const eligeTalla = combo ? componentePermiteElegirTalla(c, prod, combo.comboPermiteElegirTalla) : false
  const eligeColor = combo ? componentePermiteElegirColor(c, prod, combo.comboPermiteElegirColor) : false

  if (eligeTalla || (eligeColor && !c.tallaId)) {
    if (usaMatrizSku(prod)) {
      return (prod.skus ?? []).reduce((s, sku) => s + Math.max(0, Math.floor(sku.stock ?? 0)), 0)
    }
    if (prod.esRopa && prod.tallas?.length) {
      return prod.tallas.reduce((s, t) => s + Math.max(0, Math.floor(t.stock ?? 0)), 0)
    }
  }

  if (prod.esRopa && c.tallaId) {
    if (usaMatrizSku(prod) && c.varianteId) {
      const sku = prod.skus?.find((s) => s.varianteId === c.varianteId && s.tallaId === c.tallaId)
      return Math.max(0, Math.floor(sku?.stock ?? 0))
    }
    const t = (prod.tallas ?? []).find((x) => x.id === c.tallaId)
    return Math.max(0, Math.floor(t?.stock ?? 0))
  }
  if (c.varianteId) {
    const v = (prod.variantes ?? []).find((x) => x.id === c.varianteId)
    if (v && typeof v.stock === 'number') return Math.max(0, Math.floor(v.stock))
  }
  return Math.max(0, Math.floor(prod.stock ?? 0))
}

export function comboStockDisponibleServer(
  combo: ProductoDoc,
  componentDocs: Map<string, ProductoDoc>,
): number {
  const componentes = componentesValidos(combo)
  if (!esCombo(combo) || componentes.length === 0) return 0
  let min = Number.POSITIVE_INFINITY
  for (const c of componentes) {
    const prod = componentDocs.get(c.productId)
    if (!prod?.activo) return 0
    const disp = stockComponente(prod, c, combo)
    min = Math.min(min, Math.floor(disp / c.cantidad))
  }
  return Number.isFinite(min) ? Math.max(0, min) : 0
}

function variantesColorComponente(prod: ProductoDoc): VarianteDoc[] {
  return (prod.variantes ?? []).filter((v) => {
    const tipo = (v.tipo ?? '').trim().toLowerCase()
    if (prod.esRopa) return tipo === 'color' || tipo === 'tela'
    return tipo === 'color' || tipo === 'tela' || Boolean(v.hex?.trim())
  })
}

function componentePermiteElegirColor(
  c: ComboComponente,
  prod: ProductoDoc | undefined,
  comboPermiteElegirColor?: boolean,
): boolean {
  if (!comboPermiteElegirColor || !prod) return false
  if (c.permiteElegirColor === false) return false
  return variantesColorComponente(prod).length > 0
}

function componentePermiteElegirTalla(
  c: ComboComponente,
  prod: ProductoDoc | undefined,
  comboPermiteElegirTalla?: boolean,
): boolean {
  if (!comboPermiteElegirTalla || !prod) return false
  if (c.permiteElegirTalla === false) return false
  return prod.esRopa === true && (prod.tallas?.length ?? 0) > 0
}

function tallaIdForSlot(
  componenteIndex: number,
  slotIndex: number,
  c: ComboComponente,
  prod: ProductoDoc | undefined,
  comboPermiteElegirTalla: boolean | undefined,
  seleccion: ComboColorSeleccion[] | undefined,
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
  c: ComboComponente,
  prod: ProductoDoc | undefined,
  comboPermiteElegirColor: boolean | undefined,
  seleccion: ComboColorSeleccion[] | undefined,
): string | undefined {
  if (componentePermiteElegirColor(c, prod, comboPermiteElegirColor)) {
    const pick = seleccion?.find(
      (s) => s.componenteIndex === componenteIndex && s.slotIndex === slotIndex,
    )
    return pick?.varianteId ?? c.varianteId
  }
  return c.varianteId
}

function mergeStockDeductions(rows: StockDeduction[]): StockDeduction[] {
  const merged = new Map<string, StockDeduction>()
  for (const d of rows) {
    const key = `${d.productId}|${d.tallaId ?? ''}|${d.varianteId ?? ''}`
    const prev = merged.get(key)
    if (prev) prev.cantidad += d.cantidad
    else merged.set(key, { ...d })
  }
  return [...merged.values()]
}

function expandComboLine(
  combo: ProductoDoc,
  qty: number,
  componentDocs: Map<string, ProductoDoc>,
  colorSeleccion?: ComboColorSeleccion[],
): StockDeduction[] {
  const out: StockDeduction[] = []
  const componentes = componentesValidos(combo)
  for (let componenteIndex = 0; componenteIndex < componentes.length; componenteIndex++) {
    const c = componentes[componenteIndex]!
    const prod = componentDocs.get(c.productId)
    const eligeColor = componentePermiteElegirColor(c, prod, combo.comboPermiteElegirColor)
    const eligeTalla = componentePermiteElegirTalla(c, prod, combo.comboPermiteElegirTalla)

    if ((eligeColor || eligeTalla) && colorSeleccion?.length) {
      for (let comboUnit = 0; comboUnit < qty; comboUnit++) {
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
          out.push({
            productId: c.productId,
            cantidad: 1,
            ...(tallaId ? { tallaId } : {}),
            ...(varianteId ? { varianteId } : {}),
          })
        }
      }
      continue
    }

    const total = c.cantidad * qty
    if (total <= 0) continue
    out.push({
      productId: c.productId,
      ...(c.tallaId ? { tallaId: c.tallaId } : {}),
      ...(c.varianteId ? { varianteId: c.varianteId } : {}),
      cantidad: total,
    })
  }
  return mergeStockDeductions(out)
}

function lineToDeductions(
  line: OrdenLinea,
  product: ProductoDoc,
  componentDocs: Map<string, ProductoDoc>,
): StockDeduction[] {
  if (line.componentesExpandidos?.length) {
    return line.componentesExpandidos.map((e) => ({
      productId: e.productId,
      cantidad: e.cantidad,
      ...(e.tallaId ? { tallaId: e.tallaId } : {}),
      ...(e.varianteId ? { varianteId: e.varianteId } : {}),
    }))
  }
  if (esCombo(product)) {
    return expandComboLine(product, line.cantidad, componentDocs, line.comboColorSeleccion)
  }
  return [
    {
      productId: line.productId,
      cantidad: line.cantidad,
      ...(line.tallaId ? { tallaId: line.tallaId } : {}),
      ...(line.varianteId ? { varianteId: line.varianteId } : {}),
    },
  ]
}

function applyDeductionToProduct(prod: ProductoDoc, d: StockDeduction): ProductoDoc {
  const skuApplied = applySkuDelta(prod, d, -1)
  if (skuApplied) return skuApplied
  const next = { ...prod }
  if (prod.esRopa && d.tallaId && prod.tallas?.length) {
    next.tallas = prod.tallas.map((t) =>
      t.id === d.tallaId ? { ...t, stock: Math.max(0, Math.floor(t.stock) - d.cantidad) } : t,
    )
    next.stock = next.tallas.reduce((s, t) => s + Math.max(0, Math.floor(t.stock)), 0)
    return next
  }
  if (d.varianteId && prod.variantes?.length) {
    next.variantes = prod.variantes.map((v) =>
      v.id === d.varianteId
        ? { ...v, stock: Math.max(0, Math.floor(v.stock ?? 0) - d.cantidad) }
        : v,
    )
    next.stock = next.variantes.reduce((s, v) => s + Math.max(0, Math.floor(v.stock ?? 0)), 0)
    return next
  }
  next.stock = Math.max(0, Math.floor(prod.stock ?? 0) - d.cantidad)
  return next
}

function applyAdditionToProduct(prod: ProductoDoc, d: StockDeduction): ProductoDoc {
  const skuApplied = applySkuDelta(prod, d, 1)
  if (skuApplied) return skuApplied
  const next = { ...prod }
  if (prod.esRopa && d.tallaId && prod.tallas?.length) {
    next.tallas = prod.tallas.map((t) =>
      t.id === d.tallaId ? { ...t, stock: Math.max(0, Math.floor(t.stock) + d.cantidad) } : t,
    )
    next.stock = next.tallas.reduce((s, t) => s + Math.max(0, Math.floor(t.stock)), 0)
    return next
  }
  if (d.varianteId && prod.variantes?.length) {
    next.variantes = prod.variantes.map((v) =>
      v.id === d.varianteId
        ? { ...v, stock: Math.max(0, Math.floor(v.stock ?? 0) + d.cantidad) }
        : v,
    )
    next.stock = next.variantes.reduce((s, v) => s + Math.max(0, Math.floor(v.stock ?? 0)), 0)
    return next
  }
  next.stock = Math.max(0, Math.floor(prod.stock ?? 0) + d.cantidad)
  return next
}

export async function loadComponentDocsForComboValidation(
  db: Firestore,
  tenantId: string,
  combo: ProductoDoc,
): Promise<Map<string, ProductoDoc>> {
  const map = new Map<string, ProductoDoc>()
  for (const c of componentesValidos(combo)) {
    if (map.has(c.productId)) continue
    const snap = await db.doc(`mc_tenants/${tenantId}/productos/${c.productId}`).get()
    if (snap.exists) map.set(c.productId, snap.data() as ProductoDoc)
  }
  return map
}

export async function validateCatalogLineStock(
  db: Firestore,
  tenantId: string,
  line: { productId: string; cantidad: number; varianteId?: string; tallaId?: string },
): Promise<void> {
  const snap = await db.doc(`mc_tenants/${tenantId}/productos/${line.productId}`).get()
  if (!snap.exists) throw new Error('Producto no disponible.')
  const product = snap.data() as ProductoDoc
  if (product.activo !== true || product.enCatalogo !== true) {
    throw new Error('Un producto no está a la venta.')
  }
  if (esCombo(product)) {
    const componentDocs = await loadComponentDocsForComboValidation(db, tenantId, product)
    const disp = comboStockDisponibleServer(product, componentDocs)
    if (disp < line.cantidad) {
      throw new Error(`Stock insuficiente: ${product.nombre ?? line.productId}`)
    }
    return
  }
  let stock = Math.floor(product.stock ?? 0)
  stock = stockRopaLine(product, line)
  if (stock < line.cantidad) {
    throw new Error(`Stock insuficiente: ${product.nombre ?? line.productId}`)
  }
}

export async function fulfillCatalogOrderInventory(
  db: Firestore,
  tenantId: string,
  orderId: string,
): Promise<boolean> {
  const orderRef = db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${orderId}`)
  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef)
    if (!orderSnap.exists) return false
    const order = orderSnap.data() as {
      estado?: string
      inventarioDescontadoAt?: number
      lineas?: OrdenLinea[]
    }
    if (order.inventarioDescontadoAt) return false
    if (order.estado !== 'pagado' && order.estado !== 'en_preparacion' && order.estado !== 'listo_envio') {
      return false
    }

    const lineas = Array.isArray(order.lineas) ? order.lineas : []
    const productCache = new Map<string, ProductoDoc>()
    const componentCache = new Map<string, ProductoDoc>()
    const deductions: StockDeduction[] = []

    for (const line of lineas) {
      const pid = typeof line.productId === 'string' ? line.productId.trim() : ''
      const qty = typeof line.cantidad === 'number' ? Math.floor(line.cantidad) : 0
      if (!pid || qty < 1) continue

      if (!productCache.has(pid)) {
        const ps = await tx.get(db.doc(`mc_tenants/${tenantId}/productos/${pid}`))
        if (!ps.exists) continue
        productCache.set(pid, ps.data() as ProductoDoc)
      }
      const product = productCache.get(pid)!
      if (esCombo(product)) {
        for (const c of componentesValidos(product)) {
          if (componentCache.has(c.productId)) continue
          const cs = await tx.get(db.doc(`mc_tenants/${tenantId}/productos/${c.productId}`))
          if (cs.exists) componentCache.set(c.productId, cs.data() as ProductoDoc)
        }
      }
      deductions.push(...lineToDeductions(line, product, componentCache))
    }

    const merged = new Map<string, StockDeduction>()
    for (const d of deductions) {
      const key = `${d.productId}|${d.tallaId ?? ''}|${d.varianteId ?? ''}`
      const prev = merged.get(key)
      if (prev) prev.cantidad += d.cantidad
      else merged.set(key, { ...d })
    }

    const comboIdsToRefresh = new Set<string>()
    for (const line of lineas) {
      const p = productCache.get(line.productId)
      if (p && esCombo(p)) comboIdsToRefresh.add(line.productId)
    }

    for (const d of merged.values()) {
      const pref = db.doc(`mc_tenants/${tenantId}/productos/${d.productId}`)
      const ps = await tx.get(pref)
      if (!ps.exists) throw new Error(`Componente no encontrado: ${d.productId}`)
      const current = ps.data() as ProductoDoc
      const updated = applyDeductionToProduct(current, d)
      tx.update(pref, {
        stock: updated.stock,
        ...(updated.tallas ? { tallas: updated.tallas } : {}),
        ...(updated.skus ? { skus: updated.skus } : {}),
        ...(updated.variantes ? { variantes: updated.variantes } : {}),
        updatedAt: Date.now(),
      })
      productCache.set(d.productId, updated)
    }

    for (const comboId of comboIdsToRefresh) {
      const combo = productCache.get(comboId)
      if (!combo || !esCombo(combo)) continue
      const componentDocs = new Map<string, ProductoDoc>()
      for (const c of componentesValidos(combo)) {
        const docData = productCache.get(c.productId)
        if (docData) componentDocs.set(c.productId, docData)
      }
      const stockCombo = comboStockDisponibleServer(combo, componentDocs)
      tx.update(db.doc(`mc_tenants/${tenantId}/productos/${comboId}`), {
        stock: stockCombo,
        updatedAt: Date.now(),
      })
    }

    tx.update(orderRef, {
      inventarioDescontadoAt: Date.now(),
      updatedAt: Date.now(),
    })
    return true
  })
}

export function comboCostFromComponents(
  combo: ProductoDoc,
  componentDocs: Map<string, ProductoDoc>,
  colorSeleccion?: ComboColorSeleccion[],
): number | null {
  const expandidos = expandComboLineForCost(combo, 1, componentDocs, colorSeleccion)
  let total = 0
  let has = false
  for (const row of expandidos) {
    if (row.costoUnitarioCop == null) continue
    has = true
    total += row.costoUnitarioCop * row.cantidad
  }
  return has ? total : null
}

export async function enrichLineasWithComboCost(
  db: Firestore,
  tenantId: string,
  lineas: OrdenLinea[],
): Promise<OrdenLinea[]> {
  const out: OrdenLinea[] = []
  for (const line of lineas) {
    const snap = await db.doc(`mc_tenants/${tenantId}/productos/${line.productId}`).get()
    if (!snap.exists) {
      out.push(line)
      continue
    }
    const product = snap.data() as ProductoDoc
    if (!esCombo(product)) {
      out.push(line)
      continue
    }
    const componentDocs = await loadComponentDocsForComboValidation(db, tenantId, product)
    const cost = comboCostFromComponents(product, componentDocs, line.comboColorSeleccion)
    const componentesExpandidos = expandComboLineForCost(
      product,
      line.cantidad,
      componentDocs,
      line.comboColorSeleccion,
    )
    out.push({
      ...line,
      esCombo: true,
      ...(cost != null ? { costoUnitarioCop: cost } : {}),
      componentesExpandidos,
    })
  }
  return out
}

function resolveComponenteCosto(
  prod: ProductoDoc,
  c: ComboComponente,
  varianteId?: string,
): number | undefined {
  const vid = varianteId ?? c.varianteId
  if (vid) {
    const v = prod.variantes?.find((x) => x.id === vid)
    if (v?.precioCostoCop != null && v.precioCostoCop >= 0) return Math.round(v.precioCostoCop)
  }
  if (prod.precioCostoCop != null && prod.precioCostoCop >= 0) return Math.round(prod.precioCostoCop)
  return undefined
}

function expandComboLineForCost(
  combo: ProductoDoc,
  qty: number,
  componentDocs: Map<string, ProductoDoc>,
  colorSeleccion?: ComboColorSeleccion[],
): NonNullable<OrdenLinea['componentesExpandidos']> {
  const out: NonNullable<OrdenLinea['componentesExpandidos']> = []
  const componentes = componentesValidos(combo)
  for (let componenteIndex = 0; componenteIndex < componentes.length; componenteIndex++) {
    const c = componentes[componenteIndex]!
    const prod = componentDocs.get(c.productId)
    const eligeColor = componentePermiteElegirColor(c, prod, combo.comboPermiteElegirColor)
    const eligeTalla = componentePermiteElegirTalla(c, prod, combo.comboPermiteElegirTalla)

    if ((eligeColor || eligeTalla) && colorSeleccion?.length) {
      for (let comboUnit = 0; comboUnit < qty; comboUnit++) {
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
          const costoUnitarioCop = prod ? resolveComponenteCosto(prod, c, varianteId) : undefined
          out.push({
            productId: c.productId,
            cantidad: 1,
            ...(tallaId ? { tallaId } : {}),
            ...(varianteId ? { varianteId } : {}),
            ...(costoUnitarioCop != null ? { costoUnitarioCop } : {}),
            nombre: prod?.nombre,
            ...(pick?.varianteNombre ?? v?.nombre
              ? { varianteNombre: pick?.varianteNombre ?? v?.nombre }
              : {}),
            ...(pick?.tallaNombre ?? t?.nombre ? { tallaNombre: pick?.tallaNombre ?? t?.nombre } : {}),
          })
        }
      }
      continue
    }

    const total = c.cantidad * qty
    if (total <= 0) continue
    const costoUnitarioCop = prod ? resolveComponenteCosto(prod, c) : undefined
    const v = c.varianteId ? prod?.variantes?.find((x) => x.id === c.varianteId) : undefined
    const t = c.tallaId ? prod?.tallas?.find((x) => x.id === c.tallaId) : undefined
    out.push({
      productId: c.productId,
      cantidad: total,
      ...(c.tallaId ? { tallaId: c.tallaId } : {}),
      ...(c.varianteId ? { varianteId: c.varianteId } : {}),
      ...(costoUnitarioCop != null ? { costoUnitarioCop } : {}),
      nombre: prod?.nombre,
      ...(v?.nombre ? { varianteNombre: v.nombre } : {}),
      ...(t?.nombre ? { tallaNombre: t.nombre } : {}),
    })
  }

  const merged = new Map<string, NonNullable<OrdenLinea['componentesExpandidos']>[number]>()
  for (const row of out) {
    const key = `${row.productId}|${row.varianteId ?? ''}|${row.tallaId ?? ''}|${row.varianteNombre ?? ''}|${row.tallaNombre ?? ''}`
    const prev = merged.get(key)
    if (prev) merged.set(key, { ...prev, cantidad: prev.cantidad + row.cantidad })
    else merged.set(key, { ...row })
  }
  return [...merged.values()]
}

/** Restock catálogo (devolución completa de orden). */
export async function restockCatalogOrderInventory(
  db: Firestore,
  tenantId: string,
  orderId: string,
): Promise<boolean> {
  const orderRef = db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${orderId}`)
  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef)
    if (!orderSnap.exists) return false
    const order = orderSnap.data() as {
      inventarioDescontadoAt?: number
      inventarioRestockAt?: number
      lineas?: OrdenLinea[]
    }
    if (!order.inventarioDescontadoAt || order.inventarioRestockAt) return false

    const lineas = Array.isArray(order.lineas) ? order.lineas : []
    const productCache = new Map<string, ProductoDoc>()
    const componentCache = new Map<string, ProductoDoc>()
    const additions: StockDeduction[] = []

    for (const line of lineas) {
      if (!productCache.has(line.productId)) {
        const ps = await tx.get(db.doc(`mc_tenants/${tenantId}/productos/${line.productId}`))
        if (ps.exists) productCache.set(line.productId, ps.data() as ProductoDoc)
      }
      const product = productCache.get(line.productId)
      if (!product) continue
      if (esCombo(product)) {
        for (const c of componentesValidos(product)) {
          if (componentCache.has(c.productId)) continue
          const cs = await tx.get(db.doc(`mc_tenants/${tenantId}/productos/${c.productId}`))
          if (cs.exists) componentCache.set(c.productId, cs.data() as ProductoDoc)
        }
      }
      additions.push(...lineToDeductions(line, product, componentCache))
    }

    for (const d of additions) {
      const pref = db.doc(`mc_tenants/${tenantId}/productos/${d.productId}`)
      const ps = await tx.get(pref)
      if (!ps.exists) continue
      const current = ps.data() as ProductoDoc
      const updated = applyAdditionToProduct(current, d)
      tx.update(pref, {
        stock: updated.stock,
        ...(updated.tallas ? { tallas: updated.tallas } : {}),
        ...(updated.skus ? { skus: updated.skus } : {}),
        ...(updated.variantes ? { variantes: updated.variantes } : {}),
        updatedAt: Date.now(),
      })
      productCache.set(d.productId, updated)
    }

    for (const line of lineas) {
      const combo = productCache.get(line.productId)
      if (!combo || !esCombo(combo)) continue
      const componentDocs = new Map<string, ProductoDoc>()
      for (const c of componentesValidos(combo)) {
        const docData = productCache.get(c.productId)
        if (docData) componentDocs.set(c.productId, docData)
      }
      const stockCombo = comboStockDisponibleServer(combo, componentDocs)
      tx.update(db.doc(`mc_tenants/${tenantId}/productos/${line.productId}`), {
        stock: stockCombo,
        updatedAt: Date.now(),
      })
    }

    tx.update(orderRef, {
      inventarioRestockAt: Date.now(),
      updatedAt: Date.now(),
    })
    return true
  })
}
