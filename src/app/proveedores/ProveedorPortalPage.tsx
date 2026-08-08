import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { EditProductModal } from '@/app/EditProductModal'
import { QuickAddProductModal } from '@/app/QuickAddProductModal'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { ResaleEnableSheet } from '@/components/proveedores/ResaleEnableSheet'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { IconPlus } from '@/icons/McIcons'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import { mcProveedorOrdenesCollection } from '@/lib/mcProveedorCollections'
import {
  canEnableProductForResale,
  productHasSellableVariants,
  publishStoreProductForResale,
  resolveProductStockForResale,
  syncResaleProjectionFromStoreProduct,
  unpublishStoreProductResale,
  type ResaleOfferTerms,
} from '@/lib/mcProveedorResale'
import {
  mcFindProveedorByOwner,
  mcFindProveedorByTenant,
  mcMarkProveedorPoLiquidacion,
  mcUpdateProveedorPoEstado,
  mcUpdateProveedorPoRecaudo,
} from '@/lib/mcProveedorWrites'
import { isProductoBorrador } from '@/lib/productoFormDraft'
import type { McProducto } from '@/types/mc'
import type {
  McProveedor,
  McProveedorPo,
  McProveedorPoEstado,
} from '@/types/mcProveedor'

type PortalTab = 'home' | 'productos' | 'pedidos' | 'liquidaciones'

const PO_FILTERS: { id: McProveedorPoEstado | 'todos'; title: string }[] = [
  { id: 'todos', title: 'Todos' },
  { id: 'nuevo', title: 'Nuevos' },
  { id: 'aceptado', title: 'Aceptados' },
  { id: 'despachado', title: 'En camino' },
  { id: 'entregado', title: 'Cerrados' },
]

export function ProveedorPortalPage() {
  const { firebaseUser, effectiveTenantId, tenant } = useMcAuth()
  const { platformSettings } = usePlatformSettings()
  const { showSaveSuccess } = useSaveSuccess()
  const [proveedor, setProveedor] = useState<(McProveedor & { id: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<PortalTab>('home')
  const [poFilter, setPoFilter] = useState<McProveedorPoEstado | 'todos'>('todos')
  const [storeProducts, setStoreProducts] = useState<(McProducto & { id: string })[]>([])
  const [ordenes, setOrdenes] = useState<(McProveedorPo & { id: string })[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resaleTarget, setResaleTarget] = useState<(McProducto & { id: string }) | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [editProduct, setEditProduct] = useState<(McProducto & { id: string }) | null>(null)
  const [productFilter, setProductFilter] = useState<'todos' | 'reventa' | 'tienda'>('todos')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!firebaseUser) {
        setLoading(false)
        return
      }
      const byOwner = await mcFindProveedorByOwner(firebaseUser.uid)
      const byTenant =
        !byOwner && effectiveTenantId
          ? await mcFindProveedorByTenant(effectiveTenantId)
          : null
      if (!cancelled) {
        setProveedor(byOwner || byTenant)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [firebaseUser, effectiveTenantId])

  useEffect(() => {
    if (!firebaseConfigured || !effectiveTenantId) return
    return onSnapshot(
      query(collection(getDb(), mcProductosCollection(effectiveTenantId)), orderBy('orden', 'desc')),
      (snap) => {
        setStoreProducts(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })),
        )
      },
    )
  }, [effectiveTenantId])

  useEffect(() => {
    if (!firebaseConfigured || !proveedor) return
    return onSnapshot(
      query(
        collection(getDb(), mcProveedorOrdenesCollection(proveedor.id)),
        orderBy('createdAt', 'desc'),
      ),
      (snap) => {
        setOrdenes(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProveedorPo, 'id'>) })),
        )
      },
    )
  }, [proveedor])

  const catalogProducts = useMemo(
    () =>
      storeProducts.filter(
        (p) =>
          !isProductoBorrador(p) &&
          p.origenFulfillment !== 'proveedor' &&
          p.tipoProducto !== 'combo',
      ),
    [storeProducts],
  )

  const filteredProducts = useMemo(() => {
    if (productFilter === 'reventa') return catalogProducts.filter((p) => p.reventa?.enabled)
    if (productFilter === 'tienda') return catalogProducts.filter((p) => !p.reventa?.enabled)
    return catalogProducts
  }, [catalogProducts, productFilter])

  const stats = useMemo(() => {
    const nuevos = ordenes.filter((o) => o.estado === 'nuevo').length
    const porCobrar = ordenes
      .filter(
        (o) =>
          o.liquidacionEstado === 'por_cobrar' &&
          o.estado !== 'rechazado' &&
          o.estado !== 'cancelado' &&
          (!o.pagoContraEntrega || o.recaudoEstado === 'recaudado'),
      )
      .reduce((s, o) => s + o.costoTotalCop, 0)
    const enReventa = catalogProducts.filter((p) => p.reventa?.enabled).length
    const stockBajo = catalogProducts.filter((p) => {
      const s = resolveProductStockForResale(p)
      return s > 0 && s <= 3
    }).length
    return { nuevos, porCobrar, enReventa, stockBajo, totalProductos: catalogProducts.length }
  }, [ordenes, catalogProducts])

  async function saveResale(terms: ResaleOfferTerms) {
    if (!proveedor || !effectiveTenantId || !resaleTarget) return
    setBusyId(resaleTarget.id)
    try {
      await publishStoreProductForResale({
        proveedorId: proveedor.id,
        sourceTenantId: effectiveTenantId,
        product: resaleTarget,
        terms,
      })
      showSaveSuccess({ message: 'Producto disponible para reventa' })
      setResaleTarget(null)
    } finally {
      setBusyId(null)
    }
  }

  async function disableResale(product: McProducto & { id: string }) {
    if (!proveedor || !effectiveTenantId) return
    setBusyId(product.id)
    try {
      await unpublishStoreProductResale({
        proveedorId: proveedor.id,
        sourceTenantId: effectiveTenantId,
        productId: product.id,
      })
      showSaveSuccess({ message: 'Reventa desactivada' })
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="mc-shell mc-config-subpage py-16 text-center text-[14px] text-[var(--cat-muted)]">
        Cargando portal…
      </div>
    )
  }

  if (!proveedor) {
    return <Navigate to="/app/proveedor/onboarding" replace />
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to="/app/proveedores" label="← Proveedores" />
        <h1 className="ios-large-title mt-3">{proveedor.nombre}</h1>
        <p className="ios-subhead mt-2 text-[var(--cat-muted)]">
          {proveedor.ciudadBodega}
          {proveedor.horariosDespacho ? ` · ${proveedor.horariosDespacho}` : ''}
          {' · '}
          {stats.enReventa} en reventa
          {stats.nuevos > 0
            ? ` · ${stats.nuevos} pedido${stats.nuevos === 1 ? '' : 's'} nuevo${stats.nuevos === 1 ? '' : 's'}`
            : ''}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-neutral-200/60 bg-white p-0.5">
        {(
          [
            ['home', 'Inicio'],
            ['productos', 'Productos'],
            ['pedidos', stats.nuevos > 0 ? `Pedidos (${stats.nuevos})` : 'Pedidos'],
            ['liquidaciones', 'Cobros'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={clsx(
              'shrink-0 flex-1 rounded-md px-2.5 py-2 text-center text-[12px] font-medium transition sm:text-[13px]',
              tab === id
                ? 'bg-neutral-100 text-[var(--cat-text)]'
                : 'text-[var(--cat-muted)] hover:text-[var(--cat-text)]',
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'home' ? (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="mc-card">
              <p className="text-[12px] text-[var(--cat-muted)]">Por cobrar</p>
              <p className="mt-1 text-[1.15rem] font-semibold tabular-nums">
                {formatCop(stats.porCobrar)}
              </p>
            </div>
            <div className="mc-card">
              <p className="text-[12px] text-[var(--cat-muted)]">En reventa</p>
              <p className="mt-1 text-[1.15rem] font-semibold tabular-nums">{stats.enReventa}</p>
            </div>
          </div>

          <button
            type="button"
            className="mc-btn-primary w-full"
            onClick={() => {
              setTab('productos')
              setShowQuickAdd(true)
            }}
          >
            Crear producto
          </button>
          <p className="text-center text-[12px] text-[var(--cat-muted)]">
            Se crea en tu inventario (con variantes, tallas e imágenes). Después lo habilitás para
            reventa.
          </p>

          {ordenes.filter((o) => o.estado === 'nuevo').length === 0 ? (
            <div className="mc-card">
              <p className="text-[14px] font-medium">Sin pedidos nuevos</p>
              <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
                Cuando una tienda venda un producto tuyo en reventa, aparece acá para despachar.
              </p>
            </div>
          ) : (
            ordenes
              .filter((o) => o.estado === 'nuevo')
              .slice(0, 5)
              .map((po) => (
                <div key={po.id} className="mc-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-semibold">{po.storeNombre}</p>
                      <p className="text-[12px] text-[var(--cat-muted)]">
                        {po.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(' · ')}
                      </p>
                    </div>
                    <p className="text-[14px] font-semibold tabular-nums">
                      {formatCop(po.costoTotalCop)}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="mc-btn-primary flex-1 py-2 text-[13px]"
                      onClick={() =>
                        void mcUpdateProveedorPoEstado({
                          proveedorId: proveedor.id,
                          poId: po.id,
                          estado: 'aceptado',
                        }).then(() => showSaveSuccess({ message: 'Pedido aceptado' }))
                      }
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      className="mc-btn-secondary flex-1 py-2 text-[13px]"
                      onClick={() =>
                        void mcUpdateProveedorPoEstado({
                          proveedorId: proveedor.id,
                          poId: po.id,
                          estado: 'rechazado',
                        })
                      }
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))
          )}
        </section>
      ) : null}

      {tab === 'productos' ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 overflow-x-auto">
              {(
                [
                  ['todos', 'Todos'],
                  ['reventa', 'En reventa'],
                  ['tienda', 'Solo tienda'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={clsx(
                    'shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium',
                    productFilter === id
                      ? 'border-neutral-300 bg-neutral-100 text-[var(--cat-text)]'
                      : 'border-neutral-200 bg-white text-[var(--cat-muted)]',
                  )}
                  onClick={() => setProductFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mc-btn-primary inline-flex items-center gap-1"
              onClick={() => setShowQuickAdd(true)}
            >
              <IconPlus size={18} />
              Nuevo
            </button>
          </div>

          <p className="text-[12px] leading-relaxed text-[var(--cat-muted)]">
            <span className="font-medium text-[var(--cat-text)]">Lead time</span> = horas que
            necesitás para despachar desde que llega el pedido. Se configura al habilitar reventa.
          </p>

          {filteredProducts.length === 0 ? (
            <div className="mc-card text-center">
              <p className="font-medium">
                {catalogProducts.length === 0
                  ? 'Todavía no tenés productos en tu inventario'
                  : 'No hay productos en este filtro'}
              </p>
              <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
                Creá un producto como en Inventario (variantes, tallas, fotos) y después habilitalo
                para reventa.
              </p>
              {catalogProducts.length === 0 ? (
                <button
                  type="button"
                  className="mc-btn-primary mt-4"
                  onClick={() => setShowQuickAdd(true)}
                >
                  Crear producto
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200/70 overflow-hidden rounded-xl border border-neutral-200/60 bg-white">
              {filteredProducts.map((p) => {
                const stock = resolveProductStockForResale(p)
                const onResale = p.reventa?.enabled === true
                const gate = canEnableProductForResale(p)
                return (
                  <li key={p.id} className="flex gap-3 p-3.5">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold">{p.nombre}</p>
                          <p className="mt-0.5 text-[12px] text-[var(--cat-muted)]">
                            {formatCop(p.precioCop)} · stock {stock}
                            {productHasSellableVariants(p) ? ' · variantes' : ''}
                            {onResale
                              ? ` · costo reventa ${formatCop(p.reventa!.precioCostoCop)} · ${p.reventa!.leadTimeHoras}h`
                              : ''}
                          </p>
                        </div>
                        <span
                          className={clsx(
                            'mc-prov-badge shrink-0',
                            onResale ? 'mc-prov-badge--ok' : 'mc-prov-badge--warn',
                          )}
                        >
                          {onResale ? 'Reventa' : 'Tienda'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[12px] font-medium"
                          onClick={() => setEditProduct(p)}
                        >
                          Editar
                        </button>
                        {onResale ? (
                          <>
                            <button
                              type="button"
                              className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[12px] font-medium"
                              disabled={busyId === p.id}
                              onClick={() => setResaleTarget(p)}
                            >
                              Condiciones
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[12px] font-medium"
                              disabled={busyId === p.id}
                              onClick={() => void disableResale(p)}
                            >
                              Quitar reventa
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[12px] font-medium disabled:opacity-40"
                            disabled={!gate.ok || busyId === p.id}
                            title={!gate.ok ? gate.reason : undefined}
                            onClick={() => setResaleTarget(p)}
                          >
                            Habilitar reventa
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'pedidos' ? (
        <section className="space-y-3">
          <div className="flex gap-1 overflow-x-auto">
            {PO_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={clsx(
                  'shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium',
                  poFilter === f.id
                    ? 'border-neutral-300 bg-neutral-100 text-[var(--cat-text)]'
                    : 'border-neutral-200 bg-white text-[var(--cat-muted)]',
                )}
                onClick={() => setPoFilter(f.id)}
              >
                {f.title}
              </button>
            ))}
          </div>

          {ordenes.filter((o) => {
            if (poFilter === 'todos') return true
            if (poFilter === 'entregado') {
              return o.estado === 'entregado' || o.estado === 'rechazado' || o.estado === 'cancelado'
            }
            return o.estado === poFilter
          }).length === 0 ? (
            <div className="mc-card text-center">
              <p className="text-[14px] font-medium">No hay pedidos acá</p>
              <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
                Los pedidos de tiendas que importaron tus productos aparecen en esta lista.
              </p>
            </div>
          ) : (
            ordenes
              .filter((o) => {
                if (poFilter === 'todos') return true
                if (poFilter === 'entregado') {
                  return (
                    o.estado === 'entregado' || o.estado === 'rechazado' || o.estado === 'cancelado'
                  )
                }
                return o.estado === poFilter
              })
              .map((po) => (
                <div key={po.id} className="mc-card space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-semibold">{po.storeNombre}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--cat-muted)]">
                        {po.clienteNombre || 'Cliente'}
                        {po.envioCiudad ? ` · ${po.envioCiudad}` : ''}
                        {' · '}
                        {po.estado}
                      </p>
                    </div>
                    <p className="text-[14px] font-semibold tabular-nums">
                      {formatCop(po.costoTotalCop)}
                    </p>
                  </div>
                  <p className="text-[13px] text-[var(--cat-text)]">
                    {po.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(', ')}
                  </p>
                  {po.pagoContraEntrega ? (
                    <p className="text-[12px] text-amber-900">
                      Contraentrega · recaudar{' '}
                      {formatCop(po.montoRecaudarCop ?? po.costoTotalCop)}
                      {po.recaudoEstado && po.recaudoEstado !== 'pendiente'
                        ? ` · ${po.recaudoEstado}`
                        : ''}
                    </p>
                  ) : null}

                  {po.estado === 'nuevo' ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        className="mc-btn-primary flex-1 py-2 text-[13px]"
                        onClick={() =>
                          void mcUpdateProveedorPoEstado({
                            proveedorId: proveedor.id,
                            poId: po.id,
                            estado: 'aceptado',
                          })
                        }
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        className="mc-btn-secondary flex-1 py-2 text-[13px]"
                        onClick={() =>
                          void mcUpdateProveedorPoEstado({
                            proveedorId: proveedor.id,
                            poId: po.id,
                            estado: 'rechazado',
                          })
                        }
                      >
                        Rechazar
                      </button>
                    </div>
                  ) : null}

                  {po.estado === 'aceptado' ? (
                    <div className="space-y-2 pt-1">
                      <input
                        className="mc-input"
                        placeholder="Nº de guía"
                        defaultValue={po.trackingNumber || ''}
                        id={`track-${po.id}`}
                      />
                      <button
                        type="button"
                        className="mc-btn-primary w-full py-2 text-[13px]"
                        onClick={() => {
                          const el = document.getElementById(
                            `track-${po.id}`,
                          ) as HTMLInputElement | null
                          void mcUpdateProveedorPoEstado({
                            proveedorId: proveedor.id,
                            poId: po.id,
                            estado: 'despachado',
                            trackingNumber: el?.value,
                          }).then(() => showSaveSuccess({ message: 'Pedido despachado' }))
                        }}
                      >
                        Marcar despachado
                      </button>
                    </div>
                  ) : null}

                  {po.estado === 'despachado' && !po.pagoContraEntrega ? (
                    <button
                      type="button"
                      className="mc-btn-secondary w-full py-2 text-[13px]"
                      onClick={() =>
                        void mcUpdateProveedorPoEstado({
                          proveedorId: proveedor.id,
                          poId: po.id,
                          estado: 'entregado',
                        })
                      }
                    >
                      Marcar entregado
                    </button>
                  ) : null}

                  {po.pagoContraEntrega &&
                  (po.estado === 'despachado' || po.estado === 'aceptado') &&
                  (po.recaudoEstado ?? 'pendiente') === 'pendiente' ? (
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        className="mc-btn-primary w-full py-2 text-[13px]"
                        onClick={() =>
                          void mcUpdateProveedorPoRecaudo({
                            proveedorId: proveedor.id,
                            poId: po.id,
                            recaudoEstado: 'recaudado',
                          }).then(() =>
                            showSaveSuccess({ message: 'Recaudo COD confirmado' }),
                          )
                        }
                      >
                        Cliente pagó al recibir
                      </button>
                      <button
                        type="button"
                        className="mc-btn-secondary w-full py-2 text-[13px]"
                        onClick={() =>
                          void mcUpdateProveedorPoRecaudo({
                            proveedorId: proveedor.id,
                            poId: po.id,
                            recaudoEstado: 'no_entregado',
                          })
                        }
                      >
                        No entregado / no pagó
                      </button>
                    </div>
                  ) : null}

                  {po.trackingNumber ? (
                    <p className="text-[12px] text-[var(--cat-muted)]">Guía: {po.trackingNumber}</p>
                  ) : null}
                </div>
              ))
          )}
        </section>
      ) : null}

      {tab === 'liquidaciones' ? (
        <section className="space-y-3">
          <div className="mc-card">
            <p className="text-[12px] text-[var(--cat-muted)]">Total por cobrar</p>
            <p className="mt-1 text-[1.25rem] font-semibold tabular-nums">
              {formatCop(stats.porCobrar)}
            </p>
            <p className="mt-2 text-[12px] text-[var(--cat-muted)]">
              En contraentrega, liquidá con la tienda solo cuando el recaudo al cliente esté
              confirmado.
            </p>
          </div>
          {ordenes
            .filter((o) => o.estado !== 'rechazado' && o.estado !== 'cancelado')
            .map((po) => (
              <div key={po.id} className="mc-card flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold">{po.storeNombre}</p>
                  <p className="text-[12px] text-[var(--cat-muted)]">
                    {formatCop(po.costoTotalCop)} ·{' '}
                    {po.liquidacionEstado === 'pagado' ? 'Pagado' : 'Por cobrar'}
                    {po.pagoContraEntrega
                      ? ` · COD ${po.recaudoEstado === 'recaudado' ? 'recaudado' : 'pendiente'}`
                      : ''}
                  </p>
                </div>
                {po.liquidacionEstado === 'por_cobrar' ? (
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[12px] font-medium disabled:opacity-40"
                    disabled={
                      po.pagoContraEntrega === true && po.recaudoEstado !== 'recaudado'
                    }
                    title={
                      po.pagoContraEntrega && po.recaudoEstado !== 'recaudado'
                        ? 'Primero confirmá el recaudo COD'
                        : undefined
                    }
                    onClick={() =>
                      void mcMarkProveedorPoLiquidacion({
                        proveedorId: proveedor.id,
                        poId: po.id,
                        estado: 'pagado',
                      }).then(() => showSaveSuccess({ message: 'Marcado como pagado' }))
                    }
                  >
                    Marcar pagado
                  </button>
                ) : (
                  <span className="mc-prov-badge mc-prov-badge--ok">OK</span>
                )}
              </div>
            ))}
        </section>
      ) : null}

      {resaleTarget ? (
        <ResaleEnableSheet
          product={resaleTarget}
          busy={busyId === resaleTarget.id}
          onClose={() => setResaleTarget(null)}
          onSave={saveResale}
        />
      ) : null}

      {showQuickAdd && effectiveTenantId && tenant ? (
        <QuickAddProductModal
          tenantId={effectiveTenantId}
          tenant={tenant}
          platformSettings={platformSettings}
          currentCount={storeProducts.length}
          nextOrden={storeProducts.length}
          onClose={() => {
            setShowQuickAdd(false)
            setTab('productos')
          }}
        />
      ) : null}

      {editProduct && effectiveTenantId ? (
        <EditProductModal
          tenantId={effectiveTenantId}
          product={editProduct}
          onClose={() => {
            const editedId = editProduct.id
            const wasResale = editProduct.reventa?.enabled === true
            const provId = proveedor.id
            const tid = effectiveTenantId
            setEditProduct(null)
            if (wasResale) {
              void getDoc(doc(getDb(), mcProductosCollection(tid), editedId))
                .then((snap) => {
                  if (!snap.exists()) return
                  const fresh = {
                    id: snap.id,
                    ...(snap.data() as Omit<McProducto, 'id'>),
                  }
                  if (!fresh.reventa?.enabled) return
                  return syncResaleProjectionFromStoreProduct({
                    proveedorId: provId,
                    sourceTenantId: tid,
                    product: fresh,
                  })
                })
                .catch(() => undefined)
            }
          }}
        />
      ) : null}
    </div>
  )
}
