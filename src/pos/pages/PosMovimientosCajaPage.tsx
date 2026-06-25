import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { getDb } from '@/lib/firebase'
import { mcPosCajaDiariaCollection } from '@/lib/mcPosCollections'
import { usePosCajaDiaria } from '@/pos/hooks/usePosCajaDiaria'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { posFechaKeyLocal } from '@/pos/lib/posDate'
import { efectivoEsperadoCaja, totalMovimientosCaja, ventasEfectivoDelDia } from '@/pos/lib/cajaCalculos'
import { usePosVentas } from '@/pos/hooks/usePosVentas'
import { posRangoDiaLocal } from '@/pos/lib/posDate'
import { formatCopInputWhileTyping, parseCopInput } from '@/pos/lib/posCopInput'
import { getPosLockedSedeId } from '@/pos/hooks/usePosVendorSedeOverride'
import { PosComprobanteUploadField } from '@/pos/components/PosComprobanteUploadField'
import { uploadPosComprobante } from '@/pos/lib/posComprobanteUpload'
import type { McPosCajaMovimiento } from '@/types/mc'

type Props = {
  sedeIdOverride?: string | null
}

export function PosMovimientosCajaPage({ sedeIdOverride }: Props) {
  const { profile, tenant, firebaseUser } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const vendedorUid = firebaseUser?.uid ?? ''
  const { sedes } = usePosSedes(tenantId)
  const lockedSedeId = getPosLockedSedeId(profile, sedeIdOverride)
  const [sedeFilter, setSedeFilter] = useState(lockedSedeId ?? profile?.posSedeId ?? '')
  const sedeId = lockedSedeId ?? sedeFilter
  const fechaKey = posFechaKeyLocal()
  const { caja } = usePosCajaDiaria(tenantId, sedeId, vendedorUid, fechaKey)
  const { start, end } = posRangoDiaLocal(fechaKey)
  const { ventas } = usePosVentas(tenantId, { sedeId, desdeMs: start, hastaMs: end })
  const ventasEfectivo = ventasEfectivoDelDia(ventas, sedeId, vendedorUid, fechaKey)

  const [modalTipo, setModalTipo] = useState<'ingreso' | 'egreso' | null>(null)
  const [movMonto, setMovMonto] = useState('')
  const [movDesc, setMovDesc] = useState('')
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const esperado = caja
    ? efectivoEsperadoCaja(
        caja.saldoInicialEfectivo,
        ventasEfectivo,
        totalMovimientosCaja(caja.egresos),
        totalMovimientosCaja(caja.ingresos),
      )
    : 0

  function abrirModal(tipo: 'ingreso' | 'egreso') {
    setModalTipo(tipo)
    setMovMonto('')
    setMovDesc('')
    setComprobanteFile(null)
    setMsg(null)
  }

  function resetModal() {
    setModalTipo(null)
    setMovMonto('')
    setMovDesc('')
    setComprobanteFile(null)
  }

  function cerrarModal() {
    if (saving) return
    resetModal()
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !caja || !sedeId || !modalTipo) return
    const monto = parseCopInput(movMonto)
    if (monto <= 0 || !movDesc.trim()) return
    const tipo = modalTipo
    const movId = crypto.randomUUID()
    setSaving(true)
    try {
      let comprobanteUrl: string | undefined
      if (comprobanteFile) {
        comprobanteUrl = await uploadPosComprobante(tenantId, movId, comprobanteFile)
      }
      const db = getDb()
      const mov: McPosCajaMovimiento = {
        id: movId,
        tipo,
        montoCop: monto,
        descripcion: movDesc.trim(),
        createdAt: Date.now(),
        ...(comprobanteUrl ? { comprobanteUrl } : {}),
      }
      const field = tipo === 'ingreso' ? 'ingresos' : 'egresos'
      const current = tipo === 'ingreso' ? caja.ingresos : caja.egresos
      await updateDoc(doc(db, mcPosCajaDiariaCollection(tenantId), caja.id), {
        [field]: [...current, mov],
        updatedAt: Date.now(),
      })
      resetModal()
      setMsg(tipo === 'ingreso' ? 'Ingreso registrado.' : 'Egreso registrado.')
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mc-pos-page">
      <PosPageHeader
        icon="movimientos"
        eyebrow="Caja"
        title="Ingresos y egresos"
        subtitle={caja ? `Efectivo esperado: ${formatCop(esperado)}` : 'Abrí la caja del día primero'}
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

      {msg && <p className="mc-pos-status">{msg}</p>}

      {caja && caja.estado !== 'cerrada' && (
        <div className="mc-pos-caja-actions">
          <button type="button" className="mc-landing-btn-secondary text-sm" onClick={() => abrirModal('egreso')}>
            + Añadir egreso
          </button>
          <button type="button" className="mc-landing-btn-primary text-sm" onClick={() => abrirModal('ingreso')}>
            + Añadir ingreso
          </button>
        </div>
      )}

      {modalTipo && (
        <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="mc-pos-modal">
            <h2 className="mc-pos-modal__title">
              {modalTipo === 'egreso' ? 'Añadir egreso' : 'Añadir ingreso'}
            </h2>
            <form className="mc-pos-form-grid" onSubmit={registrar}>
              <label className="mc-pos-field mc-pos-field--full">
                <span>Monto</span>
                <input
                  inputMode="numeric"
                  value={movMonto}
                  onChange={(e) => setMovMonto(formatCopInputWhileTyping(e.target.value))}
                  placeholder="$ 0"
                  autoFocus
                  required
                />
              </label>
              <label className="mc-pos-field mc-pos-field--full">
                <span>Descripción</span>
                <input value={movDesc} onChange={(e) => setMovDesc(e.target.value)} required />
              </label>
              <div className="mc-pos-field--full">
                <PosComprobanteUploadField
                  file={comprobanteFile}
                  disabled={saving}
                  onFileChange={setComprobanteFile}
                />
              </div>
              <div className="mc-pos-modal__actions mc-pos-field--full">
                <button type="button" className="mc-landing-btn-ghost" disabled={saving} onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="mc-landing-btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {m.comprobanteUrl && (
                <a
                  href={m.comprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mc-pos-list-card__link"
                >
                  Ver comprobante
                </a>
              )}
            </article>
          ))}
      </div>
    </div>
  )
}
