import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { OnepayRetiroPayoutSuccessModal } from '@/app/OnepayRetiroPayoutSuccessModal'
import { McOptionCombobox } from '@/components/McOptionCombobox'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { normalizeCoPhoneE164 } from '@/lib/coPhoneE164'
import { formatCop, formatIntegerEsCo } from '@/lib/formatCop'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import {
  ONEPAY_KYB_ACCOUNT_TYPES_ORDER,
  isOnePayKybBankAccountType,
  onePayKybAccountTypeLabel,
  type OnePayKybBankAccountType,
} from '@/lib/onepayKyb'
import { pasarelaMicatalogoWithdrawalFeeCop, PASARELA_MICATALOGO_WITHDRAWAL_FIXED_COP } from '@/lib/pasarelaFees'
import { IconChevronLeft } from '@/icons/McIcons'

function callableErrorMessage(e: unknown): string {
  if (e && typeof e === 'object') {
    const fe = e as { code?: string; message?: string; details?: unknown }
    if (typeof fe.message === 'string' && fe.message.trim()) {
      return fe.message.trim()
    }
  }
  return 'No se pudo completar la operación.'
}

function formatWithdrawAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const n = Number(digits)
  return Number.isFinite(n) ? formatIntegerEsCo(n) : ''
}

function freshIdempotencyNonce(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

type KybBankRow = { id: string; name: string; supported_types: string[] }

const retiroPanelClass =
  'max-w-xl space-y-5 rounded-lg border border-neutral-200/65 bg-[var(--cat-surface)] px-5 py-6 shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_4%,transparent),0_8px_24px_color-mix(in_srgb,var(--cat-text)_3%,transparent)] sm:px-6 sm:py-7'

const retiroSectionClass =
  'space-y-4 rounded-md border border-neutral-200/45 bg-neutral-50/75 px-4 py-4 sm:px-5 sm:py-5'

const retiroInfoClass =
  'rounded-md border border-neutral-200/45 bg-neutral-50/80 px-4 py-3.5 text-[14px] leading-relaxed'

const retiroPrimaryBtnClass = 'mc-btn-primary w-full shadow-[0_1px_2px_color-mix(in_srgb,var(--cat-text)_8%,transparent)]'

const retiroCatBtnClass =
  'mc-btn-cat w-full py-3.5 font-semibold uppercase tracking-[0.1em] shadow-[0_1px_2px_color-mix(in_srgb,var(--cat-text)_8%,transparent)]'

const retiroSecondaryBtnClass =
  'mc-btn-secondary w-full border-neutral-200/70 bg-neutral-50/90 text-[14px] hover:bg-neutral-100/80'

const retiroFieldClass =
  'mc-input mt-1 py-2.5 border-neutral-300 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:border-neutral-400 focus:ring-1 focus:ring-neutral-900/10'

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'CC', label: 'CC' },
  { value: 'CE', label: 'CE' },
  { value: 'PASSPORT', label: 'Pasaporte' },
] as const

export function OnepayRetiroFondosPage() {
  const { tenant, firebaseUser } = useMcAuth()
  const nav = useNavigate()
  const idemRef = useRef<string | null>(null)
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && !idemRef.current) {
    idemRef.current = crypto.randomUUID()
  }

  const modo = explicitCheckoutVentasModo(tenant)
  const [step, setStep] = useState<'setup' | 'withdraw'>('setup')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [setupSuccessOpen, setSetupSuccessOpen] = useState(false)
  const [registeredAccountHint, setRegisteredAccountHint] = useState<string | null>(null)
  const [balanceLabel, setBalanceLabel] = useState<string | null>(null)
  const [availableNetCop, setAvailableNetCop] = useState<number | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [documentType, setDocumentType] = useState('CC')
  const [documentNumber, setDocumentNumber] = useState('')
  const [banks, setBanks] = useState<KybBankRow[]>([])
  const [banksLoading, setBanksLoading] = useState(false)
  const [bankId, setBankId] = useState('')
  const [accountType, setAccountType] = useState<OnePayKybBankAccountType>('savings')
  const [accountNumber, setAccountNumber] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  useEffect(() => {
    if (tenant?.onepayPayoutAccountId) setStep('withdraw')
  }, [tenant?.onepayPayoutAccountId])

  useEffect(() => {
    const em = firebaseUser?.email?.trim()
    if (em) setEmail(em)
  }, [firebaseUser?.email])

  useEffect(() => {
    if (!tenant?.whatsappNumero || phoneTouched) return
    const normalized = normalizeCoPhoneE164(tenant.whatsappNumero)
    if (normalized) setPhone(normalized)
  }, [tenant?.whatsappNumero, phoneTouched])

  useEffect(() => {
    if (!bankId) return
    const row = banks.find((b) => b.id === bankId)
    if (!row) return
    const allowed = ONEPAY_KYB_ACCOUNT_TYPES_ORDER.filter((t) => row.supported_types.includes(t))
    if (allowed.length > 0 && !allowed.includes(accountType)) {
      setAccountType(allowed[0])
    }
  }, [bankId, banks, accountType])

  const loadBalance = useCallback(async () => {
    if (!firebaseConfigured) return
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepaySellerSaldoSummary')
      const res = (await fn({})) as {
        data: {
          balance?: { balance_label?: string; balance?: number } | null
          ledger?: { availableNetCop?: number } | null
        }
      }
      const ledgerAvailable = res.data?.ledger?.availableNetCop
      if (typeof ledgerAvailable === 'number') {
        setAvailableNetCop(ledgerAvailable)
        setBalanceLabel(formatCop(ledgerAvailable))
        return
      }
      const bl = res.data?.balance?.balance_label
      setAvailableNetCop(null)
      setBalanceLabel(typeof bl === 'string' && bl.trim() ? bl.trim() : null)
    } catch {
      setBalanceLabel(null)
      setAvailableNetCop(null)
    }
  }, [])

  useEffect(() => {
    if (step === 'withdraw') void loadBalance()
  }, [step, loadBalance])

  useEffect(() => {
    if (!firebaseConfigured || step !== 'setup') return
    setBanksLoading(true)
    const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayListBanksForKyb')
    void fn({})
      .then((res) => {
        const d = res.data as { banks?: KybBankRow[] }
        setBanks(Array.isArray(d?.banks) ? d.banks : [])
      })
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false))
  }, [step])

  const kybAccountTypesAllowed = ONEPAY_KYB_ACCOUNT_TYPES_ORDER.filter((t) => {
    const row = banks.find((b) => b.id === bankId)
    return row?.supported_types.includes(t)
  })

  const bankOptions = useMemo(
    () => banks.map((b) => ({ value: b.id, label: b.name })),
    [banks],
  )

  const accountTypeOptions = useMemo(
    () =>
      kybAccountTypesAllowed.map((t) => ({
        value: t,
        label: onePayKybAccountTypeLabel(t),
      })),
    [kybAccountTypesAllowed],
  )

  if (!tenant) {
    return (
      <div className="mc-shell">
        <p className="ios-subhead">Cargando…</p>
      </div>
    )
  }

  if (modo !== 'pasarela_micatalogo') {
    return (
      <div className="mc-shell space-y-6 pb-28">
        <BackLink />
        <p className="text-[15px] text-[var(--cat-muted)]">
          El retiro manual solo está disponible con pasarela sin registro OnePay.
        </p>
        <Link to="/app/mi-saldo" className="font-medium underline underline-offset-2">
          Volver a mi saldo
        </Link>
      </div>
    )
  }

  async function submitSetup(e: React.FormEvent) {
    e.preventDefault()
    if (!idemRef.current) return

    const phoneNormalized = normalizeCoPhoneE164(phone)
    if (!phoneNormalized) {
      setErr('Teléfono inválido. Usá un móvil colombiano (ej. 3001234567).')
      return
    }
    if (!bankId) {
      setErr('Elegí un banco de la lista.')
      return
    }
    if (kybAccountTypesAllowed.length === 0) {
      setErr('El banco seleccionado no tiene tipos de cuenta disponibles.')
      return
    }

    setBusy(true)
    setErr(null)
    setOkMsg(null)
    const idempotencyNonce = freshIdempotencyNonce()
    idemRef.current = idempotencyNonce
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayMicatalogoSetupPayout')
      const res = (await fn({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phoneNormalized,
        document_type: documentType,
        document_number: documentNumber.trim(),
        bank_id: bankId,
        account_subtype: accountType,
        account_number: accountNumber.trim().replace(/\s+/g, ''),
        idempotencyNonce,
      })) as { data: { accountHint?: string } }
      const hint = res.data?.accountHint?.trim() || null
      setRegisteredAccountHint(hint)
      setSetupSuccessOpen(true)
      setStep('withdraw')
      idemRef.current = freshIdempotencyNonce()
    } catch (ex) {
      setErr(callableErrorMessage(ex))
    } finally {
      setBusy(false)
    }
  }

  async function submitWithdraw(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setOkMsg(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayMicatalogoRequestCashout')
      const amountRaw = withdrawAmount.replace(/\D/g, '')
      const payload: { idempotencyNonce: string; amount?: number } = {
        idempotencyNonce: idemRef.current ?? crypto.randomUUID(),
      }
      if (amountRaw) payload.amount = Number(amountRaw)
      const res = (await fn(payload)) as { data: { amountCop?: number } }
      const amt = res.data?.amountCop
      setOkMsg(
        amt
          ? `Solicitud enviada por ${formatCop(amt)}. El acreditamiento depende de tu banco.`
          : 'Solicitud de retiro enviada.',
      )
      setWithdrawAmount('')
      void loadBalance()
    } catch (ex) {
      setErr(callableErrorMessage(ex))
    } finally {
      setBusy(false)
    }
  }

  const previewAmount = withdrawAmount.replace(/\D/g, '')
    ? Number(withdrawAmount.replace(/\D/g, ''))
    : null
  const previewFee =
    previewAmount && previewAmount >= 10_000 ? pasarelaMicatalogoWithdrawalFeeCop(previewAmount) : null

  const accountHintDisplay = registeredAccountHint ?? tenant.onepayPayoutAccountHint ?? null

  return (
    <div className="mc-shell space-y-8 bg-neutral-100/45 pb-28 pt-1 sm:rounded-lg sm:px-6 sm:py-6">
      <OnepayRetiroPayoutSuccessModal
        open={setupSuccessOpen}
        accountHint={accountHintDisplay}
        onContinue={() => setSetupSuccessOpen(false)}
        onClose={() => {
          setSetupSuccessOpen(false)
          nav('/app/mi-saldo')
        }}
      />

      <div>
        <Link
          to="/app/mi-saldo"
          className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--cat-muted)] transition hover:text-[var(--cat-text)]"
        >
          <IconChevronLeft size={17} />
          Mi saldo
        </Link>
        <h1 className="mt-3 text-[1.65rem] font-medium leading-tight tracking-tight text-[var(--cat-text)]">
          Retirar fondos
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--cat-muted)]">
          Registrá tu cliente y cuenta bancaria en OnePay para recibir la dispersión del saldo.
        </p>
      </div>

      {okMsg && (
        <p className="border border-emerald-200/60 bg-emerald-50/40 px-4 py-3 text-[14px] text-emerald-950">{okMsg}</p>
      )}
      {err && (
        <p className="border border-amber-200/60 bg-amber-50/40 px-4 py-3 text-[14px] text-amber-950">{err}</p>
      )}

      {step === 'setup' ? (
        <form onSubmit={(e) => void submitSetup(e)} className={retiroPanelClass}>
          <div className={retiroSectionClass}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
              1 · Datos del beneficiario
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-[12px] text-[var(--cat-muted)]">Nombre</span>
                <input className={retiroFieldClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={busy} />
              </label>
              <label className="block space-y-1">
                <span className="text-[12px] text-[var(--cat-muted)]">Apellido</span>
                <input className={retiroFieldClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={busy} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-[12px] text-[var(--cat-muted)]">Correo</span>
              <input className={retiroFieldClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] text-[var(--cat-muted)]">Teléfono móvil</span>
              <input
                className={retiroFieldClass}
                inputMode="tel"
                placeholder="3001234567"
                value={phone}
                onChange={(e) => {
                  setPhoneTouched(true)
                  setPhone(e.target.value)
                }}
                required
                disabled={busy}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[12px] text-[var(--cat-muted)]">Tipo documento</label>
                <McOptionCombobox
                  value={documentType}
                  onChange={setDocumentType}
                  options={[...DOCUMENT_TYPE_OPTIONS]}
                  inputClassName={retiroFieldClass}
                  placeholder="Elegí tipo de documento…"
                  disabled={busy}
                />
              </div>
              <label className="block space-y-1">
                <span className="text-[12px] text-[var(--cat-muted)]">Número</span>
                <input className={retiroFieldClass} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required disabled={busy} />
              </label>
            </div>
          </div>

          <div className={retiroSectionClass}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
              2 · Cuenta bancaria
            </p>
            <div>
              <label className="text-[12px] text-[var(--cat-muted)]">Banco</label>
              <McOptionCombobox
                value={bankId}
                onChange={setBankId}
                options={bankOptions}
                inputClassName={retiroFieldClass}
                placeholder={banksLoading ? 'Cargando bancos…' : 'Buscar banco…'}
                emptyMessage={banksLoading ? 'Cargando bancos…' : 'Sin bancos'}
                required
                disabled={busy || banksLoading}
              />
            </div>
            <div>
              <label className="text-[12px] text-[var(--cat-muted)]">Tipo de cuenta</label>
              <McOptionCombobox
                value={accountType}
                onChange={(v) => {
                  if (isOnePayKybBankAccountType(v)) setAccountType(v)
                }}
                options={accountTypeOptions}
                inputClassName={retiroFieldClass}
                placeholder={bankId ? 'Elegí tipo de cuenta…' : 'Elegí un banco primero'}
                emptyMessage="Elegí un banco primero"
                required
                disabled={busy || !bankId || kybAccountTypesAllowed.length === 0}
              />
            </div>
            <label className="block space-y-1">
              <span className="text-[12px] text-[var(--cat-muted)]">Número de cuenta</span>
              <input className={retiroFieldClass} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required disabled={busy} />
            </label>
          </div>

          <button type="submit" className={retiroPrimaryBtnClass} disabled={busy || banksLoading}>
            {busy ? 'Guardando…' : 'Registrar cuenta para retiros'}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void submitWithdraw(e)} className={retiroPanelClass}>
          {(balanceLabel || accountHintDisplay || (availableNetCop !== null && availableNetCop < 10_000)) && (
            <div className={`${retiroInfoClass} space-y-2 text-[var(--cat-muted)]`}>
              {balanceLabel ? (
                <p>
                  Saldo disponible según tus ventas:{' '}
                  <strong className="text-[1.05rem] font-medium tabular-nums text-[var(--cat-text)]">{balanceLabel}</strong>
                </p>
              ) : null}
              {availableNetCop !== null && availableNetCop < 10_000 ? (
                <p className="text-[13px] text-amber-900">
                  Tu saldo disponible es menor al mínimo de retiro ($10.000).
                </p>
              ) : null}
              {accountHintDisplay ? (
                <p className="text-[13px]">
                  Cuenta destino: <span className="font-mono text-[var(--cat-text)]">{accountHintDisplay}</span>
                </p>
              ) : null}
            </div>
          )}
          <div className={retiroSectionClass}>
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[var(--cat-muted)]">Monto a retirar (COP)</span>
              <input
                className={`${retiroFieldClass} text-[17px] font-medium tabular-nums`}
                inputMode="numeric"
                placeholder="Vacío = saldo completo · mínimo $10.000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(formatWithdrawAmountInput(e.target.value))}
                disabled={busy}
              />
            </label>
            {previewFee !== null ? (
              <p className="rounded-md border border-neutral-200/40 bg-[var(--cat-surface)] px-3 py-2.5 text-[13px] text-[var(--cat-muted)]">
                Comisión del retiro (0,02% + {formatCop(PASARELA_MICATALOGO_WITHDRAWAL_FIXED_COP)} fijos):{' '}
                <strong className="text-amber-900">−{formatCop(previewFee)}</strong>
              </p>
            ) : null}
          </div>
          <div className="space-y-2.5 pt-1">
            <button type="submit" className={retiroCatBtnClass} disabled={busy}>
              {busy ? 'Procesando…' : 'Solicitar dispersión'}
            </button>
            <button type="button" className={retiroSecondaryBtnClass} disabled={busy} onClick={() => setStep('setup')}>
              Cambiar cuenta bancaria
            </button>
          </div>
        </form>
      )}

      <button
        type="button"
        className="max-w-xl rounded-md border border-transparent px-2 py-2.5 text-[14px] font-medium text-[var(--cat-muted)] transition hover:border-neutral-200/50 hover:bg-neutral-50/80 hover:text-[var(--cat-text)]"
        onClick={() => nav('/app/mi-saldo')}
      >
        Cancelar
      </button>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/app/mi-saldo"
      className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--cat-muted)] transition hover:text-[var(--cat-text)]"
    >
      <IconChevronLeft size={17} />
      Mi saldo
    </Link>
  )
}
