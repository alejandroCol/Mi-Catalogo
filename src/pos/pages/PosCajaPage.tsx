import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { getDb } from '@/lib/firebase'
import {
  mcPosCajaDiariaCollection,
  mcPosCajaDiariaDocId,
  mcPosTurnosCollection,
} from '@/lib/mcPosCollections'
import { usePosCajaDiaria } from '@/pos/hooks/usePosCajaDiaria'
import { usePosCajasSedeDia } from '@/pos/hooks/usePosCajasSedeDia'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosTurnoAbierto } from '@/pos/hooks/usePosTurnoAbierto'
import { usePosVentas } from '@/pos/hooks/usePosVentas'
import { usePosVendors } from '@/pos/hooks/usePosVendors'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { PosCajaVendedorCard } from '@/pos/components/PosCajaVendedorCard'
import {
  efectivoEsperadoCaja,
  totalMovimientosCaja,
  totalVentasDelDiaSede,
  ventasDelDiaSede,
  ventasEfectivoDelDia,
  ventasEfectivoDelDiaSede,
} from '@/pos/lib/cajaCalculos'
import { posFechaKeyLocal, posRangoDiaLocal } from '@/pos/lib/posDate'
import { formatCopInputWhileTyping, parseCopInput } from '@/pos/lib/posCopInput'
import { descargarReporteCierreCajaPdf } from '@/pos/lib/reporteCierreCajaPdf'
import { getPosLockedSedeId } from '@/pos/hooks/usePosVendorSedeOverride'

type Props = {
  ventasPath: string
  movimientosPath?: string
  sedeIdOverride?: string | null
  adminView?: boolean
}

function formatDuracion(ms: number) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

function defaultSedeId(
  sedes: { id: string; activa?: boolean }[],
  lockedSedeId: string | null,
  profileSedeId?: string,
) {
  if (lockedSedeId) return lockedSedeId
  if (profileSedeId) return profileSedeId
  return sedes.find((s) => s.activa !== false)?.id ?? sedes[0]?.id ?? ''
}

export function PosCajaPage({ ventasPath, movimientosPath, sedeIdOverride, adminView }: Props) {
  const { profile, tenant, firebaseUser } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const vendedorUid = firebaseUser?.uid ?? ''
  const { sedes } = usePosSedes(tenantId)
  const { vendors } = usePosVendors(tenantId)
  const lockedSedeId = getPosLockedSedeId(profile, sedeIdOverride)
  const [sedeFilter, setSedeFilter] = useState('')
  const sedeId = lockedSedeId ?? sedeFilter
  const fechaKey = posFechaKeyLocal()
  const { start, end } = posRangoDiaLocal(fechaKey)

  useEffect(() => {
    if (lockedSedeId || sedeFilter) return
    const initial = defaultSedeId(sedes, lockedSedeId, profile?.posSedeId)
    if (initial) setSedeFilter(initial)
  }, [sedes, lockedSedeId, sedeFilter, profile?.posSedeId])

  const { caja } = usePosCajaDiaria(tenantId, adminView ? null : sedeId, adminView ? null : vendedorUid, fechaKey)
  const { cajas: cajasSede, loading: loadingCajasSede } = usePosCajasSedeDia(
    adminView ? tenantId : null,
    adminView ? sedeId : null,
    fechaKey,
  )
  const { turno, loading: loadingTurno } = usePosTurnoAbierto(
    tenantId,
    adminView ? null : vendedorUid,
    adminView ? null : sedeId,
  )
  const { ventas } = usePosVentas(tenantId, { sedeId: sedeId || undefined, desdeMs: start, hastaMs: end })

  const [saldoInicialInput, setSaldoInicialInput] = useState('')
  const [efectivoContado, setEfectivoContado] = useState('')
  const [notaCierre, setNotaCierre] = useState('')
  const [cerrarAbierto, setCerrarAbierto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const ventasEfectivo = adminView
    ? ventasEfectivoDelDiaSede(ventas, sedeId, fechaKey)
    : ventasEfectivoDelDia(ventas, sedeId, vendedorUid, fechaKey)
  const totalEgresos = totalMovimientosCaja(caja?.egresos ?? [])
  const totalIngresos = totalMovimientosCaja(caja?.ingresos ?? [])
  const efectivoEsperado = efectivoEsperadoCaja(
    caja?.saldoInicialEfectivo ?? 0,
    ventasEfectivo,
    totalEgresos,
    totalIngresos,
  )

  const ventasSedeActivas = useMemo(
    () => (adminView && sedeId ? ventasDelDiaSede(ventas, sedeId, fechaKey).length : 0),
    [adminView, sedeId, ventas, fechaKey],
  )
  const totalVentasSede = adminView && sedeId ? totalVentasDelDiaSede(ventas, sedeId, fechaKey) : 0
  const cajasAbiertasSede = cajasSede.filter((c) => c.estado !== 'cerrada').length
  const vendorsSede = useMemo(
    () => vendors.filter((v) => v.active !== false && v.posSedeId === sedeId),
    [vendors, sedeId],
  )
  const movimientosSede = useMemo(
    () =>
      cajasSede
        .flatMap((c) => [...(c.ingresos ?? []), ...(c.egresos ?? [])])
        .sort((a, b) => b.createdAt - a.createdAt),
    [cajasSede],
  )

  const sedeNombre = sedes.find((s) => s.id === sedeId)?.nombre ?? 'Sede'
  const duracionTurno = turno ? formatDuracion(Date.now() - turno.inicioAt) : null

  async function abrirCaja() {
    if (!tenantId || !sedeId || !vendedorUid) return
    setSaving(true)
    try {
      const db = getDb()
      const docId = mcPosCajaDiariaDocId(sedeId, vendedorUid, fechaKey)
      await setDoc(doc(db, mcPosCajaDiariaCollection(tenantId), docId), {
        sedeId,
        vendedorUid,
        fechaKey,
        saldoInicialEfectivo: parseCopInput(saldoInicialInput),
        estado: 'abierta',
        egresos: [],
        ingresos: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      setSaldoInicialInput('')
      setMsg('Caja abierta.')
    } catch {
      setMsg('No se pudo abrir la caja.')
    } finally {
      setSaving(false)
    }
  }

  async function iniciarTurno() {
    if (!tenantId || !sedeId || !vendedorUid) return
    setSaving(true)
    try {
      const db = getDb()
      await addDoc(collection(db, mcPosTurnosCollection(tenantId)), {
        sedeId,
        vendedorUid,
        estado: 'abierto',
        inicioAt: Date.now(),
      })
      if (!caja) await abrirCaja()
      setMsg('Turno iniciado. Ya podés vender.')
    } catch {
      setMsg('No se pudo iniciar el turno.')
    } finally {
      setSaving(false)
    }
  }

  async function cerrarTurno() {
    if (!tenantId || !turno) return
    setSaving(true)
    try {
      const db = getDb()
      await updateDoc(doc(db, mcPosTurnosCollection(tenantId), turno.id), {
        estado: 'cerrado',
        finAt: Date.now(),
      })
      setMsg('Turno cerrado.')
    } catch {
      setMsg('No se pudo cerrar el turno.')
    } finally {
      setSaving(false)
    }
  }

  async function cerrarCaja() {
    if (!tenantId || !caja) return
    setSaving(true)
    try {
      const db = getDb()
      const contado = parseCopInput(efectivoContado)
      const diferencia = contado - efectivoEsperado
      await updateDoc(doc(db, mcPosCajaDiariaCollection(tenantId), caja.id), {
        estado: 'cerrada',
        efectivoContado: contado,
        diferencia,
        notaCierre: notaCierre.trim() || null,
        ventasEfectivoDia: ventasEfectivo,
        efectivoEsperado,
        cierreAt: Date.now(),
        updatedAt: Date.now(),
      })
      if (turno) await cerrarTurno()
      setCerrarAbierto(false)
      setMsg('Caja cerrada.')
    } catch {
      setMsg('No se pudo cerrar la caja.')
    } finally {
      setSaving(false)
    }
  }

  function descargarPdfCierre() {
    if (!caja || caja.estado !== 'cerrada') return
    descargarReporteCierreCajaPdf({
      fechaKey,
      sedeNombre,
      vendedorNombre: profile?.displayName ?? 'Vendedor',
      cierreAt: caja.cierreAt ?? Date.now(),
      caja,
      ventas: ventas.filter((v) => v.vendedorUid === vendedorUid),
      ventasEfectivo,
    })
  }

  if (adminView) {
    return (
      <div className="mc-pos-page">
        <PosPageHeader
          icon="caja"
          eyebrow="Supervisión"
          title="Caja del día"
          subtitle={`${fechaKey} · ${sedeNombre} · en vivo`}
          action={
            <Link to={ventasPath} className="mc-landing-btn-primary text-sm no-underline">
              Ver ventas
            </Link>
          }
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

        <section className="mc-pos-kpi-grid">
          <article className="mc-pos-kpi-card">
            <p className="mc-pos-kpi-card__label">Total ventas</p>
            <p className="mc-pos-kpi-card__value">{formatCop(totalVentasSede)}</p>
          </article>
          <article className="mc-pos-kpi-card">
            <p className="mc-pos-kpi-card__label">Ventas efectivo</p>
            <p className="mc-pos-kpi-card__value">{formatCop(ventasEfectivo)}</p>
          </article>
          <article className="mc-pos-kpi-card">
            <p className="mc-pos-kpi-card__label">Transacciones</p>
            <p className="mc-pos-kpi-card__value text-xl">{ventasSedeActivas}</p>
          </article>
          <article className="mc-pos-kpi-card">
            <p className="mc-pos-kpi-card__label">Cajas abiertas</p>
            <p className="mc-pos-kpi-card__value text-xl">
              {loadingCajasSede ? '…' : `${cajasAbiertasSede}/${cajasSede.length}`}
            </p>
          </article>
        </section>

        <h2 className="mc-pos-form-card__title mt-4">Cajeros en esta sede</h2>
        <div className="mc-pos-list">
          {vendorsSede.map((v) => (
            <PosCajaVendedorCard
              key={v.uid}
              tenantId={tenantId!}
              vendedorUid={v.uid}
              vendedorNombre={v.displayName}
              sedeId={sedeId}
              sedeNombre={sedeNombre}
              fechaKey={fechaKey}
              ventas={ventas}
            />
          ))}
          {!loadingCajasSede && vendorsSede.length === 0 && (
            <p className="mc-pos-muted">No hay cajeros asignados a esta sede.</p>
          )}
        </div>

        {movimientosSede.length > 0 && (
          <>
            <h2 className="mc-pos-form-card__title mt-4">Movimientos del día</h2>
            <div className="mc-pos-list">
              {movimientosSede.map((m) => (
                <article key={m.id} className="mc-pos-list-card">
                  <span className={`mc-pos-badge ${m.tipo === 'ingreso' ? 'mc-pos-badge--ok' : 'mc-pos-badge--off'}`}>
                    {m.tipo}
                  </span>
                  <p className="mc-pos-list-card__title">{m.descripcion}</p>
                  <p className="mc-pos-list-card__meta">{formatCop(m.montoCop)}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mc-pos-page">
      <PosPageHeader
        icon="caja"
        eyebrow="Arqueo"
        title="Caja del día"
        subtitle={`${fechaKey}${duracionTurno ? ` · Turno: ${duracionTurno}` : ''}`}
        action={
          turno ? (
            <a href={ventasPath} className="mc-landing-btn-primary text-sm no-underline">
              Ir a ventas
            </a>
          ) : undefined
        }
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

      <section className="mc-pos-kpi-grid">
        <article className="mc-pos-kpi-card">
          <p className="mc-pos-kpi-card__label">Ventas efectivo</p>
          <p className="mc-pos-kpi-card__value">{formatCop(ventasEfectivo)}</p>
        </article>
        <article className="mc-pos-kpi-card">
          <p className="mc-pos-kpi-card__label">Efectivo esperado</p>
          <p className="mc-pos-kpi-card__value">{formatCop(efectivoEsperado)}</p>
        </article>
        <article className="mc-pos-kpi-card">
          <p className="mc-pos-kpi-card__label">Estado caja</p>
          <p className="mc-pos-kpi-card__value text-xl">{caja?.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}</p>
        </article>
      </section>

      {!turno && !loadingTurno && (
        <div className="mc-pos-form-card">
          <h2 className="mc-pos-form-card__title">Iniciar turno</h2>
          {!caja && (
            <label className="mc-pos-field">
              <span>Saldo inicial en efectivo</span>
              <input
                inputMode="numeric"
                value={saldoInicialInput}
                onChange={(e) => setSaldoInicialInput(formatCopInputWhileTyping(e.target.value))}
              />
            </label>
          )}
          <button type="button" className="mc-landing-btn-primary" disabled={saving} onClick={iniciarTurno}>
            Abrir turno y caja
          </button>
        </div>
      )}

      {(turno || (caja && caja.estado !== 'cerrada') || caja?.estado === 'cerrada') && (
        <div className="mc-pos-caja-actions">
          {turno && (
            <button type="button" className="mc-landing-btn-ghost text-sm" disabled={saving} onClick={cerrarTurno}>
              Cerrar turno
            </button>
          )}

          {caja && caja.estado !== 'cerrada' && (
            <>
              {movimientosPath && (
                <Link to={movimientosPath} className="mc-landing-btn-secondary text-sm no-underline">
                  Ingresos y egresos
                </Link>
              )}
              <button type="button" className="mc-landing-btn-primary" onClick={() => setCerrarAbierto(true)}>
                Cerrar caja del día
              </button>
            </>
          )}

          {caja?.estado === 'cerrada' && (
            <button type="button" className="mc-landing-btn-secondary" onClick={descargarPdfCierre}>
              Descargar PDF de cierre
            </button>
          )}
        </div>
      )}

      {cerrarAbierto && (
        <div className="mc-pos-modal-overlay">
          <div className="mc-pos-modal">
            <h2 className="mc-pos-modal__title">Cierre de caja</h2>
            <p className="mc-pos-muted">Efectivo esperado: {formatCop(efectivoEsperado)}</p>
            <label className="mc-pos-field">
              <span>Efectivo contado</span>
              <input
                inputMode="numeric"
                value={efectivoContado}
                onChange={(e) => setEfectivoContado(formatCopInputWhileTyping(e.target.value))}
              />
            </label>
            <label className="mc-pos-field">
              <span>Nota</span>
              <input value={notaCierre} onChange={(e) => setNotaCierre(e.target.value)} />
            </label>
            <div className="mc-pos-modal__actions">
              <button type="button" className="mc-landing-btn-ghost" onClick={() => setCerrarAbierto(false)}>
                Cancelar
              </button>
              <button type="button" className="mc-landing-btn-primary" disabled={saving} onClick={cerrarCaja}>
                Confirmar cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {(caja?.egresos.length || caja?.ingresos.length) ? (
        <div className="mc-pos-list">
          {[...(caja?.ingresos ?? []), ...(caja?.egresos ?? [])]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((m) => (
              <article key={m.id} className="mc-pos-list-card">
                <span className={`mc-pos-badge ${m.tipo === 'ingreso' ? 'mc-pos-badge--ok' : 'mc-pos-badge--off'}`}>
                  {m.tipo}
                </span>
                <p className="mc-pos-list-card__title">{m.descripcion}</p>
                <p className="mc-pos-list-card__meta">{formatCop(m.montoCop)}</p>
              </article>
            ))}
        </div>
      ) : null}
    </div>
  )
}
