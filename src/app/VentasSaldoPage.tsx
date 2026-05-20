import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import {
  onepayFundWithdrawalPeriodLabel,
  onepayFundWithdrawalPeriodShort,
  type OnepayFundWithdrawalPeriod,
} from '@/lib/onepayFundWithdrawalPeriod'
import {
  onepayMerchantFeePerPaymentCop,
  onepayMerchantNetPerPaymentCop,
  pasarelaMicatalogoFeePerPaymentCop,
  pasarelaMicatalogoNetPerPaymentCop,
  PASARELA_MICATALOGO_WITHDRAWAL_FIXED_COP,
} from '@/lib/pasarelaFees'
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

type SaldoSummary = {
  modo: 'pasarela' | 'pasarela_micatalogo'
  balance: { balance?: number; balance_label?: string } | null
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

  const modo = explicitCheckoutVentasModo(tenant)

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

  const totals = useMemo(() => {
    const rows = filteredPayments
    const gross = rows.reduce((s, p) => s + p.grossCop, 0)
    const isMc = data?.modo === 'pasarela_micatalogo'
    const fee = rows.reduce(
      (s, p) =>
        s +
        (isMc ? pasarelaMicatalogoFeePerPaymentCop(p.grossCop) : onepayMerchantFeePerPaymentCop(p.grossCop)),
      0,
    )
    const net = rows.reduce(
      (s, p) =>
        s +
        (isMc ? pasarelaMicatalogoNetPerPaymentCop(p.grossCop) : onepayMerchantNetPerPaymentCop(p.grossCop)),
      0,
    )
    return { gross, fee, net, count: rows.length }
  }, [filteredPayments, data?.modo])

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

  return (
    <div className="mc-shell space-y-8 pb-28">
      <div>
        <BackLink />
        <h1 className="mt-3 text-[1.75rem] font-medium leading-tight tracking-tight text-[var(--cat-text)] sm:text-[2rem]">
          Mi saldo{periodTitle}
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--cat-muted)]">
          Cobros del catálogo con pasarela: bruto, comisión estimada y neto por venta.
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
                  Saldo en pasarela
                </p>
                <p className="mt-2 text-[1.9rem] font-medium tabular-nums leading-none tracking-tight text-[var(--cat-text)]">
                  {data.balance?.balance_label?.trim() || formatCop(data.balance?.balance ?? 0)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-neutral-200/40 pt-4 text-center sm:gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--cat-muted)]">Bruto</p>
                    <p className="mt-1 text-[15px] font-medium tabular-nums">{formatCop(totals.gross)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--cat-muted)]">Comisión est.</p>
                    <p className="mt-1 text-[15px] font-medium tabular-nums text-amber-900">
                      −{formatCop(totals.fee)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--cat-muted)]">Neto est.</p>
                    <p className="mt-1 text-[15px] font-medium tabular-nums text-emerald-900">
                      {formatCop(totals.net)}
                    </p>
                  </div>
                </div>
                {data.modo === 'pasarela_micatalogo' ? (
                  <p className="mt-3 text-[12px] leading-relaxed text-[var(--cat-muted)]">
                    Al retirar se descuenta además{' '}
                    <strong className="font-medium text-[var(--cat-text)]">
                      {formatCop(PASARELA_MICATALOGO_WITHDRAWAL_FIXED_COP)}
                    </strong>{' '}
                    fijos por operación de retiro.
                  </p>
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
            <h2 className="text-[16px] font-medium tracking-tight text-[var(--cat-text)]">
              Pagos con pasarela ({totals.count})
            </h2>
            {filteredPayments.length === 0 ? (
              <p className="mt-4 text-[14px] text-[var(--cat-muted)]">No hay cobros en este período.</p>
            ) : (
              <ul className="mt-4 divide-y divide-neutral-200/50 border border-neutral-200/50">
                {filteredPayments.map((p) => {
                  const fee =
                    data.modo === 'pasarela_micatalogo'
                      ? pasarelaMicatalogoFeePerPaymentCop(p.grossCop)
                      : onepayMerchantFeePerPaymentCop(p.grossCop)
                  const net =
                    data.modo === 'pasarela_micatalogo'
                      ? pasarelaMicatalogoNetPerPaymentCop(p.grossCop)
                      : onepayMerchantNetPerPaymentCop(p.grossCop)
                  return (
                    <li key={p.orderId} className="bg-[var(--cat-surface)] px-4 py-4 sm:px-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
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
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] uppercase tracking-wide text-[var(--cat-muted)]">Bruto</p>
                          <p className="text-[1.05rem] font-medium tabular-nums">{formatCop(p.grossCop)}</p>
                          <p className="mt-1 text-[12px] tabular-nums text-amber-900">−{formatCop(fee)}</p>
                          <p className="text-[13px] font-medium tabular-nums text-emerald-900">{formatCop(net)}</p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
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
