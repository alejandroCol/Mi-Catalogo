import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  collection,
  doc,
  increment,
  writeBatch,
} from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { getDb } from '@/lib/firebase'
import {
  mcPosDevolucionesCollection,
  mcPosStockCollection,
  mcPosStockDocId,
} from '@/lib/mcPosCollections'
import { usePosProductos } from '@/pos/hooks/usePosProductos'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosStock } from '@/pos/hooks/usePosStock'
import { usePosVentas } from '@/pos/hooks/usePosVentas'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { getPosLockedSedeId } from '@/pos/hooks/usePosVendorSedeOverride'
import { sumStockForProduct, syncCatalogStockFromPos } from '@/pos/lib/posCatalogSync'
import { lineaVentaKeyFromLinea, ventasActivas } from '@/pos/lib/posVentaUtils'
import type { McPosDevolucionLinea } from '@/types/mc'

type Props = {
  sedeIdOverride?: string | null
}

export function PosDevolucionesPage({ sedeIdOverride }: Props) {
  const { profile, tenant, firebaseUser } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const vendedorUid = firebaseUser?.uid ?? ''
  const { sedes } = usePosSedes(tenantId)
  const lockedSedeId = getPosLockedSedeId(profile, sedeIdOverride)
  const [sedeFilter, setSedeFilter] = useState(lockedSedeId ?? profile?.posSedeId ?? '')
  const sedeId = lockedSedeId ?? sedeFilter

  const hace7 = Date.now() - 7 * 86400000
  const { ventas, loading } = usePosVentas(tenantId, {
    sedeId: sedeId || undefined,
    desdeMs: hace7,
    max: 100,
  })
  const ventasElegibles = useMemo(() => ventasActivas(ventas), [ventas])
  const { productos } = usePosProductos(tenantId, sedeId || undefined)
  const { stock } = usePosStock(tenantId, sedeId || undefined)
  const { stock: stockGlobal } = usePosStock(tenantId)

  const [ventaId, setVentaId] = useState('')
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [lineasSeleccionadas, setLineasSeleccionadas] = useState<Set<string>>(new Set())
  const [tipo, setTipo] = useState<'devolucion' | 'cambio'>('devolucion')
  const [cambioProductoId, setCambioProductoId] = useState('')
  const [cambioCantidad, setCambioCantidad] = useState('1')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const venta = ventasElegibles.find((v) => v.id === ventaId)
  const esUnSoloItem = (venta?.lineas.length ?? 0) === 1

  const stockMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of stock) map.set(s.productoId, (map.get(s.productoId) ?? 0) + s.cantidad)
    return map
  }, [stock])

  const ventasFiltradas = ventasElegibles.filter((v) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      v.vendedorNombre.toLowerCase().includes(q) ||
      v.lineas.some((l) => l.nombre.toLowerCase().includes(q))
    )
  })

  const productosConStock = productos.filter((p) => p.activo && (stockMap.get(p.id) ?? 0) > 0)

  function seleccionarVenta(id: string) {
    setVentaId(id)
    const v = ventasElegibles.find((x) => x.id === id)
    if (!v) return

    if (v.lineas.length === 1) {
      const linea = v.lineas[0]!
      const key = lineaVentaKeyFromLinea(linea)
      setCantidades({ [key]: linea.cantidad })
      setLineasSeleccionadas(new Set([key]))
      return
    }

    const init: Record<string, number> = {}
    for (const l of v.lineas) init[lineaVentaKeyFromLinea(l)] = 0
    setCantidades(init)
    setLineasSeleccionadas(new Set())
  }

  function toggleLinea(key: string, max: number) {
    setLineasSeleccionadas((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        setCantidades((c) => ({ ...c, [key]: 0 }))
      } else {
        next.add(key)
        setCantidades((c) => ({ ...c, [key]: max }))
      }
      return next
    })
  }

  async function confirmarDevolucion() {
    if (!tenantId || !venta || !sedeId || !vendedorUid) return
    const lineas: McPosDevolucionLinea[] = []
    for (const l of venta.lineas) {
      const key = lineaVentaKeyFromLinea(l)
      const qty = cantidades[key] ?? 0
      if (qty <= 0) continue
      const proporcion = qty / l.cantidad
      lineas.push({
        productoId: l.productoId,
        varianteId: l.varianteId,
        nombre: l.nombre,
        cantidad: qty,
        montoReembolsoCop: Math.round(l.subtotalCop * proporcion),
      })
    }
    if (lineas.length === 0) {
      setMsg(esUnSoloItem ? 'No hay ítems para devolver.' : 'Seleccioná al menos un ítem.')
      return
    }

    let lineasCambioSalida: { productoId: string; nombre: string; cantidad: number }[] | undefined
    if (tipo === 'cambio') {
      if (!cambioProductoId) {
        setMsg('Elegí el producto de salida para el cambio.')
        return
      }
      const qtySalida = Math.max(1, Math.round(Number(cambioCantidad) || 0))
      const prod = productos.find((p) => p.id === cambioProductoId)
      if (!prod) return
      const disp = stockMap.get(cambioProductoId) ?? 0
      if (disp < qtySalida) {
        setMsg(`Stock insuficiente para el cambio: hay ${disp} uds.`)
        return
      }
      lineasCambioSalida = [{ productoId: prod.id, nombre: prod.nombre, cantidad: qtySalida }]
    }

    setSaving(true)
    try {
      const db = getDb()
      const montoReembolsoCop = lineas.reduce((s, l) => s + l.montoReembolsoCop, 0)
      const batch = writeBatch(db)
      const devRef = doc(collection(db, mcPosDevolucionesCollection(tenantId)))
      const now = Date.now()

      batch.set(devRef, {
        ventaId: venta.id,
        sedeId,
        vendedorUid,
        tipo,
        lineas,
        montoReembolsoCop,
        ...(lineasCambioSalida ? { lineasCambioSalida } : {}),
        createdAt: now,
      })

      for (const l of lineas) {
        const stockRef = doc(
          db,
          mcPosStockCollection(tenantId),
          mcPosStockDocId(sedeId, l.productoId, l.varianteId),
        )
        batch.set(stockRef, { cantidad: increment(l.cantidad), updatedAt: now }, { merge: true })
      }

      if (lineasCambioSalida) {
        for (const l of lineasCambioSalida) {
          const stockRef = doc(db, mcPosStockCollection(tenantId), mcPosStockDocId(sedeId, l.productoId))
          batch.set(stockRef, { cantidad: increment(-l.cantidad), updatedAt: now }, { merge: true })
        }
      }

      await batch.commit()

      const restauradoPorProducto = new Map<string, number>()
      for (const l of lineas) {
        restauradoPorProducto.set(l.productoId, (restauradoPorProducto.get(l.productoId) ?? 0) + l.cantidad)
      }
      if (lineasCambioSalida) {
        for (const l of lineasCambioSalida) {
          restauradoPorProducto.set(l.productoId, (restauradoPorProducto.get(l.productoId) ?? 0) - l.cantidad)
        }
      }
      await Promise.all(
        [...restauradoPorProducto.entries()].map(([pid, delta]) =>
          syncCatalogStockFromPos(tenantId, pid, sumStockForProduct(stockGlobal, pid) + delta, stockGlobal),
        ),
      )

      setVentaId('')
      setCantidades({})
      setLineasSeleccionadas(new Set())
      setCambioProductoId('')
      setCambioCantidad('1')
      setMsg(tipo === 'cambio' ? 'Cambio registrado y stock actualizado.' : 'Devolución registrada y stock actualizado.')
    } catch {
      setMsg('No se pudo registrar la devolución.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mc-pos-page">
      <PosPageHeader
        icon="devoluciones"
        eyebrow="Postventa"
        title="Devoluciones"
        subtitle="Busca una venta reciente y registra devolución o cambio."
      />

      {!lockedSedeId && (
        <label className="mc-pos-field mc-pos-field--inline">
          <span>Sede</span>
          <select value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)}>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codigo} — {s.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      {msg && (
        <p className="mc-pos-status" role="status">
          {msg}
        </p>
      )}

      <input
        className="mc-pos-search"
        placeholder="Buscar venta…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mc-pos-devoluciones-layout">
        <div className="mc-pos-list">
          {loading && <p className="mc-pos-muted">Cargando ventas…</p>}
          {ventasFiltradas.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`mc-pos-list-card mc-pos-list-card--selectable ${ventaId === v.id ? 'mc-pos-list-card--selected' : ''}`}
              onClick={() => seleccionarVenta(v.id)}
            >
              <p className="mc-pos-list-card__title">{formatCop(v.totalCop)}</p>
              <p className="mc-pos-list-card__meta">
                {new Date(v.createdAt).toLocaleString('es-CO')} · {v.vendedorNombre} · {v.lineas.length}{' '}
                {v.lineas.length === 1 ? 'ítem' : 'ítems'}
              </p>
            </button>
          ))}
          {!loading && ventasFiltradas.length === 0 && (
            <p className="mc-pos-muted">Sin ventas activas en los últimos 7 días.</p>
          )}
        </div>

        {venta && (
          <div className="mc-pos-form-card">
            <h2 className="mc-pos-form-card__title">
              {esUnSoloItem ? 'Confirmar devolución' : 'Seleccioná qué devolver'}
            </h2>
            <label className="mc-pos-field">
              <span>Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as 'devolucion' | 'cambio')}>
                <option value="devolucion">Devolución</option>
                <option value="cambio">Cambio</option>
              </select>
            </label>

            {esUnSoloItem ? (
              <div className="mc-pos-devolucion-single">
                <p className="mc-pos-devolucion-single__name">{venta.lineas[0]!.nombre}</p>
                <p className="mc-pos-devolucion-single__meta">
                  {venta.lineas[0]!.cantidad} ud{venta.lineas[0]!.cantidad === 1 ? '' : 's'} ·{' '}
                  {formatCop(venta.lineas[0]!.subtotalCop)}
                </p>
              </div>
            ) : (
              <div className="mc-pos-devolucion-pick-grid">
                {venta.lineas.map((l) => {
                  const key = lineaVentaKeyFromLinea(l)
                  const selected = lineasSeleccionadas.has(key)
                  return (
                    <div key={key} className={clsx('mc-pos-devolucion-pick', selected && 'mc-pos-devolucion-pick--on')}>
                      <button type="button" className="mc-pos-devolucion-pick__toggle" onClick={() => toggleLinea(key, l.cantidad)}>
                        <span className="mc-pos-devolucion-pick__name">{l.nombre}</span>
                        <span className="mc-pos-devolucion-pick__meta">
                          Vendidos: {l.cantidad} · {formatCop(l.subtotalCop)}
                        </span>
                      </button>
                      {selected && l.cantidad > 1 && (
                        <label className="mc-pos-field mc-pos-devolucion-pick__qty">
                          <span>Cantidad a devolver</span>
                          <input
                            type="number"
                            min={1}
                            max={l.cantidad}
                            value={cantidades[key] ?? l.cantidad}
                            onChange={(e) =>
                              setCantidades((prev) => ({
                                ...prev,
                                [key]: Math.min(l.cantidad, Math.max(1, Number(e.target.value) || 0)),
                              }))
                            }
                          />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {tipo === 'cambio' && (
              <div className="mc-pos-form-grid">
                <label className="mc-pos-field mc-pos-field--full">
                  <span>Producto de salida (nuevo)</span>
                  <select value={cambioProductoId} onChange={(e) => setCambioProductoId(e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {productosConStock.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({stockMap.get(p.id)} uds)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mc-pos-field">
                  <span>Cantidad salida</span>
                  <input
                    type="number"
                    min={1}
                    value={cambioCantidad}
                    onChange={(e) => setCambioCantidad(e.target.value)}
                  />
                </label>
              </div>
            )}

            <button
              type="button"
              className="mc-landing-btn-primary"
              disabled={saving}
              onClick={confirmarDevolucion}
            >
              Confirmar {tipo}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
