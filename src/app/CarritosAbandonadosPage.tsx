import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import { formatCop } from '@/lib/formatCop'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { carritoIniciadoDocPath, isCarritoPendiente, isCarritoRecuperado } from '@/lib/carritoIniciado'
import {
  buildRecordatorioWhatsappText,
  buildRecoveryCoupon,
  mergeRecoveryCouponIntoTenant,
  recordatorioWhatsappUrl,
} from '@/lib/carritoRecuperacion'
import { normalizeCuponCodigo } from '@/lib/checkoutPricing'
import { useCarritosIniciados, type CarritoIniciadoRow } from '@/hooks/useCarritosIniciados'

function formatFecha(ms: number) {
  try {
    return new Date(ms).toLocaleString('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function CarritoEstadoBadges({
  row,
  recuperado,
  pendiente,
}: {
  row: CarritoIniciadoRow
  recuperado: boolean
  pendiente: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-[15px] font-medium text-[var(--cat-text)]">
        {row.clienteNombre?.trim() || 'Cliente sin nombre'}
      </p>
      {recuperado ? (
        <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
          Recuperado
        </span>
      ) : pendiente ? (
        <span className="rounded-md border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-950">
          Pendiente
        </span>
      ) : (
        <span className="rounded-md border border-neutral-200/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--cat-muted)]">
          Comprado
        </span>
      )}
    </div>
  )
}

function CarritoRow({
  row,
  onEnviarRecordatorio,
  busyId,
}: {
  row: CarritoIniciadoRow
  onEnviarRecordatorio: (row: CarritoIniciadoRow) => void
  busyId: string | null
}) {
  const recuperado = isCarritoRecuperado(row)
  const pendiente = isCarritoPendiente(row)
  const piezas = row.lineas.reduce((s, l) => s + l.cantidad, 0)
  const tel = row.clienteTelefono?.trim()

  return (
    <li
      className={
        recuperado
          ? 'rounded-md border-2 border-emerald-500/80 bg-emerald-50/60 px-4 py-4'
          : 'rounded-md border border-neutral-200/70 bg-[var(--cat-surface)] px-4 py-4'
      }
    >
      <CarritoEstadoBadges row={row} recuperado={recuperado} pendiente={pendiente} />
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--cat-text)]">
        {row.lineas.map((l) => `${l.titulo} × ${l.cantidad}`).join(' · ')}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--cat-muted)]">
        <span>{piezas} uds.</span>
        <span className="font-medium text-[var(--cat-text)]">{formatCop(row.subtotalCop)}</span>
        <span>Actualizado {formatFecha(row.updatedAt)}</span>
      </div>
      {tel ? (
        <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
          {row.clienteNombre ? `${row.clienteNombre} · ` : ''}
          {tel}
        </p>
      ) : (
        <p className="mt-1 text-[13px] text-amber-900">Sin teléfono — el cliente no llegó a completar contacto.</p>
      )}
      {row.recordatorioEnviadoAt ? (
        <p className="mt-2 text-[12px] text-[var(--cat-muted)]">
          Recordatorio enviado {formatFecha(row.recordatorioEnviadoAt)}
          {row.cuponCodigo ? ` · código ${row.cuponCodigo}` : ''}
        </p>
      ) : null}
      {pendiente && tel ? (
        <button
          type="button"
          className="mc-btn-primary mt-4 inline-flex w-full items-center justify-center py-3 text-[15px] sm:w-auto sm:min-w-[220px]"
          disabled={busyId === row.id}
          onClick={() => onEnviarRecordatorio(row)}
        >
          {busyId === row.id ? 'Preparando…' : 'Enviar recordatorio'}
        </button>
      ) : null}
    </li>
  )
}

export function CarritosAbandonadosPage() {
  const { profile, tenant } = useMcAuth()
  const expertAccess = hasExpertFeatureAccess(tenant)
  const { rows, loading, error } = useCarritosIniciados(profile?.tenantId)
  const [filtro, setFiltro] = useState<'pendientes' | 'todos'>('pendientes')
  const [modalCarrito, setModalCarrito] = useState<CarritoIniciadoRow | null>(null)
  const [descuentoPct, setDescuentoPct] = useState('10')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const listado = useMemo(() => {
    if (filtro === 'todos') return rows
    return rows.filter((r) => r.estado === 'activo')
  }, [rows, filtro])

  const recuperadosCount = useMemo(() => rows.filter((r) => isCarritoRecuperado(r)).length, [rows])

  async function confirmarRecordatorio() {
    if (!modalCarrito || !profile?.tenantId || !tenant?.slug || !tenant) return
    const tel = modalCarrito.clienteTelefono?.trim()
    if (!tel) {
      setMsg('Este carrito no tiene teléfono del cliente.')
      return
    }
    const pct = Math.min(100, Math.max(0, Math.round(Number(descuentoPct) || 0)))
    setBusyId(modalCarrito.id)
    setMsg(null)
    try {
      const now = Date.now()
      let codigo = ''
      if (pct > 0) {
        const cupon = buildRecoveryCoupon(modalCarrito.id, pct)
        codigo = normalizeCuponCodigo(cupon.codigo)
        const cuponesCatalogo = mergeRecoveryCouponIntoTenant(tenant, cupon)
        await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), { cuponesCatalogo })
      }

      await updateDoc(doc(getDb(), carritoIniciadoDocPath(profile.tenantId, modalCarrito.id)), {
        ...(codigo ? { cuponCodigo: codigo } : {}),
        descuentoPorcentaje: pct,
        recordatorioEnviadoAt: now,
        updatedAt: now,
      })

      const texto = buildRecordatorioWhatsappText({
        tenant,
        carrito: modalCarrito,
        carritoId: modalCarrito.id,
        slug: tenant.slug,
        origin: window.location.origin,
        cuponCodigo: codigo || '—',
        descuentoPorcentaje: pct,
      })
      const waUrl = recordatorioWhatsappUrl(tel, texto)
      if (!waUrl) {
        setMsg('No se pudo abrir WhatsApp con ese número.')
        return
      }
      window.open(waUrl, '_blank', 'noopener,noreferrer')
      setModalCarrito(null)
      setMsg('Recordatorio listo. Revisá WhatsApp antes de enviar.')
    } catch {
      setMsg('No se pudo preparar el recordatorio.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mc-shell space-y-6">
      <div>
        <Link
          to="/app/cuenta"
          className="text-[13px] font-medium text-[var(--cat-muted)] transition hover:opacity-70"
        >
          ← Volver a Cuenta
        </Link>
        <h1 className="ios-large-title mt-3 flex flex-wrap items-center gap-2">
          Carritos abandonados
          <ExpertStar />
        </h1>
        <p className="ios-subhead mt-2 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Carritos que iniciaron checkout y no completaron la compra. Enviá un recordatorio por WhatsApp con un cupón
          opcional y un link para retomar el pedido.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : !expertAccess ? (
        <ExpertUpgradeGate />
      ) : (
        <>
          {recuperadosCount > 0 ? (
            <p className="rounded-md border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 text-[14px] text-emerald-950">
              <strong className="font-medium">{recuperadosCount}</strong>{' '}
              {recuperadosCount === 1 ? 'carrito recuperado' : 'carritos recuperados'} tras tu recordatorio.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={
                filtro === 'pendientes'
                  ? 'mc-btn-primary px-4 py-2 text-[14px]'
                  : 'mc-btn-secondary px-4 py-2 text-[14px]'
              }
              onClick={() => setFiltro('pendientes')}
            >
              Pendientes
            </button>
            <button
              type="button"
              className={
                filtro === 'todos'
                  ? 'mc-btn-primary px-4 py-2 text-[14px]'
                  : 'mc-btn-secondary px-4 py-2 text-[14px]'
              }
              onClick={() => setFiltro('todos')}
            >
              Todos (incl. recuperados)
            </button>
          </div>

          {msg ? (
            <p className="rounded-md border border-neutral-200/60 bg-neutral-50/80 px-4 py-3 text-[14px] text-[var(--cat-text)]">
              {msg}
            </p>
          ) : null}

          {loading ? (
            <p className="text-[15px] text-[var(--cat-muted)]">Cargando carritos…</p>
          ) : error ? (
            <p className="text-[15px] text-red-800">{error}</p>
          ) : listado.length === 0 ? (
            <p className="mc-card text-[15px] leading-relaxed text-[var(--cat-muted)]">
              {filtro === 'pendientes'
                ? 'No hay carritos pendientes. Aparecen cuando alguien entra al checkout con productos en el carrito.'
                : 'Todavía no hay carritos registrados.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {listado.map((row) => (
                <CarritoRow
                  key={row.id}
                  row={row}
                  busyId={busyId}
                  onEnviarRecordatorio={(r) => {
                    setDescuentoPct(r.descuentoPorcentaje != null ? String(r.descuentoPorcentaje) : '10')
                    setModalCarrito(r)
                    setMsg(null)
                  }}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {modalCarrito && expertAccess ? (
        <RecordatorioModal
          carrito={modalCarrito}
          descuentoPct={descuentoPct}
          setDescuentoPct={setDescuentoPct}
          busy={busyId === modalCarrito.id}
          onCancel={() => setModalCarrito(null)}
          onConfirm={() => void confirmarRecordatorio()}
        />
      ) : null}
    </div>
  )
}

function ExpertUpgradeGate() {
  return (
    <div className="mc-card space-y-4">
      <p className="ios-subhead leading-relaxed text-[var(--cat-text)]">
        Recuperar carritos abandonados es una función <strong className="font-medium">Expert</strong>.
      </p>
      <Link
        to="/app/plan"
        className="mc-btn-primary inline-flex w-full items-center justify-center py-3 text-[15px] no-underline"
      >
        Ver planes
      </Link>
    </div>
  )
}

function RecordatorioModal({
  carrito,
  descuentoPct,
  setDescuentoPct,
  busy,
  onCancel,
  onConfirm,
}: {
  carrito: CarritoIniciadoRow
  descuentoPct: string
  setDescuentoPct: (v: string) => void
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recordatorio-title"
    >
      <div className="mc-card w-full max-w-md space-y-4 shadow-lg">
        <h2 id="recordatorio-title" className="text-[17px] font-medium text-[var(--cat-text)]">
          Enviar recordatorio
        </h2>
        <p className="text-[14px] leading-relaxed text-[var(--cat-muted)]">
          Se creará un cupón y un link de checkout con el descuento aplicado para{' '}
          <strong className="font-medium text-[var(--cat-text)]">
            {carrito.clienteNombre || carrito.clienteTelefono}
          </strong>
          .
        </p>
        <div>
          <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
            Descuento (% sobre productos)
          </label>
          <input
            className="mc-input mt-1"
            type="number"
            min={0}
            max={100}
            value={descuentoPct}
            onChange={(e) => setDescuentoPct(e.target.value)}
          />
          <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
            Dejá 0 si solo querés enviar el link sin descuento.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="mc-btn-secondary flex-1 py-3 text-[15px]" disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="mc-btn-primary flex-1 py-3 text-[15px]" disabled={busy} onClick={onConfirm}>
            {busy ? 'Preparando…' : 'Abrir WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  )
}
