import { useMemo, useState } from 'react'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  buildCarritoRecuperacionCheckoutUrl,
  carritoIniciadoDocPath,
  isCarritoPendiente,
  isCarritoRecuperado,
} from '@/lib/carritoIniciado'
import {
  buildRecordatorioWhatsappText,
  buildRecoveryCoupon,
  mergeRecoveryCouponIntoTenant,
  recordatorioWhatsappUrl,
} from '@/lib/carritoRecuperacion'
import { normalizeCuponCodigo } from '@/lib/checkoutPricing'
import { callMcSendCarritoRecuperacionEmail } from '@/lib/mcSendCarritoRecuperacionEmail'
import { useCarritosIniciados, type CarritoIniciadoRow } from '@/hooks/useCarritosIniciados'

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

function formatFecha(ms: number) {
  try {
    return new Date(ms).toLocaleString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatSinActualizacionDesde(ms: number): string {
  const now = Date.now()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const fecha = formatFecha(ms)
  if (ms >= startOfToday.getTime()) {
    return `Activo hoy · sin cambios desde ${fecha}`
  }
  const diffDays = Math.floor((now - ms) / (24 * 60 * 60 * 1000))
  if (diffDays === 1) {
    return `Sin actualización desde ayer · ${fecha}`
  }
  return `Sin actualización desde ${fecha}`
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
        {row.clienteNombre?.trim() || row.clienteEmail?.trim() || 'Cliente sin nombre'}
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
  onSelect,
}: {
  row: CarritoIniciadoRow
  onSelect: (row: CarritoIniciadoRow) => void
}) {
  const recuperado = isCarritoRecuperado(row)
  const pendiente = isCarritoPendiente(row)
  const piezas = row.lineas.reduce((s, l) => s + l.cantidad, 0)
  const mail = row.clienteEmail?.trim()
  const tel = row.clienteTelefono?.trim()
  const interactive = pendiente

  function handleActivate() {
    if (interactive) onSelect(row)
  }

  return (
    <li
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? handleActivate : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleActivate()
              }
            }
          : undefined
      }
      className={
        recuperado
          ? 'rounded-xl border-2 border-emerald-500/80 bg-emerald-50/60 px-4 py-4'
          : interactive
            ? 'group cursor-pointer rounded-xl border border-neutral-200/70 bg-[var(--cat-surface)] px-4 py-4 transition duration-200 hover:border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] hover:shadow-sm active:scale-[0.995]'
            : 'rounded-xl border border-neutral-200/70 bg-[var(--cat-surface)] px-4 py-4'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <CarritoEstadoBadges row={row} recuperado={recuperado} pendiente={pendiente} />
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--cat-text)]">
            {row.lineas.map((l) => `${l.titulo} × ${l.cantidad}`).join(' · ')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--cat-muted)]">
            <span>{piezas} uds.</span>
            <span className="font-medium text-[var(--cat-text)]">{formatCop(row.subtotalCop)}</span>
          </div>
          <p
            className={`mt-2 text-[13px] leading-relaxed ${
              pendiente && row.updatedAt < Date.now() - 24 * 60 * 60 * 1000
                ? 'font-medium text-amber-950'
                : 'text-[var(--cat-muted)]'
            }`}
          >
            {formatSinActualizacionDesde(row.updatedAt)}
          </p>
          {mail ? (
            <p className="mt-1 text-[13px] text-[var(--cat-text)]">
              <span className="text-[var(--cat-muted)]">Correo · </span>
              {mail}
            </p>
          ) : (
            <p className="mt-1 text-[13px] text-amber-900">Sin correo — el cliente no lo ingresó en checkout.</p>
          )}
          {tel ? (
            <p className="mt-0.5 text-[12px] text-[var(--cat-muted)]">WhatsApp · {tel}</p>
          ) : null}
          {row.recordatorioEnviadoAt ? (
            <p className="mt-2 text-[12px] text-[var(--cat-muted)]">
              Recordatorio enviado {formatFecha(row.recordatorioEnviadoAt)}
              {row.cuponCodigo ? ` · código ${row.cuponCodigo}` : ''}
            </p>
          ) : null}
        </div>
        {interactive ? (
          <span
            className="mt-0.5 shrink-0 text-[18px] text-[var(--cat-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--cat-text)]"
            aria-hidden
          >
            →
          </span>
        ) : null}
      </div>
      {interactive ? (
        <p className="mt-3 text-[13px] font-medium text-[color-mix(in_srgb,var(--cat-text)_75%,var(--cat-muted)_25%)]">
          Tocá para recuperar este carrito
        </p>
      ) : null}
    </li>
  )
}

type RecuperacionResult = {
  link: string
  codigo: string
  descuentoPorcentaje: number
}

export function CarritosAbandonadosPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { rows, loading, error } = useCarritosIniciados(effectiveTenantId)
  const [filtro, setFiltro] = useState<'pendientes' | 'todos'>('pendientes')
  const [modalCarrito, setModalCarrito] = useState<CarritoIniciadoRow | null>(null)
  const [descuentoPct, setDescuentoPct] = useState('10')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSuccess, setModalSuccess] = useState<string | null>(null)

  const listado = useMemo(() => {
    if (filtro === 'todos') return rows
    return rows.filter((r) => r.estado === 'activo')
  }, [rows, filtro])

  const recuperadosCount = useMemo(() => rows.filter((r) => isCarritoRecuperado(r)).length, [rows])

  async function prepararRecuperacion(carrito: CarritoIniciadoRow): Promise<RecuperacionResult> {
    if (!effectiveTenantId || !tenant?.slug || !tenant) {
      throw new Error('missing_tenant')
    }
    const pct = Math.min(100, Math.max(0, Math.round(Number(descuentoPct) || 0)))
    const now = Date.now()
    let codigo = carrito.cuponCodigo?.trim() ?? ''

    if (pct > 0) {
      const prevRecup = (tenant.cuponesCatalogo ?? []).find(
        (c) => c.esRecuperacion === true && c.carritoIniciadoId === carrito.id,
      )
      if (!codigo) {
        codigo = prevRecup?.codigo?.trim() ? normalizeCuponCodigo(prevRecup.codigo) : ''
      }
      const cupon = buildRecoveryCoupon(carrito.id, pct)
      if (codigo) cupon.codigo = codigo
      codigo = normalizeCuponCodigo(cupon.codigo)
      const cuponesCatalogo = mergeRecoveryCouponIntoTenant(tenant, cupon)
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), { cuponesCatalogo })
    }

    if (!carrito.recordatorioEnviadoAt) {
      await updateDoc(doc(getDb(), carritoIniciadoDocPath(effectiveTenantId, carrito.id)), {
        ...(codigo ? { cuponCodigo: codigo } : {}),
        descuentoPorcentaje: pct,
        recordatorioEnviadoAt: now,
        updatedAt: now,
      })
    }

    const link = buildCarritoRecuperacionCheckoutUrl(
      window.location.origin,
      tenant.slug,
      carrito.id,
      pct > 0 ? codigo : undefined,
    )

    return { link, codigo, descuentoPorcentaje: pct }
  }

  async function enviarEmail() {
    if (!modalCarrito) return
    const mail = modalCarrito.clienteEmail?.trim()
    if (!mail || !emailOk(mail)) {
      setModalError('Este carrito no tiene un correo válido del cliente.')
      return
    }
    setBusy(true)
    setModalError(null)
    setModalSuccess(null)
    setMsg(null)
    setLinkCopiado(false)
    try {
      const pct = Math.min(100, Math.max(0, Math.round(Number(descuentoPct) || 0)))
      const sent = await callMcSendCarritoRecuperacionEmail({
        carritoId: modalCarrito.id,
        descuentoPorcentaje: pct,
      })
      if (!sent.ok) {
        setModalError(sent.message)
        return
      }
      const successText =
        pct > 0
          ? `Correo enviado a ${mail} con ${pct}% de descuento.`
          : `Correo enviado a ${mail} con el link de recuperación.`
      setEmailEnviado(true)
      setModalSuccess(successText)
      setMsg(successText)
      window.setTimeout(() => {
        setModalCarrito(null)
        setModalSuccess(null)
        setEmailEnviado(false)
      }, 2200)
    } catch {
      setModalError('No se pudo enviar el correo de recuperación.')
    } finally {
      setBusy(false)
    }
  }

  async function abrirWhatsapp() {
    if (!modalCarrito || !tenant?.slug || !tenant) return
    const tel = modalCarrito.clienteTelefono?.trim()
    if (!tel) {
      setMsg('Este carrito no tiene WhatsApp. Enviá el descuento por correo o copiá el link.')
      return
    }
    setBusy(true)
    setMsg(null)
    setModalError(null)
    setModalSuccess(null)
    setLinkCopiado(false)
    try {
      const { codigo, descuentoPorcentaje } = await prepararRecuperacion(modalCarrito)
      const texto = buildRecordatorioWhatsappText({
        tenant,
        carrito: modalCarrito,
        carritoId: modalCarrito.id,
        slug: tenant.slug,
        origin: window.location.origin,
        cuponCodigo: codigo || '—',
        descuentoPorcentaje,
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
      setBusy(false)
    }
  }

  async function copiarLink() {
    if (!modalCarrito) return
    setBusy(true)
    setMsg(null)
    try {
      const { link } = await prepararRecuperacion(modalCarrito)
      await navigator.clipboard.writeText(link)
      setLinkCopiado(true)
      setMsg('Link de recuperación copiado al portapapeles.')
    } catch {
      setMsg('No se pudo copiar el link. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  function abrirModal(row: CarritoIniciadoRow) {
    setDescuentoPct(row.descuentoPorcentaje != null ? String(row.descuentoPorcentaje) : '10')
    setModalCarrito(row)
    setMsg(null)
    setModalError(null)
    setModalSuccess(null)
    setLinkCopiado(false)
    setEmailEnviado(false)
  }

  return (
    <div className="mc-shell space-y-6">
      <div>
        <ConfiguracionesBackLink />
        <h1 className="ios-large-title mt-3">Carritos abandonados</h1>
        <p className="ios-subhead mt-2 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Carritos que iniciaron checkout y no completaron la compra. Tocá uno para enviar un descuento por correo,
          WhatsApp o copiar el link de recuperación.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : (
        <>
          {recuperadosCount > 0 ? (
            <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 text-[14px] text-emerald-950">
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
            <p className="rounded-xl border border-neutral-200/60 bg-neutral-50/80 px-4 py-3 text-[14px] text-[var(--cat-text)]">
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
                <CarritoRow key={row.id} row={row} onSelect={abrirModal} />
              ))}
            </ul>
          )}
        </>
      )}

      {modalCarrito && tenant?.slug ? (
        <RecordatorioModal
          carrito={modalCarrito}
          descuentoPct={descuentoPct}
          setDescuentoPct={setDescuentoPct}
          busy={busy}
          linkCopiado={linkCopiado}
          emailEnviado={emailEnviado}
          modalError={modalError}
          modalSuccess={modalSuccess}
          slug={tenant.slug}
          onCancel={() => setModalCarrito(null)}
          onCopiarLink={() => void copiarLink()}
          onWhatsapp={() => void abrirWhatsapp()}
          onEnviarEmail={() => void enviarEmail()}
        />
      ) : null}

    </div>
  )
}

function RecordatorioModal({
  carrito,
  descuentoPct,
  setDescuentoPct,
  busy,
  linkCopiado,
  emailEnviado,
  modalError,
  modalSuccess,
  slug,
  onCancel,
  onCopiarLink,
  onWhatsapp,
  onEnviarEmail,
}: {
  carrito: CarritoIniciadoRow
  descuentoPct: string
  setDescuentoPct: (v: string) => void
  busy: boolean
  linkCopiado: boolean
  emailEnviado: boolean
  modalError: string | null
  modalSuccess: string | null
  slug: string
  onCancel: () => void
  onCopiarLink: () => void
  onWhatsapp: () => void
  onEnviarEmail: () => void
}) {
  const mail = carrito.clienteEmail?.trim()
  const tel = carrito.clienteTelefono?.trim()
  const mailValido = Boolean(mail && emailOk(mail))
  const pctNum = Math.min(100, Math.max(0, Math.round(Number(descuentoPct) || 0)))
  const previewLink = buildCarritoRecuperacionCheckoutUrl(
    typeof window !== 'undefined' ? window.location.origin : '',
    slug,
    carrito.id,
    pctNum > 0 ? 'CUPON' : undefined,
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recordatorio-title"
      onClick={busy ? undefined : onCancel}
    >
      <div className="mc-card w-full max-w-md space-y-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 id="recordatorio-title" className="text-[17px] font-semibold text-[var(--cat-text)]">
            Recuperar carrito
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--cat-muted)]">
            {carrito.clienteNombre?.trim() || 'Cliente sin nombre'}
            {mailValido ? ` · ${mail}` : ' · sin correo'}
          </p>
          <p className="mt-1 text-[13px] text-[var(--cat-muted)]">{formatSinActualizacionDesde(carrito.updatedAt)}</p>
          {carrito.recordatorioEnviadoAt ? (
            <p className="mt-2 rounded-lg border border-neutral-200/70 bg-neutral-50/80 px-3 py-2 text-[12px] leading-relaxed text-[var(--cat-muted)]">
              Último recordatorio · {formatFecha(carrito.recordatorioEnviadoAt)}
              {carrito.cuponCodigo ? ` · código ${carrito.cuponCodigo}` : ''}
            </p>
          ) : null}
        </div>

        {modalError ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-[14px] leading-relaxed text-red-950"
          >
            {modalError}
          </p>
        ) : null}

        {modalSuccess ? (
          <p
            role="status"
            className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-[14px] leading-relaxed text-emerald-950"
          >
            <span className="font-medium">✓ Enviado.</span> {modalSuccess}
          </p>
        ) : null}

        <div className="rounded-xl border border-neutral-200/60 bg-[color-mix(in_srgb,var(--cat-bg)_40%,var(--cat-surface)_60%)] px-4 py-3">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--cat-muted)]">Productos</p>
          <ul className="mt-2 space-y-1 text-[14px] text-[var(--cat-text)]">
            {carrito.lineas.map((l) => (
              <li key={`${l.productId}-${l.varianteId ?? ''}-${l.titulo}`}>
                {l.titulo} × {l.cantidad}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[14px] font-medium text-[var(--cat-text)]">
            Subtotal: {formatCop(carrito.subtotalCop)}
          </p>
        </div>

        <div>
          <label htmlFor="recuperacion-descuento" className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
            Descuento (% sobre productos)
          </label>
          <input
            id="recuperacion-descuento"
            className="mc-input mt-1"
            type="number"
            min={0}
            max={100}
            value={descuentoPct}
            disabled={busy || Boolean(modalSuccess)}
            onChange={(e) => setDescuentoPct(e.target.value)}
          />
          <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
            Dejá 0 si solo querés enviar el link sin descuento.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-neutral-200/70 bg-neutral-50/50 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--cat-muted)]">
            Link de recuperación
          </p>
          <p className="mt-1 break-all text-[12px] leading-relaxed text-[var(--cat-text)]">{previewLink}</p>
        </div>

        <div className="flex flex-col gap-2">
          {mailValido ? (
            <button
              type="button"
              className={
                emailEnviado || modalSuccess
                  ? 'mc-btn-primary w-full py-3 text-[15px] bg-emerald-600 hover:bg-emerald-600'
                  : 'mc-btn-primary w-full py-3 text-[15px]'
              }
              disabled={busy || Boolean(modalSuccess)}
              onClick={onEnviarEmail}
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Enviando correo…
                </span>
              ) : emailEnviado || modalSuccess ? (
                'Correo enviado ✓'
              ) : (
                'Enviar descuento al correo'
              )}
            </button>
          ) : (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2.5 text-center text-[13px] leading-relaxed text-amber-950">
              <p className="font-medium">Sin correo registrado</p>
              <p className="mt-1 opacity-90">
                El cliente no ingresó su correo en checkout. Copiá el link o usá WhatsApp si tenés el número.
              </p>
            </div>
          )}
          <button
            type="button"
            className="mc-btn-secondary w-full py-3 text-[15px]"
            disabled={busy || Boolean(modalSuccess)}
            onClick={onCopiarLink}
          >
            {busy ? 'Preparando…' : linkCopiado ? 'Link copiado ✓' : 'Copiar link de recuperación'}
          </button>
          {tel ? (
            <button
              type="button"
              className="mc-btn-secondary w-full py-3 text-[15px]"
              disabled={busy || Boolean(modalSuccess)}
              onClick={onWhatsapp}
            >
              {busy ? 'Preparando…' : 'Abrir WhatsApp con mensaje'}
            </button>
          ) : null}
          <button
            type="button"
            className="w-full py-2.5 text-[14px] font-medium text-[var(--cat-muted)] transition hover:text-[var(--cat-text)]"
            disabled={busy}
            onClick={onCancel}
          >
            {modalSuccess ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}
