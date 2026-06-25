import { useMemo, useState } from 'react'
import { doc, increment, writeBatch } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { getDb } from '@/lib/firebase'
import { mcPosStockCollection, mcPosStockDocId } from '@/lib/mcPosCollections'
import { usePosProductos } from '@/pos/hooks/usePosProductos'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosStock } from '@/pos/hooks/usePosStock'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { PosEditProductoModal } from '@/pos/components/PosEditProductoModal'
import { PosNuevoProductoModal } from '@/pos/components/PosNuevoProductoModal'
import { sumStockForProduct, syncCatalogStockFromPos } from '@/pos/lib/posCatalogSync'

type InventarioTab = 'mi-sede' | 'bodega' | 'otras'

type Props = {
  editable?: boolean
  sedeIdOverride?: string | null
}

export function PosInventarioPage({ editable = true, sedeIdOverride }: Props) {
  const { tenant, profile } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const miSedeId = sedeIdOverride ?? profile?.posSedeId ?? ''
  const bodegaId = tenant?.posSedeBodegaId ?? ''
  const { sedes } = usePosSedes(tenantId)

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
  const { stock } = usePosStock(tenantId, activeSedeId || undefined)
  const { stock: stockGlobal } = usePosStock(tenantId)

  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const stockMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of stock) {
      map.set(s.productoId, (map.get(s.productoId) ?? 0) + s.cantidad)
    }
    return map
  }, [stock])
  const editingProducto = productos.find((p) => p.id === editingId)

  const otrasSedes = sedes.filter((s) => s.id !== miSedeId && s.id !== bodegaId)

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
            <button
              type="button"
              className="mc-landing-btn-primary text-sm"
              disabled={!activeSedeId}
              onClick={() => setNuevoAbierto(true)}
            >
              + Nuevo
            </button>
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

      {msg && (
        <p className="mc-pos-status" role="status">
          {msg}
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
        {!activeSedeId && !loading && (
          <p className="mc-pos-muted">Seleccioná una sede para ver inventario.</p>
        )}
        {filtered.map((p) => {
          const qty = stockMap.get(p.id) ?? 0
          const sede = sedes.find((s) => s.id === p.sedeId)
          return (
            <article key={p.id} className="mc-pos-inventory-row">
              <div className="mc-pos-inventory-row__main">
                <h3 className="mc-pos-inventory-row__name">{p.nombre}</h3>
                <p className="mc-pos-inventory-row__meta">
                  {p.codigo && <span>{p.codigo} · </span>}
                  {p.codigoBarras && <span>{p.codigoBarras} · </span>}
                  {sede?.nombre} · {formatCop(p.precioCop)}
                  {!p.activo && <span className="mc-pos-badge mc-pos-badge--off">Inactivo</span>}
                </p>
              </div>
              <div className="mc-pos-inventory-row__stock">
                <span className="mc-pos-inventory-row__qty">{qty}</span>
                <span className="mc-pos-inventory-row__qty-label">uds</span>
              </div>
              {editable && (
                <div className="mc-pos-inventory-row__actions">
                  <button type="button" className="mc-landing-btn-ghost text-sm" onClick={() => setEditingId(p.id)}>
                    Editar
                  </button>
                  <button type="button" className="mc-pos-qty-btn" onClick={() => ajustarStock(p.id, -1)}>
                    −
                  </button>
                  <button type="button" className="mc-pos-qty-btn" onClick={() => ajustarStock(p.id, 1)}>
                    +
                  </button>
                </div>
              )}
              {p.publicadoEnCatalogo && (
                <span className="mc-pos-badge mc-pos-badge--ok">En catálogo</span>
              )}
            </article>
          )
        })}
        {!loading && activeSedeId && filtered.length === 0 && (
          <p className="mc-pos-muted">Sin productos en esta sede. Agregá uno con el botón Nuevo.</p>
        )}
      </div>

      {nuevoAbierto && tenantId && activeSedeId && (
        <PosNuevoProductoModal
          open
          tenantId={tenantId}
          sedeId={activeSedeId}
          sede={activeSede}
          onClose={() => setNuevoAbierto(false)}
          onCreated={() => setMsg('Producto creado.')}
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
