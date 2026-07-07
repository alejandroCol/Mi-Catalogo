import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import type { McBillingPeriod } from '@/lib/billingSubscriptionClient'
import { formatCop } from '@/lib/formatCop'
import { getFirebaseFunctions } from '@/lib/firebase'
import { initCardFields, loadOnePayCapturesScript, tokenizeCard } from '@/lib/onepayCaptures'
import { splitStoredWaDigits } from '@/lib/waPhonePrefixes'

type PayMethod = 'card' | 'nequi'

type CheckoutOutcome =
  | { kind: 'idle' }
  | { kind: 'nequi_linking' }
  | { kind: 'nequi_payment_approval'; accountId: string; message: string }
  | { kind: 'processing'; label: string }
  | { kind: 'success'; message: string }
  | { kind: 'pending'; message: string }
  | { kind: 'payment_error'; message: string }
  | { kind: 'activation_error'; message: string }

function isPaymentRejectedMessage(message: string): boolean {
  return /rechaz|declin|failed|cancel|expir|no se complet/i.test(message)
}

function callableErrorMessage(e: unknown): string {
  const err = e as { message?: string; details?: string; code?: string }
  const raw = err.message ?? err.details ?? ''
  if (/failed-precondition/i.test(String(err.code ?? '')) && raw) return raw
  return raw || 'No pudimos completar la operación. Intentá de nuevo.'
}

function BillingCheckoutStatus({
  variant,
  title,
  description,
  children,
}: {
  variant: 'success' | 'pending' | 'error' | 'processing' | 'nequi'
  title: string
  description: string
  children?: ReactNode
}) {
  const styles = {
    success: 'border-emerald-200/90 bg-emerald-50/90 text-emerald-950',
    pending: 'border-amber-200/90 bg-amber-50/90 text-amber-950',
    error: 'border-rose-200/90 bg-rose-50/90 text-rose-950',
    processing: 'border-neutral-200/90 bg-neutral-50/90 text-neutral-900',
    nequi: 'border-violet-200/80 bg-violet-50/90 text-violet-950',
  }[variant]

  const icon = {
    success: '✓',
    pending: '…',
    error: '!',
    processing: '↻',
    nequi: '◎',
  }[variant]

  return (
    <div className={`rounded-xl border px-4 py-4 ${styles}`}>
      <div className="flex gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-[15px] font-semibold shadow-sm"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug">{title}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed opacity-90">{description}</p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </div>
  )
}

function ZeroChargeDiscountNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[13px] leading-relaxed text-[var(--cat-muted)] ${className}`.trim()}>
      Cancelá cuando quieras. No se cobrará ningún valor en este momento.
    </p>
  )
}

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
  const [pendingNequiAccountId, setPendingNequiAccountId] = useState<string | null>(null)
  const [nequiChecking, setNequiChecking] = useState(false)
  const [nequiPaymentChecking, setNequiPaymentChecking] = useState(false)
  const [outcome, setOutcome] = useState<CheckoutOutcome>({ kind: 'idle' })
  const nequiLinkPollInFlightRef = useRef(false)
  const nequiPaymentPollInFlightRef = useRef(false)
  const nequiChargeSentRef = useRef(false)
  const successNotifiedRef = useRef(false)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

  const notifySuccess = useCallback(
    (message: string) => {
      if (successNotifiedRef.current) return
      successNotifiedRef.current = true
      onSuccessRef.current(message)
    },
    [],
  )

  useEffect(() => {
    if (
      outcome.kind !== 'pending' &&
      outcome.kind !== 'nequi_payment_approval' &&
      outcome.kind !== 'activation_error'
    ) {
      return
    }
    if (!tenant || !hasExpertFeatureAccess(tenant)) return
    const message = `¡Listo! Ya tenés ${expertName}. Tu plan está activo.`
    setOutcome({ kind: 'success', message })
    notifySuccess(message)
  }, [tenant, outcome.kind, expertName, notifySuccess])

  const nequiPaymentApprovalMessage = `Abrí la app Nequi y aprobá el cobro de ${formatCop(amountCop)}. Cuando lo hagas, activamos tu plan ${expertName} automáticamente.`

  useEffect(() => {
    if (!tenant || !profile) return
    setFirstName(tenant.billingPayerFirstName ?? '')
    setLastName(tenant.billingPayerLastName ?? '')
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

  async function callCompleteActivation(
    params: { method: PayMethod; cardId?: string; accountId?: string },
    options?: { silent?: boolean },
  ): Promise<'success' | 'pending'> {
    if (!options?.silent) {
      setOutcome({ kind: 'processing', label: 'Procesando tu pago…' })
    }
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
      const message =
        params.method === 'nequi'
          ? d.message ?? nequiPaymentApprovalMessage
          : d.message ??
            `Tu pago está confirmándose. En unos segundos activamos tu plan ${expertName}. Podés recargar esta página para ver el cambio.`
      if (params.method === 'nequi' && params.accountId) {
        setOutcome({ kind: 'nequi_payment_approval', accountId: params.accountId, message })
      } else {
        setOutcome({ kind: 'pending', message })
      }
      return 'pending'
    }
    const message = `¡Listo! Ya tenés ${expertName}. Tu plan está activo.`
    setOutcome({ kind: 'success', message })
    notifySuccess(message)
    return 'success'
  }

  function handlePaymentError(e: unknown, method: PayMethod = 'card') {
    const detail = callableErrorMessage(e)
    if (method === 'nequi') {
      setOutcome({
        kind: 'payment_error',
        message: isPaymentRejectedMessage(detail)
          ? 'El cobro no se completó. Abrí Nequi y aprobá la notificación del cobro. Si expiró o la rechazaste, tocá «Intentar de nuevo» para enviar una nueva solicitud.'
          : `No pudimos procesar el cobro con Nequi. ${detail}`,
      })
    } else {
      const message = isPaymentRejectedMessage(detail)
        ? detail
        : `No pudimos completar el pago. ${detail}`
      setOutcome({ kind: 'payment_error', message })
    }
    onErrorRef.current(detail)
  }

  /** Tras vincular Nequi, envía el cobro (notificación de pago) sin paso manual. */
  const startNequiPayment = useCallback(async (accountId: string) => {
    setBusy(true)
    setMsg(null)
    setOutcome({ kind: 'processing', label: 'Enviando cobro a Nequi…' })
    try {
      await callCompleteActivation({ method: 'nequi', accountId })
    } catch (e) {
      nequiChargeSentRef.current = false
      handlePaymentError(e, 'nequi')
    } finally {
      setBusy(false)
    }
  }, [period, discountCode, expertName, amountCop, notifySuccess])

  const startNequiPaymentRef = useRef(startNequiPayment)
  startNequiPaymentRef.current = startNequiPayment

  /** Paso 1: espera vinculación Nequi; al detectarla, cobra automáticamente. */
  const pollNequiAccountLinking = useCallback(
    async (options?: { manual?: boolean }) => {
      if (!pendingNequiAccountId || nequiLinkPollInFlightRef.current) return

      nequiLinkPollInFlightRef.current = true
      setNequiChecking(true)
      if (options?.manual) setMsg(null)

      try {
        const fnCheck = httpsCallable(getFirebaseFunctions(), 'mcBillingCheckNequiReady')
        const res = await fnCheck({ accountId: pendingNequiAccountId })
        const ready = (res.data as { ready?: boolean }).ready === true
        if (!ready) {
          if (options?.manual) {
            setMsg('Aún no detectamos la vinculación. Abrí Nequi y aprobá el enlace de la cuenta.')
          }
          return
        }
        setMsg(null)
        if (!nequiChargeSentRef.current) {
          nequiChargeSentRef.current = true
          void startNequiPaymentRef.current(pendingNequiAccountId)
        }
      } finally {
        setNequiChecking(false)
        nequiLinkPollInFlightRef.current = false
      }
    },
    [pendingNequiAccountId],
  )

  /** Paso 2: espera mientras el usuario aprueba el cobro en Nequi (poll automático). */
  const pollNequiPaymentApproval = useCallback(
    async (accountId: string) => {
      if (nequiPaymentPollInFlightRef.current) return
      nequiPaymentPollInFlightRef.current = true
      setNequiPaymentChecking(true)
      try {
        await callCompleteActivation({ method: 'nequi', accountId }, { silent: true })
      } catch (e) {
        const detail = callableErrorMessage(e)
        if (isPaymentRejectedMessage(detail)) {
          handlePaymentError(e, 'nequi')
        }
      } finally {
        nequiPaymentPollInFlightRef.current = false
        setNequiPaymentChecking(false)
      }
    },
    [period, discountCode, expertName, amountCop, notifySuccess],
  )

  const pollNequiAccountLinkingRef = useRef(pollNequiAccountLinking)
  pollNequiAccountLinkingRef.current = pollNequiAccountLinking

  const pollNequiPaymentApprovalRef = useRef(pollNequiPaymentApproval)
  pollNequiPaymentApprovalRef.current = pollNequiPaymentApproval

  useEffect(() => {
    if (outcome.kind !== 'nequi_linking' || !pendingNequiAccountId || method !== 'nequi') return

    void pollNequiAccountLinkingRef.current()
    const intervalId = window.setInterval(() => {
      void pollNequiAccountLinkingRef.current()
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [outcome.kind, pendingNequiAccountId, method])

  useEffect(() => {
    if (outcome.kind !== 'nequi_payment_approval' || method !== 'nequi') return

    const accountId = outcome.accountId
    void pollNequiPaymentApprovalRef.current(accountId)
    const intervalId = window.setInterval(() => {
      void pollNequiPaymentApprovalRef.current(accountId)
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [outcome, method])

  async function activateWithCard() {
    if (!captureRouteId) {
      setMsg('Esperá a que cargue el formulario de tarjeta.')
      return
    }
    setBusy(true)
    setMsg(null)
    setOutcome({ kind: 'processing', label: 'Procesando tu tarjeta…' })
    try {
      const token = await tokenizeCard(captureRouteId)
      const fnAdd = httpsCallable(getFirebaseFunctions(), 'mcBillingAddCard')
      const addRes = await fnAdd({ cardToken: token })
      const cardId = (addRes.data as { cardId?: string }).cardId
      if (!cardId) throw new Error('Tarjeta no registrada')
      await callCompleteActivation({ method: 'card', cardId })
    } catch (e) {
      handlePaymentError(e, 'card')
    } finally {
      setBusy(false)
    }
  }

  async function activateWithNequi() {
    setBusy(true)
    setMsg(null)
    setOutcome({ kind: 'processing', label: 'Vinculando Nequi…' })
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingAddNequi')
      const res = await fn({ phone: nequiPhone, bankId: nequiBankId })
      const d = res.data as { accountId?: string; awaitingApproval?: boolean }
      if (!d.accountId) throw new Error('No se vinculó Nequi')
      if (d.awaitingApproval) {
        setPendingNequiAccountId(d.accountId)
        setOutcome({ kind: 'nequi_linking' })
        setMsg(null)
        return
      }
      setPendingNequiAccountId(d.accountId)
      nequiChargeSentRef.current = true
      await startNequiPayment(d.accountId)
    } catch (e) {
      handlePaymentError(e, 'nequi')
    } finally {
      setBusy(false)
    }
  }

  async function activateFree() {
    setBusy(true)
    setMsg(null)
    setOutcome({ kind: 'processing', label: 'Activando tu plan…' })
    try {
      await callCompleteActivation({ method: 'card' })
    } catch (e) {
      handlePaymentError(e, 'card')
    } finally {
      setBusy(false)
    }
  }

  function resetOutcome() {
    setOutcome({ kind: 'idle' })
    setMsg(null)
    setPendingNequiAccountId(null)
    nequiChargeSentRef.current = false
    successNotifiedRef.current = false
  }

  const showPaymentForm = outcome.kind === 'idle'

  const outcomeCard = (() => {
    switch (outcome.kind) {
      case 'processing':
        return (
          <BillingCheckoutStatus
            variant="processing"
            title={outcome.label}
            description="Por favor esperá un momento. No cierres esta ventana."
          />
        )
      case 'success':
        return (
          <BillingCheckoutStatus
            variant="success"
            title="¡Todo listo!"
            description={outcome.message}
          />
        )
      case 'pending':
        return (
          <BillingCheckoutStatus
            variant="pending"
            title="Pago recibido"
            description={outcome.message}
          >
            <button
              type="button"
              className="w-full rounded-lg border border-amber-300/70 bg-white px-3 py-2 text-[13px] font-medium transition hover:bg-amber-50"
              onClick={() => window.location.reload()}
            >
              Recargar página
            </button>
          </BillingCheckoutStatus>
        )
      case 'payment_error':
        return (
          <BillingCheckoutStatus variant="error" title="No se pudo completar el pago" description={outcome.message}>
            <button
              type="button"
              className="w-full rounded-lg border border-rose-300/70 bg-white px-3 py-2 text-[13px] font-medium transition hover:bg-rose-50"
              onClick={resetOutcome}
            >
              Intentar de nuevo
            </button>
          </BillingCheckoutStatus>
        )
      case 'activation_error':
        return (
          <BillingCheckoutStatus
            variant="pending"
            title="Pago recibido — activando tu plan"
            description={outcome.message}
          >
            <button
              type="button"
              className="w-full rounded-lg border border-amber-300/70 bg-white px-3 py-2 text-[13px] font-medium transition hover:bg-amber-50"
              onClick={() => window.location.reload()}
            >
              Recargar página
            </button>
          </BillingCheckoutStatus>
        )
      case 'nequi_linking':
        return (
          <BillingCheckoutStatus
            variant="nequi"
            title="Esperando vinculación Nequi"
            description={
              nequiChecking
                ? 'Verificando…'
                : 'Te llegará una notificación en Nequi para vincular tu cuenta. Cuando la aprobés, enviamos el cobro automáticamente.'
            }
          >
            <button
              type="button"
              className="w-full rounded-lg border border-violet-300/70 bg-white px-3 py-2 text-[13px] font-medium transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
              disabled={nequiChecking || busy}
              onClick={() => void pollNequiAccountLinking({ manual: true })}
            >
              {nequiChecking || busy ? 'Verificando…' : 'Refrescar'}
            </button>
          </BillingCheckoutStatus>
        )
      case 'nequi_payment_approval':
        return (
          <BillingCheckoutStatus
            variant="pending"
            title="Aprobá el cobro en Nequi"
            description={outcome.message}
          >
            <p className="text-[12px] leading-relaxed opacity-80">
              {nequiPaymentChecking
                ? 'Verificando pago…'
                : 'Revisamos automáticamente cada pocos segundos. Apenas aprobés en Nequi, activamos tu plan.'}
            </p>
            <button
              type="button"
              className="mt-2 w-full rounded-lg border border-amber-300/70 bg-white px-3 py-2 text-[13px] font-medium transition hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60"
              disabled={busy || nequiPaymentChecking}
              onClick={() => void pollNequiPaymentApproval(outcome.accountId)}
            >
              {nequiPaymentChecking ? 'Verificando…' : 'Refrescar'}
            </button>
          </BillingCheckoutStatus>
        )
      default:
        return null
    }
  })()

  if (amountCop === 0 && !requiresPaymentMethod) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <p className="ios-subhead">Tu código activa el plan sin cobro hoy.</p>
        <ZeroChargeDiscountNotice />
        {outcomeCard}
        {outcome.kind === 'idle' && (
          <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void activateFree()}>
            {busy ? 'Activando…' : `Activar ${expertName} gratis`}
          </button>
        )}
        {msg && outcome.kind === 'idle' && <p className="text-[13px] text-rose-700">{msg}</p>}
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
            <ZeroChargeDiscountNotice className="mt-2 text-[12px] text-emerald-900/75" />
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
            <input
              className="mc-input"
              placeholder="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="off"
              name={`billing-given-${fieldSuffix}`}
            />
            <input
              className="mc-input"
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="off"
              name={`billing-family-${fieldSuffix}`}
            />
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
          {outcomeCard}

          {showPaymentForm && (
            <>
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
                <div className="space-y-3">
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
            </>
          )}
        </div>
      )}

      {msg && outcome.kind === 'idle' && <p className="text-[13px] leading-relaxed text-rose-700">{msg}</p>}
    </div>
  )
}
