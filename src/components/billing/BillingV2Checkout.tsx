import { useCallback, useEffect, useId, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import type { McBillingPeriod } from '@/lib/billingSubscriptionClient'
import { formatCop } from '@/lib/formatCop'
import { getFirebaseFunctions } from '@/lib/firebase'
import { initCardFields, loadOnePayCapturesScript, tokenizeCard } from '@/lib/onepayCaptures'
import { splitStoredWaDigits } from '@/lib/waPhonePrefixes'

type PayMethod = 'card' | 'nequi'

type Props = {
  period: McBillingPeriod
  amountCop: number
  requiresPaymentMethod?: boolean
  discountPreview?: {
    finalPriceCop: number
    basePriceCop: number
    freeMonths?: number
  } | null
  discountCode?: string
  expertName: string
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export function BillingV2Checkout({
  period,
  amountCop,
  requiresPaymentMethod = amountCop > 0,
  discountPreview,
  discountCode,
  expertName,
  onSuccess,
  onError,
}: Props) {
  const { profile, tenant, firebaseUser } = useMcAuth()
  const fieldSuffix = useId().replace(/:/g, '')
  const [step, setStep] = useState<'profile' | 'payment'>('profile')
  const [method, setMethod] = useState<PayMethod>('card')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [captureRouteId, setCaptureRouteId] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [documentType, setDocumentType] = useState('CC')
  const [documentNumber, setDocumentNumber] = useState('')

  const [nequiBankId, setNequiBankId] = useState('')
  const [nequiPhone, setNequiPhone] = useState('')

  useEffect(() => {
    if (!tenant || !profile) return
    const dn = profile.displayName?.trim() ?? ''
    const parts = dn.split(/\s+/)
    setFirstName(tenant.billingPayerFirstName ?? parts[0] ?? '')
    setLastName(tenant.billingPayerLastName ?? (parts.length > 1 ? parts.slice(1).join(' ') : ''))
    setEmail(firebaseUser?.email ?? profile.email ?? '')
    const wa = splitStoredWaDigits(tenant.whatsappNumero ?? '')
    setPhone(tenant.billingPayerPhone ?? wa.local ?? '')
    setDocumentType(tenant.billingPayerDocumentType ?? 'CC')
    setDocumentNumber(tenant.billingPayerDocumentNumber ?? '')
  }, [tenant, profile, firebaseUser])

  const loadSdk = useCallback(async () => {
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingGetSdkContext')
      const ctx = await fn({})
      const d = ctx.data as { publicKey?: string; captureRouteId?: string }
      if (!d.publicKey || !d.captureRouteId) {
        onError('Pasarela incompleta (falta clave pública).')
        return
      }
      setCaptureRouteId(d.captureRouteId)
      await loadOnePayCapturesScript()
      const ok = initCardFields({
        suffix: fieldSuffix,
        routeId: d.captureRouteId,
        publicKey: d.publicKey,
      })
      setSdkReady(ok)
    } catch (e) {
      onError((e as { message?: string }).message ?? 'No se pudo cargar el formulario de pago.')
    }
  }, [fieldSuffix, onError])

  useEffect(() => {
    if (step === 'payment' && method === 'card') void loadSdk()
  }, [step, method, loadSdk])

  useEffect(() => {
    if (step !== 'payment' || method !== 'nequi') return
    void (async () => {
      try {
        const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingListNequiBanks')
        const res = await fn({})
        const banks = (res.data as { banks?: { id: string; name: string }[] }).banks ?? []
        if (banks[0]?.id) setNequiBankId(banks[0].id)
      } catch {
        setMsg('No se pudo cargar Nequi.')
      }
    })()
  }, [step, method])

  async function saveProfile() {
    setBusy(true)
    setMsg(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingEnsureCustomer')
      await fn({ firstName, lastName, email, phone, documentType, documentNumber })
      setStep('payment')
    } catch (e) {
      const err = e as { message?: string; details?: string }
      setMsg(err.message ?? err.details ?? 'No se pudo guardar el perfil.')
    } finally {
      setBusy(false)
    }
  }

  async function completeActivation(params: {
    method: PayMethod
    cardId?: string
    accountId?: string
  }) {
    const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingCompleteActivation')
    const res = await fn({
      period,
      method: params.method,
      cardId: params.method === 'card' ? params.cardId : undefined,
      accountId: params.method === 'nequi' ? params.accountId : undefined,
      discountCode: discountCode || undefined,
    })
    const d = res.data as { pending?: boolean; message?: string }
    if (d.pending) {
      onSuccess(d.message ?? 'Pago en proceso. Recargá en unos segundos cuando se confirme.')
    } else {
      onSuccess(`¡Listo! Ya sos ${expertName}.`)
    }
  }

  async function activateWithCard() {
    if (!captureRouteId) {
      setMsg('Esperá a que cargue el formulario de tarjeta.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const token = await tokenizeCard(captureRouteId)
      const fnAdd = httpsCallable(getFirebaseFunctions(), 'mcBillingAddCard')
      const addRes = await fnAdd({ cardToken: token })
      const cardId = (addRes.data as { cardId?: string }).cardId
      if (!cardId) throw new Error('Tarjeta no registrada')
      await completeActivation({ method: 'card', cardId })
    } catch (e) {
      setMsg((e as { message?: string }).message ?? 'No se pudo activar con tarjeta.')
    } finally {
      setBusy(false)
    }
  }

  async function activateWithNequi() {
    setBusy(true)
    setMsg(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingAddNequi')
      const res = await fn({ phone: nequiPhone, bankId: nequiBankId })
      const d = res.data as { accountId?: string; awaitingApproval?: boolean }
      if (!d.accountId) throw new Error('No se vinculó Nequi')
      if (d.awaitingApproval) {
        setMsg('Aprobá la vinculación en tu app Nequi y volvé a intentar activar.')
        return
      }
      await completeActivation({ method: 'nequi', accountId: d.accountId })
    } catch (e) {
      setMsg((e as { message?: string }).message ?? 'No se pudo activar con Nequi.')
    } finally {
      setBusy(false)
    }
  }

  async function activateFree() {
    setBusy(true)
    setMsg(null)
    try {
      await completeActivation({ method: 'card' })
    } catch (e) {
      setMsg((e as { message?: string }).message ?? 'No se pudo activar el plan.')
    } finally {
      setBusy(false)
    }
  }

  if (amountCop === 0 && !requiresPaymentMethod) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <p className="ios-subhead">Tu código activa el plan sin cobro hoy.</p>
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void activateFree()}>
          {busy ? 'Activando…' : `Activar ${expertName} gratis`}
        </button>
        {msg && <p className="text-[13px]">{msg}</p>}
      </div>
    )
  }

  const renewalCop = discountPreview?.basePriceCop ?? amountCop
  const promoLabel =
    amountCop === 0 && requiresPaymentMethod
      ? discountPreview?.freeMonths
        ? `${discountPreview.freeMonths} mes${discountPreview.freeMonths > 1 ? 'es' : ''} gratis`
        : 'Primer período gratis'
      : null

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 px-4 py-3">
        <p className="text-[12px] font-medium text-[var(--cat-muted)]">Pago seguro · débito automático</p>
        {promoLabel ? (
          <>
            <p className="mt-0.5 text-[17px] font-medium tracking-tight text-emerald-800">
              {formatCop(0)} hoy · {promoLabel}
            </p>
            <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
              Después {formatCop(renewalCop)} / {period === 'yearly' ? 'año' : 'mes'} con tu método de pago
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-[17px] font-medium tracking-tight">
            {formatCop(amountCop)}{' '}
            <span className="text-[13px] text-[var(--cat-muted)]">/ {period === 'yearly' ? 'año' : 'mes'}</span>
          </p>
        )}
      </div>

      {step === 'profile' ? (
        <div className="space-y-4">
          <p className="ios-headline">Datos de facturación</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="mc-input" placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className="mc-input" placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <input
              className="mc-input sm:col-span-2"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="mc-input"
              inputMode="tel"
              placeholder="Celular"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <select className="mc-input" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="CC">Cédula</option>
              <option value="CE">CE</option>
              <option value="PA">Pasaporte</option>
              <option value="NIT">NIT</option>
            </select>
            <input
              className="mc-input sm:col-span-2"
              placeholder="Número de documento"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          </div>
          <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void saveProfile()}>
            {busy ? 'Guardando…' : 'Continuar al pago'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              className={`flex-1 rounded-lg border px-3 py-2 text-[14px] font-medium ${
                method === 'card' ? 'border-[var(--cat-text)] bg-neutral-50' : 'border-neutral-200'
              }`}
              onClick={() => setMethod('card')}
            >
              Tarjeta
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg border px-3 py-2 text-[14px] font-medium ${
                method === 'nequi' ? 'border-[var(--cat-text)] bg-neutral-50' : 'border-neutral-200'
              }`}
              onClick={() => setMethod('nequi')}
            >
              Nequi
            </button>
          </div>

          {method === 'card' ? (
            <div className="space-y-2">
              <div id={`op-cc-holder-${fieldSuffix}`} className="op-sdk-field" />
              <div id={`op-cc-number-${fieldSuffix}`} className="op-sdk-field" />
              <div className="grid grid-cols-2 gap-2">
                <div id={`op-cc-exp-${fieldSuffix}`} className="op-sdk-field" />
                <div id={`op-cc-cvv-${fieldSuffix}`} className="op-sdk-field" />
              </div>
              <button
                type="button"
                className="mc-btn-primary w-full py-3 text-[15px]"
                disabled={!sdkReady || busy}
                onClick={() => void activateWithCard()}
              >
                {busy ? 'Procesando…' : 'Activar membresía'}
              </button>
              <p className="text-[11px] leading-relaxed text-[var(--cat-muted)]">
                Registramos tu tarjeta y realizamos el primer cobro en un solo paso.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="ios-footnote text-[var(--cat-muted)]">
                Vinculá tu Nequi para renovaciones automáticas.
              </p>
              <input
                className="mc-input"
                inputMode="tel"
                placeholder="Celular Nequi"
                value={nequiPhone}
                onChange={(e) => setNequiPhone(e.target.value.replace(/\D/g, ''))}
              />
              <button
                type="button"
                className="mc-btn-primary w-full py-3 text-[15px]"
                disabled={busy || nequiPhone.length < 10}
                onClick={() => void activateWithNequi()}
              >
                {busy ? 'Procesando…' : 'Activar membresía'}
              </button>
            </div>
          )}
        </div>
      )}

      {msg && <p className="text-[13px] leading-relaxed">{msg}</p>}
    </div>
  )
}
