import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { isMcStoreOwnerUser } from '@/lib/mcUserFromFirestore'
import { getDb } from '@/lib/firebase'
import {
  mcPosVentasCollection,
} from '@/lib/mcPosCollections'
import { usePosProductos } from '@/pos/hooks/usePosProductos'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosStock } from '@/pos/hooks/usePosStock'
import { usePosTurnoAbierto } from '@/pos/hooks/usePosTurnoAbierto'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { PosSaleCelebration } from '@/pos/components/PosSaleCelebration'
import { PosEmptyState } from '@/pos/components/PosEmptyState'
import { burstPosConfetti } from '@/pos/lib/posConfetti'
import { playPosSaleSound } from '@/pos/lib/posSaleSound'
import { emitMcPosVenta, ventaToPosPayload } from '@/pos/lib/posEvents'
import { formatCopInputWhileTyping, parseCopInput } from '@/pos/lib/posCopInput'
import { mcPosPrinter } from '@/pos/lib/posPrinterService'
import { sumStockForProduct, syncCatalogStockFromPos } from '@/pos/lib/posCatalogSync'
import { useCatalogProductos } from '@/pos/hooks/useCatalogProductos'
import {
  applyPosStockDeltasBatch,
  buildPosStockDeltasForLine,
  posComboCostoUnitario,
} from '@/pos/lib/posComboStock'
import { PosComboColorModal } from '@/pos/components/PosComboColorModal'
import { PosRopaSkuPickerModal } from '@/pos/components/PosRopaSkuPickerModal'
import {
  posStockDisponibleSku,
  resolvePosProductoSkuView,
} from '@/pos/lib/posProductoSkus'
import { inferPosStockModo } from '@/pos/lib/posProductoVariantes'
import {
  buildPosVentasCatalogContext,
  posProductoStockDisponible,
  posProductosEnCatalogoVentas,
  posProductosVendibles,
} from '@/pos/lib/posVentasCatalog'
import { ensureComboPosMirrorsForSede } from '@/lib/comboPosSync'
import { mcPosStockMapKey } from '@/lib/mcPosStockMapKey'
import {
  comboRequiereSeleccionCliente,
  comboColorSeleccionCompleta,
  esProductoCombo,
  expandComboComponentes,
  comboColorSeleccionKey,
  comboColorSeleccionResumen,
} from '@/lib/comboProducto'
import type { McComboColorSeleccion, McPosLineaPago, McPosLineaVenta, McPosMetodoPago, McPosProducto } from '@/types/mc'

const COMBO_OPCIONES_MSG = 'Completá color y talla de cada prenda del combo.'

type ModoPagoUi = 'efectivo' | 'transferencia' | 'mixto'

const METODO_LABEL: Record<McPosMetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  credito: 'Crédito',
}

type LineaKey = string

function lineaKey(
  productoId: string,
  varianteId?: string,
  tallaId?: string,
  comboColorSeleccion?: McComboColorSeleccion[],
): LineaKey {
  const colorK = comboColorSeleccion?.length ? comboColorSeleccionKey(comboColorSeleccion) : ''
  const variantK = varianteId && tallaId ? `${varianteId}__${tallaId}` : varianteId ?? ''
  return `${productoId}__${variantK}__${colorK}`
}

function lineasParaFirestore(lineas: McPosLineaVenta[]): McPosLineaVenta[] {
  return lineas.map((l) => ({
    productoId: l.productoId,
    nombre: l.nombre,
    cantidad: l.cantidad,
    precioUnitarioCop: l.precioUnitarioCop,
    subtotalCop: l.subtotalCop,
    ...(l.varianteId ? { varianteId: l.varianteId } : {}),
    ...(l.tallaId ? { tallaId: l.tallaId } : {}),
    ...(l.costoUnitarioCop != null && l.costoUnitarioCop >= 0 ? { costoUnitarioCop: l.costoUnitarioCop } : {}),
    ...(l.descuentoCop != null && l.descuentoCop > 0 ? { descuentoCop: l.descuentoCop } : {}),
    ...(l.esCombo ? { esCombo: true } : {}),
    ...(l.componentesExpandidos?.length ? { componentesExpandidos: l.componentesExpandidos } : {}),
    ...(l.comboColorSeleccion?.length ? { comboColorSeleccion: l.comboColorSeleccion } : {}),
  }))
}

type Props = {
  cajaPath: string
  sedeIdOverride?: string | null
}

export function PosVentasPage({ cajaPath, sedeIdOverride }: Props) {
  const { profile, tenant, firebaseUser, isImpersonating } = useMcAuth()
  const nav = useNavigate()
  const tenantId = tenant?.id ?? profile?.tenantId
  const vendedorUid = firebaseUser?.uid ?? ''
  const { sedes } = usePosSedes(tenantId)
  const [sedePicker, setSedePicker] = useState(sedeIdOverride ?? profile?.posSedeId ?? '')
  const sedeId = sedeIdOverride ?? (sedePicker || profile?.posSedeId) ?? null
  const sede = sedes.find((s) => s.id === sedeId)
  const { productos } = usePosProductos(tenantId, sedeId ?? undefined)
  const { productos: catalogProductos } = useCatalogProductos(tenantId)
  const { stock } = usePosStock(tenantId, sedeId ?? undefined)
  const { stock: stockGlobal } = usePosStock(tenantId)
  const { turno, loading: loadingTurno } = usePosTurnoAbierto(tenantId, vendedorUid, sedeId)

  const [lineas, setLineas] = useState<McPosLineaVenta[]>([])
  const [modoPago, setModoPago] = useState<ModoPagoUi>('efectivo')
  const [credito, setCredito] = useState(false)
  const [contraEntrega, setContraEntrega] = useState(false)
  const [pagosManuales, setPagosManuales] = useState<McPosLineaPago[]>([])
  const [metodoLinea, setMetodoLinea] = useState<McPosMetodoPago>('efectivo')
  const [montoLinea, setMontoLinea] = useState('')
  const [descuentoGlobal, setDescuentoGlobal] = useState('')
  const [motivoDescuento, setMotivoDescuento] = useState('')
  const [recibidoEfectivo, setRecibidoEfectivo] = useState('')
  const [vueltoAbierto, setVueltoAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [ventaOk, setVentaOk] = useState(false)
  const [celebrationTotal, setCelebrationTotal] = useState(0)
  const [totalPulse, setTotalPulse] = useState(false)
  const [search, setSearch] = useState('')
  const [variantPicker, setVariantPicker] = useState<(McPosProducto & { id: string }) | null>(null)
  const [skuPicker, setSkuPicker] = useState<(McPosProducto & { id: string }) | null>(null)
  const [comboColorPicker, setComboColorPicker] = useState<(McPosProducto & { id: string }) | null>(null)
  const comboSyncRef = useRef('')

  const dismissCelebration = useCallback(() => setVentaOk(false), [])

  useEffect(() => {
    if (!tenantId || !sedeId) return
    const combos = catalogProductos.filter((p) => esProductoCombo(p) && p.activo !== false)
    if (combos.length === 0) return
    const syncKey = `${tenantId}:${sedeId}:${combos.map((c) => c.id).sort().join(',')}`
    if (comboSyncRef.current === syncKey) return
    comboSyncRef.current = syncKey
    void ensureComboPosMirrorsForSede(tenantId, sedeId, combos, productos).catch(() => {
      comboSyncRef.current = ''
    })
  }, [tenantId, sedeId, catalogProductos, productos])

  useEffect(() => {
    if (isMcStoreOwnerUser(profile) || isImpersonating) return
    if (!loadingTurno && !turno && sedeId) {
      nav(cajaPath, { replace: true })
    }
  }, [loadingTurno, turno, sedeId, nav, cajaPath, profile, isImpersonating])

  const ventasCatalog = useMemo(
    () => buildPosVentasCatalogContext(productos, catalogProductos, stock, sedeId),
    [productos, catalogProductos, stock, sedeId],
  )
  const { stockMap, catalogLookup, catalogToPos } = ventasCatalog

  const productosCatalogo = useMemo(
    () => posProductosEnCatalogoVentas(productos),
    [productos],
  )

  const productosConStock = useMemo(
    () => posProductosVendibles(productos, ventasCatalog),
    [productos, ventasCatalog],
  )

  const filteredProductos = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return productosCatalogo
    return productosCatalogo.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo?.toLowerCase().includes(q) ?? false) ||
        (p.codigoBarras?.toLowerCase().includes(q) ?? false) ||
        (p.variantes?.some(
          (v) =>
            v.nombre.toLowerCase().includes(q) ||
            (v.codigoBarras?.toLowerCase().includes(q) ?? false),
        ) ??
          false),
    )
  }, [productosCatalogo, search])

  const subtotal = lineas.reduce((s, l) => s + l.subtotalCop, 0)
  const descGlobal = parseCopInput(descuentoGlobal)
  const total = Math.max(0, subtotal - descGlobal)
  const showEditorPagos = (credito || modoPago === 'mixto') && !contraEntrega

  useEffect(() => {
    if (total <= 0) return
    setTotalPulse(true)
    const t = window.setTimeout(() => setTotalPulse(false), 500)
    return () => window.clearTimeout(t)
  }, [total])

  const pagos: McPosLineaPago[] = useMemo(() => {
    if (contraEntrega) return []
    if (credito || modoPago === 'mixto') return pagosManuales
    if (total <= 0) return []
    return [{ metodo: modoPago === 'transferencia' ? 'transferencia' : 'efectivo', monto: total }]
  }, [contraEntrega, credito, modoPago, pagosManuales, total])

  const vuelto =
    modoPago === 'efectivo' && !credito
      ? Math.max(0, parseCopInput(recibidoEfectivo) - total)
      : 0

  const restantePago = total - pagos.reduce((s, p) => s + p.monto, 0)

  function resolverPrecio(p: McPosProducto & { id: string }, varianteId?: string) {
    const color =
      p.posColores?.find((x) => x.id === varianteId) ?? p.variantes?.find((x) => x.id === varianteId)
    if (color?.precioCop) return color.precioCop
    return p.precioCop
  }

  function catalogDeProducto(p: McPosProducto & { id: string }) {
    return p.catalogProductoId ? catalogLookup.get(p.catalogProductoId) : undefined
  }

  function productoUsaSkuPicker(p: McPosProducto & { id: string }) {
    return resolvePosProductoSkuView(p, catalogDeProducto(p)).usaMatriz
  }

  function stockDisponibleParaLinea(
    p: McPosProducto & { id: string },
    varianteId?: string,
    tallaId?: string,
  ) {
    if (productoUsaSkuPicker(p) && varianteId && tallaId) {
      const enCarrito = lineas
        .filter((l) => l.productoId === p.id && l.varianteId === varianteId && l.tallaId === tallaId)
        .reduce((s, l) => s + l.cantidad, 0)
      return Math.max(0, posStockDisponibleSku(p.id, varianteId, tallaId, stockMap) - enCarrito)
    }
    const key = lineaKey(p.id, varianteId, tallaId)
    const enCarrito = lineas
      .filter((l) => lineaKey(l.productoId, l.varianteId, l.tallaId, l.comboColorSeleccion) === key)
      .reduce((s, l) => s + l.cantidad, 0)
    if (varianteId) {
      return Math.max(0, (stockMap.get(mcPosStockMapKey(p.id, varianteId)) ?? 0) - enCarrito)
    }
    const totalEnProducto = lineas
      .filter((l) => l.productoId === p.id)
      .reduce((s, l) => s + l.cantidad, 0)
    return Math.max(0, posProductoStockDisponible(p, ventasCatalog) - totalEnProducto)
  }

  function resolverCosto(p: McPosProducto & { id: string }) {
    if (esProductoCombo(p)) {
      return posComboCostoUnitario(p, catalogLookup)
    }
    return p.precioCostoCop != null && p.precioCostoCop >= 0 ? p.precioCostoCop : undefined
  }

  function comboDef(p: McPosProducto & { id: string }) {
    const catalog = p.catalogProductoId ? catalogLookup.get(p.catalogProductoId) : undefined
    return {
      comboComponentes: p.comboComponentes,
      comboPermiteElegirColor: p.comboPermiteElegirColor ?? catalog?.comboPermiteElegirColor,
      comboPermiteElegirTalla: p.comboPermiteElegirTalla ?? catalog?.comboPermiteElegirTalla,
      nombre: p.nombre,
      tipoProducto: 'combo' as const,
    }
  }

  function comboPideOpciones(p: McPosProducto & { id: string }) {
    return comboRequiereSeleccionCliente(comboDef(p), catalogLookup)
  }

  function comboLineaOpcionesCompleta(p: McPosProducto & { id: string }, comboColorSeleccion?: McComboColorSeleccion[]) {
    if (!comboPideOpciones(p)) return true
    return comboColorSeleccionCompleta(comboDef(p), catalogLookup, comboColorSeleccion)
  }

  function agregarLinea(
    productoId: string,
    varianteId?: string,
    varianteNombre?: string,
    comboColorSeleccion?: McComboColorSeleccion[],
    tallaId?: string,
    tallaNombre?: string,
  ) {
    const p = productos.find((x) => x.id === productoId)
    if (!p) return
    if (esProductoCombo(p) && !comboLineaOpcionesCompleta(p, comboColorSeleccion)) {
      setMsg(COMBO_OPCIONES_MSG)
      return
    }
    const key = lineaKey(productoId, varianteId, tallaId, comboColorSeleccion)
    const disponible = stockDisponibleParaLinea(p, varianteId, tallaId)
    if (disponible <= 0) {
      setMsg('Sin stock suficiente.')
      return
    }
    const precio = resolverPrecio(p, varianteId)
    const costo = resolverCosto(p)
    const partesNombre = [p.nombre]
    if (varianteNombre) partesNombre.push(varianteNombre)
    if (tallaNombre) partesNombre.push(tallaNombre)
    const nombre = partesNombre.length > 1 ? partesNombre.join(' — ') : p.nombre
    const comboExpanded =
      esProductoCombo(p) && p.comboComponentes?.length
        ? expandComboComponentes(comboDef(p), 1, catalogLookup, comboColorSeleccion)
        : undefined
    setLineas((prev) => {
      const idx = prev.findIndex(
        (l) => lineaKey(l.productoId, l.varianteId, l.tallaId, l.comboColorSeleccion) === key,
      )
      if (idx >= 0) {
        const next = [...prev]
        const row = next[idx]!
        const qty = row.cantidad + 1
        next[idx] = {
          ...row,
          cantidad: qty,
          subtotalCop: qty * row.precioUnitarioCop,
          ...(comboExpanded
            ? {
                esCombo: true,
                componentesExpandidos: expandComboComponentes(
                  comboDef(p),
                  qty,
                  catalogLookup,
                  comboColorSeleccion,
                ),
                ...(comboColorSeleccion?.length ? { comboColorSeleccion } : {}),
              }
            : {}),
        }
        return next
      }
      return [
        ...prev,
        {
          productoId: p.id,
          varianteId,
          ...(tallaId ? { tallaId } : {}),
          nombre,
          cantidad: 1,
          precioUnitarioCop: precio,
          ...(costo != null ? { costoUnitarioCop: costo } : {}),
          ...(esProductoCombo(p)
            ? {
                esCombo: true,
                componentesExpandidos: comboExpanded,
                ...(comboColorSeleccion?.length ? { comboColorSeleccion } : {}),
              }
            : {}),
          subtotalCop: precio,
        },
      ]
    })
    setMsg(null)
    setVariantPicker(null)
    setSkuPicker(null)
    setComboColorPicker(null)
  }

  function onProductClick(p: McPosProducto & { id: string }) {
    if (posProductoStockDisponible(p, ventasCatalog) <= 0) {
      setMsg(esProductoCombo(p) ? 'Este combo no tiene stock disponible.' : 'Sin stock disponible.')
      return
    }
    if (esProductoCombo(p) && comboPideOpciones(p)) {
      setComboColorPicker(p)
      return
    }
    if (esProductoCombo(p)) {
      agregarLinea(p.id)
      return
    }
    if (productoUsaSkuPicker(p)) {
      setSkuPicker(p)
      return
    }
    if (p.variantes?.length) {
      setVariantPicker(p)
      return
    }
    agregarLinea(p.id)
  }

  function buscarPorBarcode(raw: string) {
    const code = raw.trim()
    if (!code) return
    for (const p of productosConStock) {
      if (p.codigoBarras === code) {
        onProductClick(p)
        setSearch('')
        return
      }
      for (const v of p.variantes ?? []) {
        if (v.codigoBarras === code) {
          agregarLinea(p.id, v.id, v.nombre)
          setSearch('')
          return
        }
      }
    }
    setMsg('Código de barras no encontrado.')
  }

  function quitarLinea(key: LineaKey) {
    setLineas((prev) => {
      const idx = prev.findIndex(
        (l) => lineaKey(l.productoId, l.varianteId, l.tallaId, l.comboColorSeleccion) === key,
      )
      if (idx < 0) return prev
      const row = prev[idx]!
      if (row.cantidad <= 1) {
        return prev.filter(
          (l) => lineaKey(l.productoId, l.varianteId, l.tallaId, l.comboColorSeleccion) !== key,
        )
      }
      const next = [...prev]
      const qty = row.cantidad - 1
      const posProduct = productos.find((p) => p.id === row.productoId)
      const comboExpanded =
        row.esCombo && posProduct?.comboComponentes?.length
          ? expandComboComponentes(
              comboDef(posProduct),
              qty,
              catalogLookup,
              row.comboColorSeleccion,
            )
          : row.componentesExpandidos
      next[idx] = {
        ...row,
        cantidad: qty,
        subtotalCop: qty * row.precioUnitarioCop,
        ...(comboExpanded ? { componentesExpandidos: comboExpanded } : {}),
      }
      return next
    })
  }

  function agregarPago(e: React.FormEvent) {
    e.preventDefault()
    const monto = parseCopInput(montoLinea)
    if (monto <= 0) return
    setPagosManuales((prev) => [...prev, { metodo: metodoLinea, monto }])
    setMontoLinea('')
  }

  function quitarPago(index: number) {
    setPagosManuales((prev) => prev.filter((_, i) => i !== index))
  }

  function activarPagoMixto() {
    setModoPago('mixto')
    setCredito(false)
    setPagosManuales([])
  }

  async function confirmarVenta() {
    if (!tenantId || !sedeId || !vendedorUid || lineas.length === 0 || total <= 0) return
    for (const l of lineas) {
      const posProduct = productos.find((p) => p.id === l.productoId)
      if (!posProduct || !esProductoCombo(posProduct)) continue
      if (!comboLineaOpcionesCompleta(posProduct, l.comboColorSeleccion)) {
        setMsg(COMBO_OPCIONES_MSG)
        return
      }
    }
    if (!contraEntrega && (credito || modoPago === 'mixto')) {
      const sumPagos = pagos.reduce((s, p) => s + p.monto, 0)
      if (sumPagos !== total) {
        setMsg('Los pagos deben sumar el total.')
        return
      }
    }
    setConfirmando(true)
    setMsg(null)
    try {
      const db = getDb()
      const ventaRef = doc(collection(db, mcPosVentasCollection(tenantId)))
      const now = Date.now()
      const batch = writeBatch(db)

      batch.set(ventaRef, {
        sedeId,
        vendedorUid,
        vendedorNombre: profile?.displayName ?? 'Vendedor',
        lineas: lineasParaFirestore(lineas),
        pagos,
        totalCop: total,
        ...(descGlobal > 0 ? { descuentoGlobalCop: descGlobal } : {}),
        ...(motivoDescuento.trim() ? { motivoDescuentoGlobal: motivoDescuento.trim() } : {}),
        ...(credito ? { esCredito: true } : {}),
        ...(contraEntrega ? { esContraEntrega: true, estadoPago: 'pendiente' as const } : {}),
        createdAt: now,
      })

      for (const l of lineas) {
        const posProduct = productos.find((p) => p.id === l.productoId)
        if (!posProduct) continue
        const deltas = buildPosStockDeltasForLine(l, posProduct, catalogLookup, catalogToPos)
        applyPosStockDeltasBatch(batch, db, tenantId, sedeId, deltas, -1, now)
      }

      await batch.commit()

      const posProductoIdsToSync = new Set<string>()
      for (const l of lineas) {
        const posProduct = productos.find((p) => p.id === l.productoId)
        if (!posProduct) continue
        const deltas = buildPosStockDeltasForLine(l, posProduct, catalogLookup, catalogToPos)
        for (const d of deltas) posProductoIdsToSync.add(d.productoId)
      }
      try {
        await Promise.all(
          [...posProductoIdsToSync].map((pid) =>
            syncCatalogStockFromPos(tenantId, pid, sumStockForProduct(stockGlobal, pid)),
          ),
        )
      } catch (syncErr) {
        console.warn('[POS] Venta guardada; falló sync catálogo:', syncErr)
      }

      const payload = ventaToPosPayload(
        {
          id: ventaRef.id,
          sedeNombre: sede?.nombre ?? 'Sede',
          vendedorNombre: profile?.displayName ?? 'Vendedor',
          lineas,
          pagos,
          totalCop: total,
          descuentoGlobalCop: descGlobal,
          motivoDescuentoGlobal: motivoDescuento,
          esCredito: credito,
          esContraEntrega: contraEntrega,
          createdAt: now,
        },
        sede?.pos,
      )
      emitMcPosVenta(payload)
      void mcPosPrinter.handleVenta(payload, { storeName: tenant?.nombreTienda })

      playPosSaleSound()
      burstPosConfetti()
      setCelebrationTotal(total)
      setVentaOk(true)
      setLineas([])
      setDescuentoGlobal('')
      setMotivoDescuento('')
      setRecibidoEfectivo('')
      setPagosManuales([])
      setContraEntrega(false)
      setCredito(false)
      setModoPago('efectivo')
    } catch (err) {
      console.error('[POS] Error al registrar venta:', err)
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : ''
      setMsg(
        code === 'permission-denied'
          ? 'Sin permisos para registrar la venta. Verificá tu sede y turno.'
          : 'No se pudo registrar la venta.',
      )
    } finally {
      setConfirmando(false)
    }
  }

  if (!sedeId) {
    return (
      <div className="mc-pos-page">
        <PosPageHeader icon="ventas" title="Ventas" subtitle="Seleccioná una sede para vender." />
        {sedes.length > 0 ? (
          <label className="mc-pos-field max-w-sm">
            <span>Sede</span>
            <select value={sedePicker} onChange={(e) => setSedePicker(e.target.value)}>
              <option value="">Seleccionar…</option>
              {sedes.filter((s) => s.activa).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="mc-pos-muted">Creá una sede en el panel admin primero.</p>
        )}
      </div>
    )
  }

  return (
    <div className="mc-pos-page mc-pos-ventas">
      <div className="mc-pos-ventas-layout">
        <div className="mc-pos-ventas-main">
          <PosPageHeader
            icon="ventas"
            eyebrow={sede?.nombre}
            title="Cobrar venta"
            subtitle={turno ? 'Turno abierto' : 'Abrí turno en Caja del día'}
          />

          {msg && (
            <p className="mc-pos-status mc-pos-status--error" role="alert">
              {msg}
            </p>
          )}

          {ventaOk && (
            <PosSaleCelebration
              active={ventaOk}
              totalCop={celebrationTotal}
              onDismiss={dismissCelebration}
            />
          )}

          <section className="mc-pos-panel mc-pos-panel--catalog">
          <div className="mc-pos-panel__head">
            <div>
              <p className="mc-pos-panel__eyebrow">Catálogo</p>
              <h2 className="mc-pos-panel__title">Productos</h2>
            </div>
            <span className="mc-pos-panel__badge">
              {productosConStock.length} con stock
              {productosCatalogo.length > productosConStock.length
                ? ` · ${productosCatalogo.length - productosConStock.length} sin stock`
                : ''}
            </span>
          </div>
          <input
            className="mc-pos-search"
            placeholder="Buscar producto o escanear código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                buscarPorBarcode(search)
              }
            }}
          />
          <div className="mc-pos-product-grid">
            {filteredProductos.map((p) => {
              const qty = posProductoStockDisponible(p, ventasCatalog)
              const esCombo = esProductoCombo(p)
              const sinStock = qty <= 0
              return (
                <button
                  key={p.id}
                  type="button"
                  className={clsx('mc-pos-product-card', sinStock && 'mc-pos-product-card--disabled')}
                  disabled={sinStock}
                  onClick={() => onProductClick(p)}
                >
                  <span className="mc-pos-product-card__name">
                    {p.nombre}
                    {esCombo ? (
                      <span className="ml-1.5 inline-block rounded-full bg-[var(--mc-landing-gold-dark)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Combo
                      </span>
                    ) : null}
                  </span>
                  <span className="mc-pos-product-card__price">{formatCop(p.precioCop)}</span>
                  <span className="mc-pos-product-card__stock">{sinStock ? 'Sin stock' : `${qty} uds`}</span>
                </button>
              )
            })}
          </div>
          {filteredProductos.length === 0 && (
            <PosEmptyState
              variant="productos"
              title="Sin productos en esta sede"
              hint="Creá combos en Inventario o sincronizá productos desde el catálogo."
            />
          )}
          {filteredProductos.length > 0 && productosConStock.length === 0 && (
            <p className="mc-pos-muted mt-3 text-sm">
              Hay productos en el catálogo pero ninguno tiene stock. Revisá inventario o los componentes del combo.
            </p>
          )}
          </section>

          {!turno && (
            <p className="mc-pos-muted">
              Necesitás abrir turno en{' '}
              <Link to={cajaPath} className="underline">
                Caja del día
              </Link>
              .
            </p>
          )}
        </div>

        <aside className="mc-pos-cart-panel">
          <div className="mc-pos-cart-panel__inner">
            <div className="mc-pos-cart-panel__head">
              <div>
                <p className="mc-pos-panel__eyebrow">Resumen</p>
                <h2 className="mc-pos-cart-panel__title">Carrito</h2>
              </div>
              {lineas.length > 0 && (
                <span className="mc-pos-panel__badge">{lineas.reduce((s, l) => s + l.cantidad, 0)} uds</span>
              )}
            </div>

            <div className="mc-pos-cart-summary">
              <div className="mc-pos-cart-totals__row">
                <span>Subtotal</span>
                <span>{formatCop(subtotal)}</span>
              </div>
              <label className="mc-pos-field mc-pos-field--compact">
                <span>Descuento global</span>
                <input
                  inputMode="numeric"
                  value={descuentoGlobal}
                  onChange={(e) => setDescuentoGlobal(formatCopInputWhileTyping(e.target.value))}
                />
              </label>
              {descGlobal > 0 && (
                <input
                  className="mc-pos-field-input"
                  placeholder="Motivo del descuento"
                  value={motivoDescuento}
                  onChange={(e) => setMotivoDescuento(e.target.value)}
                />
              )}
              <div className={clsx('mc-pos-cart-totals__total', totalPulse && 'mc-pos-cart-totals__total--pulse')}>
                <span>Total a cobrar</span>
                <span>{formatCop(total)}</span>
              </div>
            </div>

            <div className="mc-pos-cart-checkout">
              <p className="mc-pos-cart-checkout__label">Forma de pago</p>
              <div className="mc-pos-payment-modes">
                {(['efectivo', 'transferencia', 'mixto'] as ModoPagoUi[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={clsx(
                      'mc-pos-payment-pill',
                      modoPago === m && !credito && !contraEntrega && 'mc-pos-payment-pill--active',
                    )}
                    disabled={contraEntrega}
                    onClick={() => {
                      if (m === 'mixto') activarPagoMixto()
                      else {
                        setModoPago(m)
                        setCredito(false)
                        setPagosManuales([])
                      }
                    }}
                  >
                    {m === 'efectivo' ? 'Efectivo' : m === 'transferencia' ? 'Transf.' : 'Mixto'}
                  </button>
                ))}
              </div>

              <label className="mc-pos-check mc-pos-check--card">
                <input
                  type="checkbox"
                  checked={credito}
                  disabled={contraEntrega}
                  onChange={(e) => {
                    setCredito(e.target.checked)
                    if (e.target.checked) {
                      setPagosManuales([])
                      setContraEntrega(false)
                    }
                  }}
                />
                Venta a crédito
              </label>

              <label className="mc-pos-check mc-pos-check--card">
                <input
                  type="checkbox"
                  checked={contraEntrega}
                  onChange={(e) => {
                    setContraEntrega(e.target.checked)
                    if (e.target.checked) {
                      setCredito(false)
                      setPagosManuales([])
                      setModoPago('efectivo')
                    }
                  }}
                />
                Pago contra entrega
              </label>

              {modoPago === 'efectivo' && !credito && !contraEntrega && total > 0 && (
                <div className="mc-pos-vuelto">
                  <button type="button" className="mc-landing-btn-ghost text-sm" onClick={() => setVueltoAbierto((v) => !v)}>
                    Calcular vuelto
                  </button>
                  {vueltoAbierto && (
                    <>
                      <input
                        inputMode="numeric"
                        placeholder="Recibido en efectivo"
                        value={recibidoEfectivo}
                        onChange={(e) => setRecibidoEfectivo(formatCopInputWhileTyping(e.target.value))}
                      />
                      {parseCopInput(recibidoEfectivo) > 0 && (
                        <p className="mc-pos-vuelto__amount">Vuelto: {formatCop(vuelto)}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {showEditorPagos && (
                <div className="mc-pos-manual-pagos">
                  <form className="mc-pos-pago-form" onSubmit={agregarPago}>
                    <select
                      value={metodoLinea}
                      onChange={(e) => setMetodoLinea(e.target.value as McPosMetodoPago)}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="nequi">Nequi</option>
                      <option value="credito">Abono</option>
                    </select>
                    <input
                      inputMode="numeric"
                      placeholder={restantePago > 0 ? formatCop(restantePago) : '$'}
                      value={montoLinea}
                      onChange={(e) => setMontoLinea(formatCopInputWhileTyping(e.target.value))}
                    />
                    <button type="submit" className="mc-landing-btn-ghost text-sm">
                      + Pago
                    </button>
                  </form>
                  <ul className="mc-pos-pago-list">
                    {pagos.map((p, i) => (
                      <li key={i} className="mc-pos-pago-list__item">
                        <span>{METODO_LABEL[p.metodo]}</span>
                        <span>
                          {formatCop(p.monto)}
                          <button type="button" className="mc-pos-qty-btn" onClick={() => quitarPago(i)}>
                            ×
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {restantePago !== 0 && (
                    <p className={clsx('mc-pos-muted text-sm', restantePago < 0 && 'text-red-700')}>
                      {restantePago > 0 ? `Falta ${formatCop(restantePago)}` : `Sobra ${formatCop(-restantePago)}`}
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="mc-landing-btn-primary mc-pos-confirm-btn"
              disabled={confirmando || lineas.length === 0 || total <= 0}
              onClick={confirmarVenta}
            >
              {confirmando
                ? 'Registrando…'
                : contraEntrega
                  ? `Registrar contra entrega ${formatCop(total)}`
                  : `Cobrar ${formatCop(total)}`}
            </button>

            <div className="mc-pos-cart-panel__items">
              <p className="mc-pos-cart-panel__items-label">Productos agregados</p>
              {lineas.length === 0 ? (
                <PosEmptyState
                  variant="ventas"
                  title="Sin productos aún"
                  hint="Seleccioná artículos del catálogo o escaneá un código de barras."
                />
              ) : (
                <ul className="mc-pos-cart-list">
                  {lineas.map((l) => {
                    const key = lineaKey(l.productoId, l.varianteId, l.tallaId, l.comboColorSeleccion)
                    const posProduct = productos.find((p) => p.id === l.productoId)
                    const colorResumen =
                      l.comboColorSeleccion?.length && posProduct
                        ? comboColorSeleccionResumen(
                            comboDef(posProduct),
                            catalogLookup,
                            l.comboColorSeleccion,
                          )
                        : ''
                    return (
                      <li key={key} className="mc-pos-cart-item">
                        <div className="mc-pos-cart-item__main">
                          <p className="mc-pos-cart-item__name">{l.nombre}</p>
                          {colorResumen ? (
                            <p className="mc-pos-cart-item__meta text-violet-800/90">{colorResumen}</p>
                          ) : null}
                          <p className="mc-pos-cart-item__meta">
                            {formatCop(l.precioUnitarioCop)} × {l.cantidad}
                          </p>
                        </div>
                        <div className="mc-pos-cart-item__right">
                          <span className="mc-pos-cart-item__total">{formatCop(l.subtotalCop)}</span>
                          <button type="button" className="mc-pos-qty-btn" onClick={() => quitarLinea(key)}>
                            −
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>

      {variantPicker && (
        <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="mc-pos-modal">
            <h2 className="mc-pos-modal__title">
              {inferPosStockModo(variantPicker) === 'tallas' ? 'Elegir talla' : 'Elegir variante'} —{' '}
              {variantPicker.nombre}
            </h2>
            <div className="mc-pos-variant-pick-grid">
              {variantPicker.variantes?.map((v) => {
                const disp = stockMap.get(mcPosStockMapKey(variantPicker.id, v.id)) ?? 0
                return (
                  <button
                    key={v.id}
                    type="button"
                    className="mc-pos-product-card"
                    disabled={disp <= 0}
                    onClick={() => agregarLinea(variantPicker.id, v.id, v.nombre)}
                  >
                    <span className="flex items-center gap-2">
                      {v.hex ? (
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-neutral-200/70"
                          style={{ backgroundColor: v.hex }}
                          aria-hidden
                        />
                      ) : null}
                      <span>{v.nombre}</span>
                      {v.tipo ? <span className="mc-pos-muted text-xs">({v.tipo})</span> : null}
                    </span>
                    <span className="mc-pos-muted text-sm">{disp} uds</span>
                  </button>
                )
              })}
            </div>
            <button type="button" className="mc-landing-btn-ghost" onClick={() => setVariantPicker(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {skuPicker && (
        <PosRopaSkuPickerModal
          producto={skuPicker}
          catalogProducto={catalogDeProducto(skuPicker)}
          stockMap={stockMap}
          onClose={() => setSkuPicker(null)}
          onConfirm={(colorId, colorNombre, tallaId, tallaNombre) =>
            agregarLinea(skuPicker.id, colorId, colorNombre, undefined, tallaId, tallaNombre)
          }
        />
      )}

      {comboColorPicker && (
        <PosComboColorModal
          producto={comboColorPicker}
          catalogProductos={catalogProductos}
          onClose={() => setComboColorPicker(null)}
          onConfirm={(seleccion) => agregarLinea(comboColorPicker.id, undefined, undefined, seleccion)}
        />
      )}

    </div>
  )
}
