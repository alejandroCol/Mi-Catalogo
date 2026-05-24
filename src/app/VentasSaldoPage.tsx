import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { PasarelaOnepayComisionesModal } from '@/app/PasarelaOnepayComisionesModal'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import {
  onepayFundWithdrawalPeriodLabel,
  onepayFundWithdrawalPeriodShort,
  type OnepayFundWithdrawalPeriod,
} from '@/lib/onepayFundWithdrawalPeriod'
import { IconBankCard, IconChevronLeft } from '@/icons/McIcons'

function callableErrorMessage(e: unknown): string {
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return 'No se pudo cargar el saldo.'
}

type PaymentRow = {
  orderId: string
  createdAt: number
  numeroReferencia: string | null
  clienteNombre: string | null
  grossCop: number
}

type WithdrawalRow = {
  id: string
  amountCop: number
  netCop: number
  createdAt: number
}

type PasarelaMicatalogoLedger = {
  grossTotalCop: number
  netTotalCop: number
  withdrawnTotalCop: number
  availableNetCop: number
  paymentCount: number
  withdrawals: WithdrawalRow[]
}

type SaldoSummary = {
  modo: 'pasarela' | 'pasarela_micatalogo'
  balance: { balance?: number; balance_label?: string } | null
  ledger: PasarelaMicatalogoLedger | null
  grossTotalCop: number
  payments: PaymentRow[]
  payoutConfigured: boolean
  payoutAccountHint: string | null
  fundWithdrawalPeriod: OnepayFundWithdrawalPeriod | null
}

export function VentasSaldoPage() {
  const { tenant } = useMcAuth()
  const [searchParams] = useSearchParams()
  const periodFilter = searchParams.get('periodo')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<SaldoSummary | null>(null)
  const [comisionesOpen, setComisionesOpen] = useState(false)

  const modo = explicitCheckoutVentasModo(tenant)
  const isMicatalogo = data?.modo === 'pasarela_micatalogo'

  const load = useCallback(async () => {
    if (!firebaseConfigured || !tenant || modo === 'whatsapp' || modo === null) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepaySellerSaldoSummary')
      const res = (await fn({})) as { data: SaldoSummary }
      setData(res.data)
    } catch (e) {
      setErr(callableErrorMessage(e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [tenant, modo])

  useEffect(() => {
    void load()
  }, [load])

  const filteredPayments = useMemo(() => {
    if (!data?.payments.length) return []
    if (periodFilter !== 'hoy' && periodFilter !== 'semana') return data.payments
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const day = now.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday).getTime()
    const from = periodFilter === 'hoy' ? startOfToday : startOfWeek
    return data.payments.filter((p) => p.createdAt >= from)
  }, [data?.payments, periodFilter])

  const filteredGross = useMemo(
    () => filteredPayments.reduce((s, p) => s + p.grossCop, 0),
    [filteredPayments],
  )

  if (!tenant) {
    return (
      <div className="mc-shell">
        <p className="ios-subhead">Cargando…</p>
      </div>
    )
  }

  if (modo === null || modo === 'whatsapp') {
    return (
      <div className="mc-shell space-y-6 pb-28">
        <BackLink />
        <p className="text-[15px] text-[var(--cat-muted)]">
          Configurá un método de pago con pasarela en{' '}
          <Link to="/app/cuenta/checkout-ventas" className="font-medium underline underline-offset-2">
            Cuenta
          </Link>{' '}
          para ver tu saldo de cobros en línea.
        </p>
      </div>
    )
  }

  const periodTitle =
    periodFilter === 'hoy'
      ? ' · Hoy'
      : periodFilter === 'semana'
        ? ' · Esta semana'
        : ''

  const ledger = data?.ledger
  const heroAmount = isMicatalogo ? (ledger?.availableNetCop ?? 0) : (data?.balance?.balance ?? null)

  return (
    <div className="mc-shell space-y-8 pb-28">
      <PasarelaOnepayComisionesModal open={comisionesOpen} onClose={() => setComisionesOpen(false)} />

      <div>
        <BackLink />
        <h1 className="mt-3 text-[1.75rem] font-medium leading-tight tracking-tight text-[var(--cat-text)] sm:text-[2rem]">
          Mi saldo{periodTitle}
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--cat-muted)]">
          {isMicatalogo
            ? 'Resumen de tus ventas cobradas con pasarela Mi Catálogo.'
            : 'Cobros del catálogo con pasarela OnePay.'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-24 animate-pulse border border-neutral-200/50 bg-neutral-100/70" />
          ))}
        </div>
      ) : err ? (
        <p className="border border-amber-200/60 bg-amber-50/40 px-4 py-3 text-[14px] text-amber-950">{err}</p>
      ) : data ? (
        <>
          <section className="border border-[color-mix(in_srgb,var(--cat-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_92%,var(--cat-accent))] px-6 py-7">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-neutral-200/60 bg-[var(--cat-surface)]">
                <IconBankCard size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
                  {isMicatalogo ? 'Disponible para retirar' : 'Saldo en pasarela'}
                </p>
                <p className="mt-2 text-[1.9rem] font-medium tabular-nums leading-none tracking-tight text-[var(--cat-text)]">
                  {typeof heroAmount === 'number'
                    ? formatCop(heroAmount)
                    : data.balance?.balance_label?.trim() || formatCop(0)}
                </p>
                {isMicatalogo && ledger ? (
                  <>
                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--cat-muted)]">
                      Basado en {ledger.paymentCount}{' '}
                      {ledger.paymentCount === 1 ? 'venta cobrada' : 'ventas cobradas'} en tu catálogo.
                    </p>
                    {ledger.withdrawnTotalCop > 0 ? (
                      <p className="mt-2 text-[13px] text-[var(--cat-muted)]">
                        Retiros realizados:{' '}
                        <span className="font-medium tabular-nums text-[var(--cat-text)]">
                          {formatCop(ledger.withdrawnTotalCop)}
                        </span>
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </section>

          {data.modo === 'pasarela' ? (
            <section className="border border-emerald-200/50 bg-emerald-50/35 px-5 py-4 text-[14px] leading-relaxed text-emerald-950">
              <p className="font-medium">Retiro automático</p>
              <p className="mt-1.5">
                Tu dinero se retirará automáticamente a la cuenta que registraste en OnePay{' '}
                {data.fundWithdrawalPeriod ? (
                  <>
                    <strong>{onepayFundWithdrawalPeriodShort(data.fundWithdrawalPeriod)}</strong> (
                    {onepayFundWithdrawalPeriodLabel(data.fundWithdrawalPeriod).toLowerCase()}).
                  </>
                ) : (
                  <>según la periodicidad acordada con OnePay al crear tu empresa.</>
                )}
              </p>
            </section>
          ) : (
            <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/app/mi-saldo/retirar"
                className="mc-btn-cat inline-flex flex-1 items-center justify-center py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] no-underline"
              >
                Retirar fondos
              </Link>
              {data.payoutConfigured && data.payoutAccountHint ? (
                <p className="text-[13px] text-[var(--cat-muted)]">
                  Cuenta registrada: <span className="font-mono">{data.payoutAccountHint}</span>
                </p>
              ) : (
                <p className="text-[13px] text-[var(--cat-muted)]">
                  Primero registrá la cuenta donde querés recibir el dinero.
                </p>
              )}
            </section>
          )}

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[16px] font-medium tracking-tight text-[var(--cat-text)]">
                Ventas con pasarela ({isMicatalogo && ledger ? ledger.paymentCount : filteredPayments.length})
              </h2>
              {periodFilter && filteredPayments.length > 0 ? (
                <p className="text-[13px] tabular-nums text-[var(--cat-muted)]">{formatCop(filteredGross)}</p>
              ) : null}
            </div>
            {filteredPayments.length === 0 ? (
              <p className="mt-4 text-[14px] text-[var(--cat-muted)]">No hay cobros en este período.</p>
            ) : (
              <ul className="mt-4 divide-y divide-neutral-200/50 border border-neutral-200/50">
                {filteredPayments.map((p) => (
                  <li key={p.orderId} className="bg-[var(--cat-surface)] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-[var(--cat-text)]">
                          {p.clienteNombre?.trim() || 'Cliente'}
                        </p>
                        {p.numeroReferencia ? (
                          <p className="font-mono text-[11px] text-[var(--cat-muted)]">{p.numeroReferencia}</p>
                        ) : null}
                        <p className="mt-1 text-[12px] text-[var(--cat-muted)]">
                          {new Date(p.createdAt).toLocaleString('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                      <p className="shrink-0 text-[1.05rem] font-medium tabular-nums text-[var(--cat-text)] sm:text-right">
                        {formatCop(p.grossCop)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isMicatalogo && ledger && ledger.withdrawals.length > 0 ? (
            <section>
              <h2 className="text-[16px] font-medium tracking-tight text-[var(--cat-text)]">
                Retiros ({ledger.withdrawals.length})
              </h2>
              <ul className="mt-4 divide-y divide-neutral-200/50 border border-neutral-200/50">
                {ledger.withdrawals.map((w) => (
                  <li key={w.id} className="bg-[var(--cat-surface)] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[15px] font-medium text-[var(--cat-text)]">Retiro a cuenta bancaria</p>
                        <p className="mt-1 text-[12px] text-[var(--cat-muted)]">
                          {new Date(w.createdAt).toLocaleString('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                      <p className="shrink-0 text-[1.05rem] font-medium tabular-nums text-emerald-900 sm:text-right">
                        {formatCop(w.netCop)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="border-t border-neutral-200/40 pt-6 text-center">
            <button
              type="button"
              onClick={() => setComisionesOpen(true)}
              className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--cat-muted)] transition hover:text-[var(--cat-text)]"
            >
              <span className="border-b border-dotted border-current pb-0.5 transition group-hover:border-solid">
                Ver comisiones de pasarela OnePay
              </span>
              <span aria-hidden="true" className="text-[12px] opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                →
              </span>
            </button>
          </div>
        </>
      ) : null}

      <button
        type="button"
        className="mc-btn-secondary px-4 py-2.5 text-[14px] disabled:opacity-40"
        disabled={loading}
        onClick={() => void load()}
      >
        Actualizar
      </button>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/app"
      className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--cat-muted)] transition hover:text-[var(--cat-text)]"
    >
      <IconChevronLeft size={17} />
      Inicio
    </Link>
  )
}
