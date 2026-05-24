import { useEffect, useMemo, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  WA_COUNTRY_PREFIXES,
  combineWaDigits,
  DEFAULT_WA_PREFIX,
  splitStoredWaDigits,
} from '@/lib/waPhonePrefixes'

export function CuentaWhatsAppPage() {
  const { profile, tenant } = useMcAuth()
  const [waPrefix, setWaPrefix] = useState(DEFAULT_WA_PREFIX)
  const [waLocal, setWaLocal] = useState('')
  const [intro, setIntro] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  useEffect(() => {
    if (!tenant) return
    const { prefix, local } = splitStoredWaDigits(tenant.whatsappNumero ?? '')
    setWaPrefix(prefix || DEFAULT_WA_PREFIX)
    setWaLocal(local)
    setIntro(tenant.mensajeIntro ?? '')
  }, [tenant])

  const waDigitsPreview = useMemo(
    () => combineWaDigits(waPrefix, waLocal).replace(/\D/g, ''),
    [waPrefix, waLocal],
  )
  const waDialLabel = useMemo(
    () => WA_COUNTRY_PREFIXES.find((p) => p.dial === waPrefix)?.label ?? `+${waPrefix}`,
    [waPrefix],
  )

  async function guardar() {
    if (!profile?.tenantId) return
    setBusy(true)
    setErr(null)
    try {
      const digits = combineWaDigits(waPrefix, waLocal).replace(/\D/g, '')
      if (digits.length < 10 || digits.length > 15) {
        setErr('Revisá el WhatsApp: código de país + número local (sin 0 inicial donde aplique).')
        setBusy(false)
        return
      }
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), {
        whatsappNumero: digits,
        mensajeIntro: intro.trim() || '',
      })
      showSaveSuccess({ message: 'WhatsApp y mensaje de pedidos actualizados.' })
    } catch {
      setErr('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfiguracionesSubpageLayout title="WhatsApp para pedidos">
      <div className="mc-card space-y-5">
        <div>
          <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Número</label>
          <div className="mt-1.5 rounded-md border border-neutral-200/60 bg-neutral-50/40 px-3 py-3 text-[15px]">
            {waDigitsPreview.length >= 10 ? (
              <p className="text-[var(--cat-text)]">
                <span className="font-medium">{waDialLabel}</span>
                <span className="text-[var(--cat-muted)]"> · </span>
                <span>{waLocal.trim()}</span>
              </p>
            ) : (
              <p className="ios-footnote text-[var(--cat-muted)]">Completá código de país y número local.</p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <select
              className="mc-input max-w-[42%] shrink-0 py-3 text-[14px]"
              value={waPrefix}
              disabled={busy}
              onChange={(e) => setWaPrefix(e.target.value)}
              aria-label="Código de país"
            >
              {WA_COUNTRY_PREFIXES.map((p) => (
                <option key={p.dial} value={p.dial}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              className="mc-input min-w-0 flex-1"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="300 123 4567"
              value={waLocal}
              disabled={busy}
              onChange={(e) => setWaLocal(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
            Mensaje intro del pedido
          </label>
          <textarea
            className="mc-input mt-1 min-h-[88px] resize-y"
            value={intro}
            disabled={busy}
            onChange={(e) => setIntro(e.target.value)}
          />
        </div>
        {err && <p className="text-[15px] text-red-800">{err}</p>}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
          Guardar
        </button>
      </div>
    </ConfiguracionesSubpageLayout>
  )
}

