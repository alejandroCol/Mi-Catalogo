import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { usePosClientes } from '@/pos/hooks/usePosClientes'
import { usePosVentasPorCliente } from '@/pos/hooks/usePosVentasPorCliente'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { PosEmptyState } from '@/pos/components/PosEmptyState'
import { clienteIniciales } from '@/pos/lib/posClientes'
import { posFormatFechaCorta, posFormatHora } from '@/pos/lib/posDate'
import { ingresoContableCop, isVentaActiva, isVentaPendienteCobro } from '@/pos/lib/posVentaUtils'
import type { McPosMetodoPago } from '@/types/mc'

const METODO_LABEL: Record<McPosMetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  credito: 'Crédito',
}

const PAGO_CLASS: Record<McPosMetodoPago, string> = {
  efectivo: 'mc-pos-venta-card__pago--efectivo',
  transferencia: 'mc-pos-venta-card__pago--transferencia',
  nequi: 'mc-pos-venta-card__pago--nequi',
  credito: 'mc-pos-venta-card__pago--credito',
}

export function PosClienteComprasPage() {
  const { clienteId } = useParams<{ clienteId: string }>()
  const { profile, tenant } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const { clientes, loading: loadingClientes } = usePosClientes(tenantId)
  const { ventas, loading: loadingVentas } = usePosVentasPorCliente(tenantId, clienteId)
  const { sedes } = usePosSedes(tenantId)

  const cliente = clientes.find((c) => c.id === clienteId)
  const loading = loadingClientes || loadingVentas

  const ventasActivas = useMemo(() => ventas.filter(isVentaActiva), [ventas])
  const totalCobrado = useMemo(
    () => ventasActivas.reduce((s, v) => s + ingresoContableCop(v), 0),
    [ventasActivas],
  )

  if (!loadingClientes && !cliente) {
    return (
      <div className="mc-pos-page">
        <PosPageHeader
          icon="clientes"
          title="Cliente no encontrado"
          subtitle="El registro no existe o fue eliminado."
          action={
            <Link to="/pos/admin/clientes" className="mc-landing-btn-ghost text-sm">
              ← Clientes
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mc-pos-page mc-pos-cliente-compras-page">
      <PosPageHeader
        icon="clientes"
        eyebrow="Historial de compras"
        title={cliente?.nombre ?? '…'}
        subtitle={
          cliente
            ? `CC ${cliente.cedula} · ${cliente.ciudad}${cliente.direccion ? ` · ${cliente.direccion}` : ''}`
            : undefined
        }
        action={
          <Link to="/pos/admin/clientes" className="mc-landing-btn-ghost text-sm">
            ← Clientes
          </Link>
        }
      />

      {cliente && (
        <section className="mc-pos-cliente-compras-hero">
          <span className="mc-pos-cliente-avatar mc-pos-cliente-avatar--xl" aria-hidden>
            {clienteIniciales(cliente.nombre)}
          </span>
          <div className="mc-pos-cliente-compras-hero__stats">
            <article className="mc-pos-clientes-summary__card mc-pos-clientes-summary__card--main">
              <p className="mc-pos-clientes-summary__label">Total comprado</p>
              <p className="mc-pos-clientes-summary__value">{formatCop(totalCobrado)}</p>
            </article>
            <article className="mc-pos-clientes-summary__card">
              <p className="mc-pos-clientes-summary__label">Compras</p>
              <p className="mc-pos-clientes-summary__value">{ventasActivas.length}</p>
            </article>
            <article className="mc-pos-clientes-summary__card">
              <p className="mc-pos-clientes-summary__label">Ticket promedio</p>
              <p className="mc-pos-clientes-summary__value">
                {ventasActivas.length ? formatCop(Math.round(totalCobrado / ventasActivas.length)) : '—'}
              </p>
            </article>
          </div>
        </section>
      )}

      <section className="mc-pos-ventas-list">
        {loading && (
          <div className="mc-pos-ventas-list-loading">
            <p className="mc-pos-muted">Cargando compras…</p>
          </div>
        )}

        {!loading && ventas.length === 0 && (
          <PosEmptyState
            variant="ventas"
            title="Sin compras registradas"
            hint="Este cliente aún no tiene ventas asociadas en el POS."
          />
        )}

        {!loading &&
          ventas.map((v) => {
            const anulada = !isVentaActiva(v)
            const pendiente = isVentaPendienteCobro(v)
            const sede = sedes.find((s) => s.id === v.sedeId)
            const itemsLabel = v.lineas.length === 1 ? '1 producto' : `${v.lineas.length} productos`
            return (
              <article
                key={v.id}
                className={clsx(
                  'mc-pos-venta-card',
                  anulada && 'mc-pos-venta-card--anulada',
                  pendiente && 'mc-pos-venta-card--pendiente',
                )}
              >
                <header className="mc-pos-venta-card__header">
                  <div className="mc-pos-venta-card__meta">
                    <div className="mc-pos-venta-card__meta-row">
                      <span className="mc-pos-venta-card__chip mc-pos-venta-card__chip--time">
                        {posFormatFechaCorta(v.createdAt)} · {posFormatHora(v.createdAt)}
                      </span>
                      <span className="mc-pos-venta-card__chip">{v.vendedorNombre}</span>
                      {sede && (
                        <span className="mc-pos-venta-card__chip mc-pos-venta-card__chip--muted">
                          {sede.codigo}
                        </span>
                      )}
                      <span className="mc-pos-venta-card__chip mc-pos-venta-card__chip--muted">
                        {itemsLabel}
                      </span>
                    </div>
                    <div className="mc-pos-venta-card__pagos">
                      {pendiente ? (
                        <span className="mc-pos-venta-card__pago mc-pos-venta-card__pago--pendiente">
                          Contra entrega · pendiente
                        </span>
                      ) : (
                        v.pagos.map((p, i) => (
                          <span key={i} className={clsx('mc-pos-venta-card__pago', PAGO_CLASS[p.metodo])}>
                            {METODO_LABEL[p.metodo]} · {formatCop(p.monto)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="mc-pos-venta-card__total-wrap">
                    <p className="mc-pos-venta-card__total">{formatCop(v.totalCop)}</p>
                    {anulada && <span className="mc-pos-badge mc-pos-badge--off">Anulada</span>}
                    {pendiente && <span className="mc-pos-badge mc-pos-badge--warn">Pendiente cobro</span>}
                  </div>
                </header>
                <ul className="mc-pos-venta-card__items-list">
                  {v.lineas.map((l, i) => (
                    <li key={i} className="mc-pos-venta-card__item">
                      <span className="mc-pos-venta-card__qty">{l.cantidad}</span>
                      <div className="mc-pos-venta-card__item-main">
                        <p className="mc-pos-venta-card__item-name">{l.nombre}</p>
                      </div>
                      <span className="mc-pos-venta-card__item-total">{formatCop(l.subtotalCop)}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
      </section>
    </div>
  )
}
