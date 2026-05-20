import { useCallback, useEffect, useId, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { getFirebaseFunctions } from '@/lib/firebase'
import { initCardFields, loadOnePayCapturesScript, tokenizeCard } from '@/lib/onepayCaptures'
import type { McBillingPeriod } from '@/lib/billingSubscriptionClient'

type SubscriptionState = {
  subscriptionEndsAt: number
  billingPeriod: McBillingPeriod
  amountCop: number
  autoRenewEnabled: boolean
  billingSubStatus: string
  pinnedCardId: string | null
  pinnedAccountId: string | null
  debitMethod: 'card' | 'nequi' | null
}

type PaymentRow = {
  chargeId: string
  amountCop: number
  period: McBillingPeriod
  kind: 'activation' | 'renewal'
  status: string
  createdAt: number
}

type CardRow = { id: string; brand?: string; last_four?: string }
type NequiRow = { id: string; status?: string; authorization?: boolean }

type Props = {
  expertName: string
  onMessage: (message: string) => void
}

function formatBillingDate(ms: number): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function BillingSubscriptionManage({ expertName, onMessage }: Props) {
  const { tenant } = useMcAuth()
  const fieldSuffix = useId().replace(/:/g, '')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [state, setState] = useState<SubscriptionState | null>(null)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [cards, setCards] = useState<CardRow[]>([])
  const [nequiAccounts, setNequiAccounts] = useState<NequiRow[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [addMethod, setAddMethod] = useState<'card' | 'nequi'>('card')
  const [sdkReady, setSdkReady] = useState(false)
  const [captureRouteId, setCaptureRouteId] = useState('')
  const [nequiPhone, setNequiPhone] = useState('')
  const [nequiBankId, setNequiBankId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const fnState = httpsCallable(getFirebaseFunctions(), 'mcBillingGetSubscriptionState')
      const fnMethods = httpsCallable(getFirebaseFunctions(), 'mcBillingPaymentMethods')
      const fnHistory = httpsCallable(getFirebaseFunctions(), 'mcBillingListPaymentHistoryCallable')
      const [stateRes, methodsRes, historyRes] = await Promise.all([
        fnState({}),
        fnMethods({}),
        fnHistory({}),
      ])
      setState(stateRes.data as SubscriptionState)
      const methods = methodsRes.data as { cards?: CardRow[]; nequiAccounts?: NequiRow[] }
      setCards(methods.cards ?? [])
      setNequiAccounts(methods.nequiAccounts ?? [])
      const hist = historyRes.data as { payments?: PaymentRow[] }
      setPayments(hist.payments ?? [])
    } catch (e) {
      onMessage((e as { message?: string }).message ?? 'No se pudo cargar la suscripción.')
    } finally {
      setLoading(false)
    }
  }, [onMessage])

  useEffect(() => {
    void load()
  }, [load, tenant?.subscriptionEndsAt, tenant?.billingAutoRenewEnabled])

  const loadSdk = useCallback(async () => {
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingGetSdkContext')
      const ctx = await fn({})
      const d = ctx.data as { publicKey?: string; captureRouteId?: string }
      if (!d.publicKey || !d.captureRouteId) return
      setCaptureRouteId(d.captureRouteId)
      await loadOnePayCapturesScript()
      const ok = initCardFields({
        suffix: fieldSuffix,
        routeId: d.captureRouteId,
        publicKey: d.publicKey,
      })
      setSdkReady(ok)
    } catch {
      onMessage('No se pudo cargar el formulario de tarjeta.')
    }
  }, [fieldSuffix, onMessage])

  useEffect(() => {
    if (!addOpen || addMethod !== 'card') return
    void loadSdk()
  }, [addOpen, addMethod, loadSdk])

  useEffect(() => {
    if (!addOpen || addMethod !== 'nequi') return
    void (async () => {
      try {
        const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingListNequiBanks')
        const res = await fn({})
        const banks = (res.data as { banks?: { id: string; name: string }[] }).banks ?? []
        if (banks[0]?.id) setNequiBankId(banks[0].id)
      } catch {
        onMessage('No se pudo cargar Nequi.')
      }
    })()
  }, [addOpen, addMethod, onMessage])

  async function pinMethod(cardId?: string, accountId?: string) {
    setBusy(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingSetDefaultPaymentMethod')
      await fn({ cardId, accountId })
      onMessage('Método de pago actualizado.')
      await load()
    } catch (e) {
      onMessage((e as { message?: string }).message ?? 'No se pudo actualizar el método.')
    } finally {
      setBusy(false)
    }
  }

  async function addCard() {
    if (!captureRouteId) return
    setBusy(true)
    try {
      const token = await tokenizeCard(captureRouteId)
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingAddCard')
      const res = await fn({ cardToken: token })
      const cardId = (res.data as { cardId?: string }).cardId
      if (!cardId) throw new Error('Tarjeta no registrada')
      onMessage('Tarjeta agregada.')
      setAddOpen(false)
      await load()
    } catch (e) {
      onMessage((e as { message?: string }).message ?? 'Error al registrar tarjeta.')
    } finally {
      setBusy(false)
    }
  }

  async function addNequi() {
    setBusy(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingAddNequi')
      await fn({ phone: nequiPhone, bankId: nequiBankId })
      onMessage('Nequi vinculado.')
      setAddOpen(false)
      setNequiPhone('')
      await load()
    } catch (e) {
      onMessage((e as { message?: string }).message ?? 'Error al vincular Nequi.')
    } finally {
      setBusy(false)
    }
  }

  async function cancelAutoRenew() {
    if (
      !window.confirm(
        '¿Cancelar el débito automático? Tu plan sigue vigente hasta la fecha de vencimiento; no se renovará solo.',
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingCancelAutoRenewCallable')
      const res = await fn({})
      onMessage((res.data as { message?: string }).message ?? 'Débito automático cancelado.')
      await load()
    } catch (e) {
      onMessage((e as { message?: string }).message ?? 'No se pudo cancelar el débito automático.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="ios-footnote text-[var(--cat-muted)]">Cargando suscripción…</p>
  }

  if (!state) return null

  const planActive = state.subscriptionEndsAt > Date.now()

  return (
    <section className="mc-card space-y-5">
      <div>
        <h2 className="ios-headline">Administrar suscripción</h2>
        <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
          Plan <span className="font-medium text-[var(--cat-text)]">{expertName}</span>
          {planActive ? (
            <>
              {' '}
              · vigente hasta{' '}
              <span className="font-medium text-[var(--cat-text)]">
                {formatBillingDate(state.subscriptionEndsAt)}
              </span>
            </>
          ) : (
            <> · vencido</>
          )}
        </p>
        <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
          Débito automático:{' '}
          <span className="font-medium text-[var(--cat-text)]">
            {state.autoRenewEnabled ? 'activo' : 'cancelado'}
          </span>
          {state.autoRenewEnabled && state.amountCop > 0 ? (
            <>
              {' '}
              · {formatCop(state.amountCop)} / {state.billingPeriod === 'yearly' ? 'año' : 'mes'}
            </>
          ) : null}
        </p>
      </div>

      <div className="space-y-2 border-t border-neutral-200/60 pt-4">
        <p className="text-[12px] font-medium text-[var(--cat-text)]">Métodos de pago</p>
        {cards.length === 0 && nequiAccounts.length === 0 ? (
          <p className="ios-footnote text-[var(--cat-muted)]">No hay métodos guardados.</p>
        ) : (
          <ul className="space-y-2">
            {cards.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200/70 px-3 py-2.5"
              >
                <span className="text-[14px]">
                  {(c.brand ?? 'Tarjeta').toUpperCase()} ···· {c.last_four ?? '****'}
                  {state.pinnedCardId === c.id ? (
                    <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-emerald-800">
                      Principal
                    </span>
                  ) : null}
                </span>
                {state.pinnedCardId !== c.id && state.autoRenewEnabled ? (
                  <button
                    type="button"
                    className="text-[13px] font-medium underline underline-offset-2"
                    disabled={busy}
                    onClick={() => void pinMethod(c.id, undefined)}
                  >
                    Usar para débito
                  </button>
                ) : null}
              </li>
            ))}
            {nequiAccounts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200/70 px-3 py-2.5"
              >
                <span className="text-[14px]">
                  Nequi
                  {state.pinnedAccountId === a.id ? (
                    <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-emerald-800">
                      Principal
                    </span>
                  ) : null}
                </span>
                {state.pinnedAccountId !== a.id && state.autoRenewEnabled && a.authorization ? (
                  <button
                    type="button"
                    className="text-[13px] font-medium underline underline-offset-2"
                    disabled={busy}
                    onClick={() => void pinMethod(undefined, a.id)}
                  >
                    Usar para débito
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {!addOpen ? (
          <button
            type="button"
            className="mc-btn-secondary w-full py-2.5 text-[14px]"
            disabled={busy}
            onClick={() => setAddOpen(true)}
          >
            Agregar método de pago
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border border-neutral-200/70 p-3">
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium ${
                  addMethod === 'card' ? 'border-[var(--cat-text)] bg-neutral-50' : 'border-neutral-200'
                }`}
                onClick={() => setAddMethod('card')}
              >
                Tarjeta
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium ${
                  addMethod === 'nequi' ? 'border-[var(--cat-text)] bg-neutral-50' : 'border-neutral-200'
                }`}
                onClick={() => setAddMethod('nequi')}
              >
                Nequi
              </button>
            </div>
            {addMethod === 'card' ? (
              <div className="space-y-2">
                <div id={`op-cc-holder-${fieldSuffix}`} className="op-sdk-field" />
                <div id={`op-cc-number-${fieldSuffix}`} className="op-sdk-field" />
                <div className="grid grid-cols-2 gap-2">
                  <div id={`op-cc-exp-${fieldSuffix}`} className="op-sdk-field" />
                  <div id={`op-cc-cvv-${fieldSuffix}`} className="op-sdk-field" />
                </div>
                <button
                  type="button"
                  className="mc-btn-primary w-full py-2.5 text-[14px]"
                  disabled={!sdkReady || busy}
                  onClick={() => void addCard()}
                >
                  {busy ? 'Guardando…' : 'Guardar tarjeta'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  className="mc-input"
                  inputMode="tel"
                  placeholder="Celular Nequi"
                  value={nequiPhone}
                  onChange={(e) => setNequiPhone(e.target.value.replace(/\D/g, ''))}
                />
                <button
                  type="button"
                  className="mc-btn-primary w-full py-2.5 text-[14px]"
                  disabled={busy || nequiPhone.length < 10}
                  onClick={() => void addNequi()}
                >
                  {busy ? 'Vinculando…' : 'Vincular Nequi'}
                </button>
              </div>
            )}
            <button
              type="button"
              className="w-full text-[13px] font-medium text-[var(--cat-muted)] underline underline-offset-2"
              disabled={busy}
              onClick={() => setAddOpen(false)}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-neutral-200/60 pt-4">
        <p className="text-[12px] font-medium text-[var(--cat-text)]">Pagos realizados</p>
        {payments.length === 0 ? (
          <p className="ios-footnote text-[var(--cat-muted)]">Aún no hay pagos registrados.</p>
        ) : (
          <ul className="divide-y divide-neutral-200/60 rounded-lg border border-neutral-200/70">
            {payments.map((p) => (
              <li key={p.chargeId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div>
                  <p className="text-[14px] font-medium">{formatCop(p.amountCop)}</p>
                  <p className="text-[11px] text-[var(--cat-muted)]">
                    {formatBillingDate(p.createdAt)} · {p.kind === 'renewal' ? 'Renovación' : 'Activación'} ·{' '}
                    {p.period === 'yearly' ? 'Anual' : 'Mensual'}
                  </p>
                </div>
                <span className="text-[11px] uppercase tracking-wide text-emerald-800">{p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {state.autoRenewEnabled && planActive ? (
        <button
          type="button"
          className="mc-btn-secondary w-full border-red-200/80 py-2.5 text-[14px] text-red-900"
          disabled={busy}
          onClick={() => void cancelAutoRenew()}
        >
          {busy ? 'Procesando…' : 'Cancelar débito automático'}
        </button>
      ) : null}

      {!state.autoRenewEnabled && planActive ? (
        <p className="ios-footnote text-[var(--cat-muted)]">
          El débito automático está desactivado. Seguís con acceso {expertName} hasta{' '}
          {formatBillingDate(state.subscriptionEndsAt)}; después volvés al plan Free.
        </p>
      ) : null}
    </section>
  )
}
