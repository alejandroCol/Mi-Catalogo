import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import { IconBankCard, IconChevronLeft, IconChevronRight } from '@/icons/McIcons'
import { isSubscriptionActive } from '@/lib/subscription'
import { formatCop } from '@/lib/formatCop'

function callableErrorMessage(e: unknown): string {
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return 'No se pudo completar la consulta.'
}

type OnePayPaymentRow = {
  id: string
  status: string
  currency: string
  amount: number
  amount_label?: string
  title?: string | null
  created_at?: string | null
  paid_at?: string | null
  payment_link?: string | null
  reference?: string | null
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    pending: 'Pendiente',
    completed: 'Pagado',
    approved: 'Aprobado',
    failed: 'Fallido',
    cancelled: 'Cancelado',
    canceled: 'Cancelado',
  }
  return m[s] || s
}

export function OnepayPasarelaResumenPage() {
  const { profile, tenant } = useMcAuth()
  const [balanceLabel, setBalanceLabel] = useState<string | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [balanceErr, setBalanceErr] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<OnePayPaymentRow[]>([])
  const [lastPage, setLastPage] = useState(1)
  const [listLoading, setListLoading] = useState(true)
  const [listErr, setListErr] = useState<string | null>(null)

  const isOwner = Boolean(profile?.uid && tenant?.ownerUid && profile.uid === tenant.ownerUid)
  const subActive = tenant ? isSubscriptionActive(tenant.subscriptionEndsAt) : false
  const pasarelaOk = tenant?.onepayPaymentsEnabled === true

  const loadBalance = useCallback(async () => {
    if (!firebaseConfigured || !pasarelaOk || !isOwner || !subActive) {
      setBalanceLoading(false)
      return
    }
    setBalanceLoading(true)
    setBalanceErr(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayMerchantBalance')
      const res = (await fn({})) as {
        data: { id?: string; balance?: number; balance_label?: string }
      }
      const bl = res.data?.balance_label
      setBalanceLabel(typeof bl === 'string' && bl.trim() ? bl.trim() : null)
    } catch (e) {
      setBalanceErr(callableErrorMessage(e))
      setBalanceLabel(null)
    } finally {
      setBalanceLoading(false)
    }
  }, [isOwner, pasarelaOk, subActive])

  const loadList = useCallback(
    async (p: number) => {
      if (!firebaseConfigured || !pasarelaOk || !isOwner || !subActive) {
        setListLoading(false)
        return
      }
      setListLoading(true)
      setListErr(null)
      try {
        const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayMerchantPayments')
        const res = (await fn({ page: p })) as {
          data: {
            payments?: OnePayPaymentRow[]
            currentPage?: number
            lastPage?: number
          }
        }
        const d = res.data
        setRows(Array.isArray(d?.payments) ? d.payments : [])
        if (typeof d?.lastPage === 'number' && d.lastPage >= 1) setLastPage(d.lastPage)
      } catch (e) {
        setListErr(callableErrorMessage(e))
        setRows([])
      } finally {
        setListLoading(false)
      }
    },
    [isOwner, pasarelaOk, subActive],
  )

  useEffect(() => {
    void loadBalance()
  }, [loadBalance])

  useEffect(() => {
    void loadList(page)
  }, [loadList, page])

  if (!tenant || !profile) {
    return (
      <div className="mc-shell">
        <p className="ios-subhead">Cargando…</p>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="mc-shell space-y-6 pb-28">
        <Link
          to="/app"
          className="inline-flex items-center gap-1 text-[15px] font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4"
        >
          <IconChevronLeft size={18} />
          Inicio
        </Link>
        <p className="text-[15px] text-[var(--cat-muted)]">Solo el dueño de la tienda puede ver el balance OnePay.</p>
      </div>
    )
  }

  if (!pasarelaOk) {
    return (
      <div className="mc-shell space-y-6 pb-28">
        <Link
          to="/app"
          className="inline-flex items-center gap-1 text-[15px] font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4"
        >
          <IconChevronLeft size={18} />
          Inicio
        </Link>
        <p className="text-[15px] text-[var(--cat-muted)]">
          Cuando actives la pasarela en{' '}
          <Link to="/app/cuenta" className="font-medium underline underline-offset-2">
            Cuenta
          </Link>
          , acá verás tu balance y cobros.
        </p>
        <Link
          to="/app/pagos-pasarela"
          className="inline-flex items-center gap-1 text-[15px] font-medium text-[var(--cat-text)] underline underline-offset-4"
        >
          Ir a solicitud OnePay
          <IconChevronRight size={17} />
        </Link>
      </div>
    )
  }

  if (!subActive) {
    return (
      <div className="mc-shell space-y-6 pb-28">
        <Link
          to="/app"
          className="inline-flex items-center gap-1 text-[15px] font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4"
        >
          <IconChevronLeft size={18} />
          Inicio
        </Link>
        <p className="text-[15px] text-[var(--cat-muted)]">Renová la membresía para consultar datos de OnePay.</p>
      </div>
    )
  }

  return (
    <div className="mc-shell space-y-8 pb-28">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/app"
            className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--cat-muted)] transition hover:text-[var(--cat-text)]"
          >
            <IconChevronLeft size={17} />
            Inicio
          </Link>
          <h1 className="mt-3 text-[1.65rem] font-medium leading-tight tracking-tight text-[var(--cat-text)] sm:text-[1.85rem]">
            Dinero en pasarela
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--cat-muted)]">
            Balance de tu cuenta según OnePay. Listado de cobros desde su API ({' '}
            <a
              href="https://docs.onepay.la/client/payments/list"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--cat-text)] underline underline-offset-2"
            >
              listar cobros
            </a>
            ).
          </p>
        </div>
        <button
          type="button"
          className="mc-btn-secondary self-start px-4 py-2.5 text-[14px] disabled:opacity-40"
          disabled={balanceLoading || listLoading}
          onClick={() => {
            void loadBalance()
            void loadList(page)
          }}
        >
          Actualizar
        </button>
      </div>

      <section className="border border-[color-mix(in_srgb,var(--cat-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_92%,var(--cat-accent))] px-6 py-7 sm:px-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] bg-[var(--cat-surface)] text-[var(--cat-text)]">
            <IconBankCard size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">Balance OnePay</p>
            {balanceLoading ? (
              <div className="mt-3 h-10 w-48 max-w-full animate-pulse rounded-sm bg-neutral-200/60" />
            ) : balanceErr ? (
              <p className="mt-2 text-[14px] text-amber-900">{balanceErr}</p>
            ) : (
              <p className="mt-2 break-words text-[1.85rem] font-medium tabular-nums leading-none tracking-tight text-[var(--cat-text)] sm:text-[2rem]">
                {balanceLabel || '—'}
              </p>
            )}
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--cat-muted)]">
              Referencia:{' '}
              <a
                href="https://docs.onepay.la/client/balance/get"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--cat-text)] underline underline-offset-2"
              >
                Obtener balance · OnePay
              </a>
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Cobros OnePay">
        <h2 className="text-[15px] font-medium tracking-tight text-[var(--cat-text)]">Cobros recientes</h2>
        {listErr && (
          <p className="mt-3 rounded-sm border border-amber-200/60 bg-amber-50/40 px-3 py-2 text-[13px] text-amber-950">{listErr}</p>
        )}
        {listLoading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-20 animate-pulse rounded-sm border border-neutral-200/50 bg-neutral-100/70" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-[14px] text-[var(--cat-muted)]">No hay cobros para mostrar en esta página.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200/50 border border-neutral-200/50">
            {rows.map((r) => {
              const monto =
                r.amount_label ||
                (Number.isFinite(r.amount) ? formatCop(Math.round(r.amount)) : '—')
              const created = r.created_at
                ? new Date(r.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                : '—'
              return (
                <li key={r.id} className="bg-[var(--cat-surface)] px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-[var(--cat-text)]">{r.title?.trim() || 'Cobro'}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--cat-muted)]">{r.id}</p>
                      <p className="mt-1 text-[12px] text-[var(--cat-muted)]">Creado · {created}</p>
                      {r.paid_at ? (
                        <p className="text-[12px] text-[var(--cat-muted)]">
                          Pagado ·{' '}
                          {new Date(r.paid_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <span className="inline-flex border border-neutral-200/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--cat-text)]">
                        {statusLabel(r.status)}
                      </span>
                      <p className="text-[1.1rem] font-medium tabular-nums text-[var(--cat-text)]">{monto}</p>
                      {r.payment_link ? (
                        <a
                          href={r.payment_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[13px] font-medium text-[var(--cat-text)] underline underline-offset-2"
                        >
                          Ver link de pago
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {lastPage > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-neutral-200/50 bg-[var(--cat-surface)] px-4 py-3">
            <button
              type="button"
              className="mc-btn-secondary px-4 py-2 text-[14px] disabled:opacity-40"
              disabled={page <= 1 || listLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <p className="text-[13px] text-[var(--cat-muted)]">
              Página {page} de {lastPage}
            </p>
            <button
              type="button"
              className="mc-btn-secondary px-4 py-2 text-[14px] disabled:opacity-40"
              disabled={page >= lastPage || listLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
