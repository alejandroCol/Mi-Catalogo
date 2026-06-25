import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import { useMcAuth } from '@/auth/McAuthContext'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosStock } from '@/pos/hooks/usePosStock'
import { usePosVentas } from '@/pos/hooks/usePosVentas'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { PosRangoFechasFilter } from '@/pos/components/PosRangoFechasFilter'
import { usePosRangoFechas } from '@/pos/hooks/usePosRangoFechas'
import { posFormatFechaCorta, posFormatHora } from '@/pos/lib/posDate'
import { ventaToPosPayload } from '@/pos/lib/posEvents'
import { mcPosPrinter } from '@/pos/lib/posPrinterService'
import { getPosLockedSedeId } from '@/pos/hooks/usePosVendorSedeOverride'
import { anularPosVenta } from '@/pos/lib/posAnularVenta'
import { PosUserAvatar } from '@/pos/components/PosUserAvatar'
import { PosEmptyState } from '@/pos/components/PosEmptyState'
import { isVentaActiva } from '@/pos/lib/posVentaUtils'
import type { McPosMetodoPago, McPosVenta } from '@/types/mc'

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

type Props = {
  sedeIdOverride?: string | null
  adminView?: boolean
}

type VentaRow = McPosVenta & { id: string }

export function PosVentasDelDiaPage({ sedeIdOverride, adminView }: Props) {
  const { profile, tenant, firebaseUser } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const vendedorUid = firebaseUser?.uid ?? ''
  const { sedes } = usePosSedes(tenantId)
  const lockedSedeId = getPosLockedSedeId(profile, sedeIdOverride)
  const [sedeFilter, setSedeFilter] = useState(lockedSedeId ?? profile?.posSedeId ?? '')
  const sedeId = lockedSedeId ?? sedeFilter
  const {
    preset,
    setPreset,
    customDesde,
    setCustomDesde,
    customHasta,
    setCustomHasta,
    start,
    end,
    label,
    multiDay,
    hoy,
  } = usePosRangoFechas('hoy')
  const { ventas, loading } = usePosVentas(tenantId, {
    sedeId: sedeId || undefined,
    desdeMs: start,
    hastaMs: end,
    enabled: !adminView || Boolean(sedeId),
  })
  const { stock: stockGlobal } = usePosStock(tenantId)

  useEffect(() => {
    if (lockedSedeId || sedeFilter || !adminView) return
    const initial = sedes.find((s) => s.activa !== false)?.id ?? sedes[0]?.id ?? ''
    if (initial) setSedeFilter(initial)
  }, [sedes, lockedSedeId, sedeFilter, adminView])

  const [anularTarget, setAnularTarget] = useState<VentaRow | null>(null)
  const [anulando, setAnulando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const ventasActivas = useMemo(() => ventas.filter(isVentaActiva), [ventas])
  const ventasActivasCount = ventasActivas.length
  const total = useMemo(() => ventasActivas.reduce((s, v) => s + v.totalCop, 0), [ventasActivas])
  const ticketPromedio = ventasActivasCount ? Math.round(total / ventasActivasCount) : 0
  const sede = sedes.find((s) => s.id === sedeId)

  async function reimprimir(venta: VentaRow) {
    if (!isVentaActiva(venta)) return
    const payload = ventaToPosPayload(
      {
        id: venta.id,
        sedeNombre: sede?.nombre ?? 'Sede',
        vendedorNombre: venta.vendedorNombre,
        lineas: venta.lineas,
        pagos: venta.pagos,
        totalCop: venta.totalCop,
        descuentoGlobalCop: venta.descuentoGlobalCop,
        motivoDescuentoGlobal: venta.motivoDescuentoGlobal,
        esCredito: venta.esCredito,
        createdAt: venta.createdAt,
      },
      sede?.pos,
    )
    await mcPosPrinter.handleVenta(payload, { openDrawer: false, forcePrint: true, storeName: tenant?.nombreTienda })
  }

  async function confirmarAnulacion() {
    const target = anularTarget
    if (!tenantId || !target || !vendedorUid) return
    setAnularTarget(null)
    setAnulando(true)
    setMsg(null)
    try {
      await anularPosVenta(tenantId, target, target.sedeId, vendedorUid, stockGlobal)
      setMsg('Venta anulada. El inventario fue restaurado y ya no suma en caja.')
    } catch {
      setMsg('No se pudo anular la venta.')
    } finally {
      setAnulando(false)
    }
  }

  return (
    <div className="mc-pos-page mc-pos-ventas-list-page">
      <PosPageHeader
        icon="ticket"
        eyebrow="Ventas"
        title="Listado de ventas"
        subtitle={`${label} · ${ventasActivasCount} activas · ${formatCop(total)}`}
      />

      <section className="mc-pos-ventas-list-toolbar">
        <PosRangoFechasFilter
          preset={preset}
          onPresetChange={setPreset}
          customDesde={customDesde}
          customHasta={customHasta}
          onCustomDesdeChange={setCustomDesde}
          onCustomHastaChange={setCustomHasta}
          hoy={hoy}
        />
        {!lockedSedeId && (
          <label className="mc-pos-field mc-pos-field--inline">
            <span>Sede</span>
            <select value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)}>
              {!adminView && <option value="">Todas</option>}
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className="mc-pos-ventas-list-summary" aria-label="Resumen del período">
        <article className="mc-pos-ventas-list-summary__card mc-pos-ventas-list-summary__card--main">
          <p className="mc-pos-ventas-list-summary__label">Total vendido</p>
          <p className="mc-pos-ventas-list-summary__value">{loading ? '…' : formatCop(total)}</p>
        </article>
        <article className="mc-pos-ventas-list-summary__card">
          <p className="mc-pos-ventas-list-summary__label">Transacciones</p>
          <p className="mc-pos-ventas-list-summary__value">{loading ? '…' : ventasActivasCount}</p>
        </article>
        <article className="mc-pos-ventas-list-summary__card">
          <p className="mc-pos-ventas-list-summary__label">Ticket promedio</p>
          <p className="mc-pos-ventas-list-summary__value">{loading ? '…' : formatCop(ticketPromedio)}</p>
        </article>
      </section>

      {msg && <p className="mc-pos-status">{msg}</p>}

      <section className="mc-pos-ventas-list">
        {loading && (
          <div className="mc-pos-ventas-list-loading">
            <p className="mc-pos-muted">Cargando ventas…</p>
          </div>
        )}

        {!loading &&
          ventas.map((v) => {
            const anulada = !isVentaActiva(v)
            const itemsLabel = v.lineas.length === 1 ? '1 producto' : `${v.lineas.length} productos`
            return (
              <article
                key={v.id}
                className={clsx('mc-pos-venta-card', anulada && 'mc-pos-venta-card--anulada')}
              >
                <header className="mc-pos-venta-card__header">
                  <div className="mc-pos-venta-card__meta">
                    <div className="mc-pos-venta-card__meta-row">
                      <PosUserAvatar name={v.vendedorNombre} />
                      <span className="mc-pos-venta-card__chip mc-pos-venta-card__chip--time">
                        {multiDay ? `${posFormatFechaCorta(v.createdAt)} · ` : ''}
                        {posFormatHora(v.createdAt)}
                      </span>
                      <span className="mc-pos-venta-card__chip">{v.vendedorNombre}</span>
                      <span className="mc-pos-venta-card__chip mc-pos-venta-card__chip--muted">{itemsLabel}</span>
                    </div>
                    <div className="mc-pos-venta-card__pagos">
                      {v.pagos.map((p, i) => (
                        <span key={i} className={clsx('mc-pos-venta-card__pago', PAGO_CLASS[p.metodo])}>
                          {METODO_LABEL[p.metodo]} · {formatCop(p.monto)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mc-pos-venta-card__total-wrap">
                    <p className="mc-pos-venta-card__total">{formatCop(v.totalCop)}</p>
                    {anulada && <span className="mc-pos-badge mc-pos-badge--off">Anulada</span>}
                    {v.descuentoGlobalCop != null && v.descuentoGlobalCop > 0 && !anulada && (
                      <p className="mc-pos-venta-card__descuento">
                        Desc. −{formatCop(v.descuentoGlobalCop)}
                      </p>
                    )}
                  </div>
                </header>

                <div className="mc-pos-venta-card__items">
                  <p className="mc-pos-venta-card__items-title">Detalle de la venta</p>
                  <ul className="mc-pos-venta-card__items-list">
                    {v.lineas.map((l, i) => (
                      <li key={i} className="mc-pos-venta-card__item">
                        <span className="mc-pos-venta-card__qty">{l.cantidad}</span>
                        <div className="mc-pos-venta-card__item-main">
                          <p className="mc-pos-venta-card__item-name">{l.nombre}</p>
                          <p className="mc-pos-venta-card__item-unit">
                            {formatCop(l.precioUnitarioCop)} c/u
                            {l.descuentoCop != null && l.descuentoCop > 0
                              ? ` · desc. ${formatCop(l.descuentoCop)}`
                              : ''}
                          </p>
                        </div>
                        <span className="mc-pos-venta-card__item-total">{formatCop(l.subtotalCop)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {!anulada && (
                  <footer className="mc-pos-venta-card__footer">
                    <button
                      type="button"
                      className="mc-pos-venta-card__action"
                      onClick={() => reimprimir(v)}
                    >
                      Reimprimir ticket
                    </button>
                    <button
                      type="button"
                      className="mc-pos-venta-card__action mc-pos-venta-card__action--danger"
                      onClick={() => setAnularTarget(v)}
                    >
                      Anular venta
                    </button>
                  </footer>
                )}
              </article>
            )
          })}

        {!loading && ventas.length === 0 && (
          <PosEmptyState
            variant="ventas"
            title="Sin ventas en este período"
            hint="Probá otro rango de fechas o sede para ver transacciones registradas."
          />
        )}
      </section>

      {anularTarget && (
        <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="mc-pos-modal">
            <h2 className="mc-pos-modal__title">Anular venta</h2>
            <p className="mc-pos-muted">
              La venta de {formatCop(anularTarget.totalCop)} quedará marcada como anulada. No se elimina del registro,
              deja de sumar en caja y el inventario vuelve a stock.
            </p>
            <ul className="mc-pos-venta-card__items-list mc-pos-venta-card__items-list--modal">
              {anularTarget.lineas.map((l, i) => (
                <li key={i} className="mc-pos-venta-card__item">
                  <span className="mc-pos-venta-card__qty">{l.cantidad}</span>
                  <div className="mc-pos-venta-card__item-main">
                    <p className="mc-pos-venta-card__item-name">{l.nombre}</p>
                  </div>
                  <span className="mc-pos-venta-card__item-total">{formatCop(l.subtotalCop)}</span>
                </li>
              ))}
            </ul>
            <div className="mc-pos-modal__actions">
              <button type="button" className="mc-landing-btn-ghost" disabled={anulando} onClick={() => setAnularTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="mc-landing-btn-primary" disabled={anulando} onClick={confirmarAnulacion}>
                {anulando ? 'Anulando…' : 'Confirmar anulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
