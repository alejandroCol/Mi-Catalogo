import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, increment, writeBatch } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ComboProductModal } from '@/app/ComboProductModal'
import { formatCop } from '@/lib/formatCop'
import { esProductoCombo } from '@/lib/comboProducto'
import { getDb } from '@/lib/firebase'
import { mcPosStockCollection, mcPosStockDocId } from '@/lib/mcPosCollections'
import { usePosProductos } from '@/pos/hooks/usePosProductos'
import { useCatalogProductos } from '@/pos/hooks/useCatalogProductos'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosStock } from '@/pos/hooks/usePosStock'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { PosEditProductoModal } from '@/pos/components/PosEditProductoModal'
import { PosInventarioStockBreakdown } from '@/pos/components/PosInventarioStockBreakdown'
import { PosNuevoProductoModal } from '@/pos/components/PosNuevoProductoModal'
import {
  buildPosInventarioBreakdown,
  posInventarioUsaStockSimple,
} from '@/pos/lib/posProductoSkus'
import { sumStockForProduct, syncCatalogStockFromPos } from '@/pos/lib/posCatalogSync'
import {
  buildPosVentasCatalogContext,
  posProductoStockDisponible,
} from '@/pos/lib/posVentasCatalog'
import { resolvePosDefaultSedeId } from '@/pos/lib/posDefaultSede'
import type { McProducto } from '@/types/mc'

type InventarioTab = 'mi-sede' | 'bodega' | 'otras'

type Props = {
  editable?: boolean
  sedeIdOverride?: string | null
}

export function PosInventarioPage({ editable = true, sedeIdOverride }: Props) {
  const { tenant, profile } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const bodegaId = tenant?.posSedeBodegaId ?? ''
  const { sedes, loading: loadingSedes } = usePosSedes(tenantId)
  const miSedeId = useMemo(
    () => resolvePosDefaultSedeId(sedes, profile?.posSedeId, sedeIdOverride),
    [sedes, profile?.posSedeId, sedeIdOverride],
  )

  const [tab, setTab] = useState<InventarioTab>('mi-sede')
  const [otraSedeId, setOtraSedeId] = useState('')

  const activeSedeId = useMemo(() => {
    if (sedeIdOverride) return sedeIdOverride
    if (tab === 'mi-sede') return miSedeId
    if (tab === 'bodega') return bodegaId
    return otraSedeId
  }, [sedeIdOverride, tab, miSedeId, bodegaId, otraSedeId])

  const activeSede = sedes.find((s) => s.id === activeSedeId)

  const { productos, loading } = usePosProductos(tenantId, activeSedeId || undefined)
  const { productos: catalogProductos } = useCatalogProductos(tenantId)
  const { stock } = usePosStock(tenantId, activeSedeId || undefined)
  const { stock: stockGlobal } = usePosStock(tenantId)

  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [comboModalOpen, setComboModalOpen] = useState(false)
  const [editComboProduct, setEditComboProduct] = useState<(McProducto & { id: string }) | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [msgEsError, setMsgEsError] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const inventarioCatalog = useMemo(
    () => buildPosVentasCatalogContext(productos, catalogProductos, stock, activeSedeId),
    [productos, catalogProductos, stock, activeSedeId],
  )

  const otrasSedes = sedes.filter((s) => s.id !== miSedeId && s.id !== bodegaId)
  const editingProducto = productos.find((p) => p.id === editingId)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return productos
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo?.toLowerCase().includes(q) ?? false) ||
        (p.codigoBarras?.toLowerCase().includes(q) ?? false),
    )
  }, [productos, search])

  function abrirNuevoProducto() {
    setMsgEsError(false)
    if (loadingSedes) return

    if (sedes.length === 0) {
      setMsgEsError(true)
      setMsg('Creá al menos una sede en Sedes antes de agregar productos al inventario.')
      return
    }

    if (tab === 'bodega' && !bodegaId) {
      setMsgEsError(true)
      setMsg('Configurá la bodega central en Sedes para inventariar ahí.')
      return
    }

    if (tab === 'otras' && !otraSedeId) {
      setMsgEsError(true)
      setMsg('Elegí una sede en el selector de «Otras sedes» para crear el producto.')
      return
    }

    if (!activeSedeId) {
      setMsgEsError(true)
      setMsg('Seleccioná una sede para crear productos en su inventario.')
      return
    }

    setMsg(null)
    setNuevoAbierto(true)
  }

  function abrirNuevoCombo() {
    setMsgEsError(false)
    if (loadingSedes) return
    if (sedes.length === 0) {
      setMsgEsError(true)
      setMsg('Creá al menos una sede antes de armar combos.')
      return
    }
    setMsg(null)
    setEditComboProduct(null)
    setComboModalOpen(true)
  }

  function abrirEditar(productoId: string) {
    const p = productos.find((x) => x.id === productoId)
    if (!p) return
    if (esProductoCombo(p) && p.catalogProductoId) {
      const catalog = catalogProductos.find((c) => c.id === p.catalogProductoId)
      if (catalog) {
        setEditComboProduct(catalog)
        setComboModalOpen(true)
        return
      }
      setMsgEsError(true)
      setMsg('No se encontró el combo en el catálogo. Editá desde Mi Catálogo → Inventario.')
      return
    }
    if (esProductoCombo(p)) {
      setMsgEsError(true)
      setMsg('Este combo solo se edita desde Mi Catálogo → Inventario.')
      return
    }
    setEditingId(productoId)
  }

  async function ajustarStock(productoId: string, delta: number) {
    if (!tenantId || !activeSedeId || !editable) return
    const db = getDb()
    const stockId = mcPosStockDocId(activeSedeId, productoId)
    const ref = doc(db, mcPosStockCollection(tenantId), stockId)
    const batch = writeBatch(db)
    batch.set(
      ref,
      { sedeId: activeSedeId, productoId, cantidad: increment(delta), updatedAt: Date.now() },
      { merge: true },
    )
    await batch.commit()
    await syncCatalogStockFromPos(
      tenantId,
      productoId,
      sumStockForProduct(stockGlobal, productoId) + delta,
    )
  }

  return (
    <div className="mc-pos-page">
      <PosPageHeader
        icon="inventario"
        eyebrow="Stock"
        title="Inventario POS"
        subtitle={editable ? 'Gestioná productos y cantidades por sede.' : 'Consulta de stock (solo lectura).'}
        action={
          editable ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" className="mc-landing-btn-secondary text-sm" onClick={abrirNuevoCombo}>
                Crear combo
              </button>
              <button type="button" className="mc-landing-btn-primary text-sm" onClick={abrirNuevoProducto}>
                + Nuevo producto
              </button>
            </div>
          ) : undefined
        }
      />

      {!sedeIdOverride && (
        <nav className="mc-pos-reportes-tabs">
          <button
            type="button"
            className={`mc-pos-nav__pill ${tab === 'mi-sede' ? 'mc-pos-nav__pill--active' : ''}`}
            onClick={() => setTab('mi-sede')}
          >
            Mi sede
          </button>
          {bodegaId && (
            <button
              type="button"
              className={`mc-pos-nav__pill ${tab === 'bodega' ? 'mc-pos-nav__pill--active' : ''}`}
              onClick={() => setTab('bodega')}
            >
              Bodega
            </button>
          )}
          <button
            type="button"
            className={`mc-pos-nav__pill ${tab === 'otras' ? 'mc-pos-nav__pill--active' : ''}`}
            onClick={() => setTab('otras')}
          >
            Otras sedes
          </button>
        </nav>
      )}

      {!sedeIdOverride && tab === 'otras' && (
        <label className="mc-pos-field mc-pos-field--inline">
          <span>Sede</span>
          <select value={otraSedeId} onChange={(e) => setOtraSedeId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {otrasSedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codigo} — {s.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      {!sedeIdOverride && tab === 'mi-sede' && activeSede && (
        <p className="mc-pos-muted text-sm">
          Inventario de <strong>{activeSede.nombre}</strong>
          {activeSede.codigo ? ` (${activeSede.codigo})` : ''}
        </p>
      )}

      {!loadingSedes && sedes.length === 0 && editable && !sedeIdOverride && (
        <p className="mc-pos-status mc-pos-status--error" role="status">
          No hay sedes creadas.{' '}
          <Link to="/pos/admin/sedes" className="font-semibold underline">
            Creá una sede
          </Link>{' '}
          y volvé a inventario para cargar productos.
        </p>
      )}

      {msg && (
        <p className={`mc-pos-status ${msgEsError ? 'mc-pos-status--error' : ''}`} role="status">
          {msg}
          {msgEsError && sedes.length === 0 && (
            <>
              {' '}
              <Link to="/pos/admin/sedes" className="font-semibold underline">
                Ir a Sedes
              </Link>
            </>
          )}
        </p>
      )}

      <label className="mc-pos-field">
        <span>Buscar</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre, código o barras…"
        />
      </label>

      <div className="mc-pos-inventory-table">
        {loading && <p className="mc-pos-muted">Cargando inventario…</p>}
        {!activeSedeId && !loading && !loadingSedes && (
          <p className="mc-pos-muted">
            {sedes.length === 0
              ? 'Creá una sede para empezar a inventariar.'
              : tab === 'otras'
                ? 'Elegí una sede en el selector de arriba.'
                : tab === 'bodega'
                  ? 'Configurá la bodega central en Sedes.'
                  : 'Seleccioná una sede para ver inventario.'}
          </p>
        )}
        {filtered.map((p) => {
          const qty = posProductoStockDisponible(p, inventarioCatalog)
          const catalog = p.catalogProductoId
            ? inventarioCatalog.catalogLookup.get(p.catalogProductoId)
            : undefined
          const breakdown = buildPosInventarioBreakdown(p, inventarioCatalog.stockMap, catalog)
          const stockSimple = posInventarioUsaStockSimple(p)
          const sede = sedes.find((s) => s.id === p.sedeId)
          const esCombo = esProductoCombo(p)
          return (
            <article key={p.id} className="mc-pos-inventory-row">
              <div className="mc-pos-inventory-row__main">
                <h3 className="mc-pos-inventory-row__name">
                  {p.nombre}
                  {esCombo ? (
                    <span className="ml-2 inline-block rounded-full bg-[var(--mc-landing-gold-dark)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Combo
                    </span>
                  ) : null}
                </h3>
                <p className="mc-pos-inventory-row__meta">
                  {p.codigo && <span>{p.codigo} · </span>}
                  {p.codigoBarras && <span>{p.codigoBarras} · </span>}
                  {sede?.nombre} · {formatCop(p.precioCop)}
                  {esCombo ? <span> · stock automático</span> : null}
                  {!p.activo && <span className="mc-pos-badge mc-pos-badge--off">Inactivo</span>}
                </p>
              </div>
              <div className="mc-pos-inventory-row__stock">
                <span className="mc-pos-inventory-row__qty">{qty}</span>
                <span className="mc-pos-inventory-row__qty-label">{esCombo ? 'combos' : 'uds'}</span>
              </div>
              {editable && (
                <div className="mc-pos-inventory-row__actions">
                  <button type="button" className="mc-landing-btn-ghost text-sm" onClick={() => abrirEditar(p.id)}>
                    Editar
                  </button>
                  {!esCombo && stockSimple ? (
                    <>
                      <button type="button" className="mc-pos-qty-btn" onClick={() => ajustarStock(p.id, -1)}>
                        −
                      </button>
                      <button type="button" className="mc-pos-qty-btn" onClick={() => ajustarStock(p.id, 1)}>
                        +
                      </button>
                    </>
                  ) : null}
                </div>
              )}
              {p.publicadoEnCatalogo && (
                <span className="mc-pos-badge mc-pos-badge--ok">En catálogo</span>
              )}
              {breakdown ? (
                <div className="mc-pos-inventory-row__breakdown">
                  <PosInventarioStockBreakdown breakdown={breakdown} />
                </div>
              ) : null}
            </article>
          )
        })}
        {!loading && activeSedeId && filtered.length === 0 && (
          <p className="mc-pos-muted">Sin productos en esta sede. Agregá uno con el botón Nuevo.</p>
        )}
      </div>

      {tenantId && (comboModalOpen || editComboProduct) && (
        <ComboProductModal
          tenantId={tenantId}
          product={editComboProduct ?? undefined}
          posInventoryMode
          onClose={() => {
            setComboModalOpen(false)
            setEditComboProduct(null)
          }}
        />
      )}

      {nuevoAbierto && tenantId && activeSedeId && (
        <PosNuevoProductoModal
          open
          tenantId={tenantId}
          sedeId={activeSedeId}
          sede={activeSede}
          onClose={() => setNuevoAbierto(false)}
          onCreated={() => {
            setMsgEsError(false)
            setMsg('Producto creado.')
          }}
        />
      )}

      {editingProducto && activeSedeId && (
        <PosEditProductoModal
          producto={editingProducto}
          sedeId={activeSedeId}
          stockSede={stock}
          stockGlobal={stockGlobal}
          onClose={() => setEditingId(null)}
          onSaved={() => setMsg('Producto actualizado.')}
        />
      )}
    </div>
  )
}
