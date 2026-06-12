import { useEffect, useState } from 'react'
import type { McSalesVisit, McSalesVisitOutcome } from '@/types/mc'
import { mcAddSalesVisitUpdate } from '@/lib/mcSalesVisitWrites'
import { salesVisitOutcomeLabel } from '@/lib/salesVisitLabels'

type Props = {
  visit: McSalesVisit | null
  open: boolean
  onClose: () => void
}

const OUTCOMES: { value: McSalesVisitOutcome; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente — nueva visita' },
  { value: 'venta_exitosa', label: 'Venta exitosa' },
  { value: 'rechazo', label: 'Rechazo' },
]

export function ActualizarVisitaModal({ visit, open, onClose }: Props) {
  const [outcome, setOutcome] = useState<McSalesVisitOutcome>('pendiente')
  const [description, setDescription] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !visit) return
    setOutcome(visit.outcome)
    setDescription('')
    setRejectionReason(visit.rejectionReason ?? '')
    setErr(null)
  }, [open, visit])

  if (!open || !visit) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    const desc = description.trim()
    if (!desc) {
      setErr('Escribí qué pasó en esta visita o seguimiento.')
      return
    }
    if (outcome === 'rechazo' && !rejectionReason.trim()) {
      setErr('Indicá el motivo del rechazo.')
      return
    }

    setBusy(true)
    try {
      await mcAddSalesVisitUpdate(visit!.id, {
        description: desc,
        outcome,
        ...(outcome === 'rechazo' ? { rejectionReason: rejectionReason.trim() } : {}),
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar la actualización.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-vendedor-modal__backdrop">
      <div className="mc-vendedor-modal max-w-lg" role="dialog" aria-labelledby="actualizar-visita-title">
        <h2 id="actualizar-visita-title" className="mc-vendedor-modal__title">
          Agregar actualización
        </h2>
        <p className="mc-vendedor-modal__sub">
          <span className="font-semibold text-mc-brand-gray">{visit.storeName}</span>
          {visit.storeDetail ? (
            <span className="mt-1 block text-mc-500">{visit.storeDetail}</span>
          ) : null}
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">
              Estado actual
            </label>
            <select
              className="mc-input mt-2"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as McSalesVisitOutcome)}
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {outcome !== visit.outcome ? (
              <p className="mt-1.5 text-xs text-mc-500">
                Cambiás de «{salesVisitOutcomeLabel(visit.outcome)}» a «{salesVisitOutcomeLabel(outcome)}».
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">
              Descripción
            </label>
            <textarea
              className="mc-input mt-2 min-h-[6rem] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Volví a visitar, quedaron en pensarlo hasta el viernes…"
              maxLength={500}
              required
            />
          </div>

          {outcome === 'rechazo' ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">
                Motivo del rechazo
              </label>
              <textarea
                className="mc-input mt-2 min-h-[4.5rem] resize-y"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej. No tiene presupuesto este mes"
                maxLength={500}
                required
              />
            </div>
          ) : null}

          {err ? <p className="text-sm text-red-800">{err}</p> : null}

          <div className="flex gap-3 pt-2">
            <button type="button" className="mc-landing-btn-secondary flex-1 text-sm" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="mc-landing-btn-primary flex-1 text-sm" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar actualización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
