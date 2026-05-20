import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import {
  ONEPAY_KYB_ACCOUNT_TYPES_ORDER,
  isOnePayKybBankAccountType,
  onePayKybAccountTypeLabel,
  type OnePayKybBankAccountType,
} from '@/lib/onepayKyb'
import { pasarelaMicatalogoWithdrawalFeeCop } from '@/lib/pasarelaFees'
import { IconChevronLeft } from '@/icons/McIcons'

function callableErrorMessage(e: unknown): string {
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return 'No se pudo completar la operación.'
}

type KybBankRow = { id: string; name: string; supported_types: string[] }

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
  const [balanceLabel, setBalanceLabel] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
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
    if (!tenant?.whatsappNumero) return
    const d = tenant.whatsappNumero.replace(/\D/g, '')
    if (d.length >= 10 && !phone) setPhone(`+${d}`)
  }, [tenant?.whatsappNumero, phone])

  const loadBalance = useCallback(async () => {
    if (!firebaseConfigured) return
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepaySellerSaldoSummary')
      const res = (await fn({})) as {
        data: { balance?: { balance_label?: string; balance?: number } }
      }
      const bl = res.data?.balance?.balance_label
      setBalanceLabel(typeof bl === 'string' && bl.trim() ? bl.trim() : null)
    } catch {
      setBalanceLabel(null)
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
    setBusy(true)
    setErr(null)
    setOkMsg(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayMicatalogoSetupPayout')
      await fn({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        document_type: documentType,
        document_number: documentNumber,
        bank_id: bankId,
        account_subtype: accountType,
        account_number: accountNumber,
        idempotencyNonce: idemRef.current,
      })
      setStep('withdraw')
      setOkMsg('Cuenta registrada. Ya podés solicitar el retiro.')
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

  return (
    <div className="mc-shell space-y-8 pb-28">
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
          Registrá tu cliente y cuenta bancaria en OnePay para recibir la dispersión del saldo, según{' '}
          <a
            href="https://docs.onepay.la/client/balance/cashout"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[var(--cat-text)] underline underline-offset-2"
          >
            solicitar dispersión
          </a>
          .
        </p>
      </div>

      {okMsg && (
        <p className="border border-emerald-200/60 bg-emerald-50/40 px-4 py-3 text-[14px] text-emerald-950">{okMsg}</p>
      )}
      {err && (
        <p className="border border-amber-200/60 bg-amber-50/40 px-4 py-3 text-[14px] text-amber-950">{err}</p>
      )}

      {step === 'setup' ? (
        <form onSubmit={(e) => void submitSetup(e)} className="mc-card max-w-xl space-y-4">
          <p className="text-[14px] font-medium text-[var(--cat-text)]">1 · Datos del beneficiario</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[12px] text-[var(--cat-muted)]">Nombre</span>
              <input className="mc-input w-full" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={busy} />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] text-[var(--cat-muted)]">Apellido</span>
              <input className="mc-input w-full" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={busy} />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[12px] text-[var(--cat-muted)]">Correo</span>
            <input className="mc-input w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
          </label>
          <label className="block space-y-1">
            <span className="text-[12px] text-[var(--cat-muted)]">Teléfono (+57…)</span>
            <input className="mc-input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={busy} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[12px] text-[var(--cat-muted)]">Tipo documento</span>
              <select className="mc-input w-full" value={documentType} onChange={(e) => setDocumentType(e.target.value)} disabled={busy}>
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="NIT">NIT</option>
                <option value="PASSPORT">Pasaporte</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] text-[var(--cat-muted)]">Número</span>
              <input className="mc-input w-full" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required disabled={busy} />
            </label>
          </div>

          <p className="border-t border-neutral-200/50 pt-4 text-[14px] font-medium text-[var(--cat-text)]">2 · Cuenta bancaria</p>
          <label className="block space-y-1">
            <span className="text-[12px] text-[var(--cat-muted)]">Banco</span>
            <select
              className="mc-input w-full"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              required
              disabled={busy || banksLoading}
            >
              <option value="">{banksLoading ? 'Cargando bancos…' : 'Elegí un banco'}</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[12px] text-[var(--cat-muted)]">Tipo de cuenta</span>
            <select
              className="mc-input w-full"
              value={accountType}
              onChange={(e) => {
                const v = e.target.value
                if (isOnePayKybBankAccountType(v)) setAccountType(v)
              }}
              disabled={busy}
            >
              {kybAccountTypesAllowed.map((t) => (
                <option key={t} value={t}>
                  {onePayKybAccountTypeLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[12px] text-[var(--cat-muted)]">Número de cuenta</span>
            <input className="mc-input w-full" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required disabled={busy} />
          </label>

          <button type="submit" className="mc-btn-primary w-full" disabled={busy}>
            {busy ? 'Guardando…' : 'Registrar cuenta para retiros'}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void submitWithdraw(e)} className="mc-card max-w-xl space-y-4">
          {balanceLabel ? (
            <p className="text-[14px] text-[var(--cat-muted)]">
              Saldo disponible: <strong className="text-[var(--cat-text)]">{balanceLabel}</strong>
            </p>
          ) : null}
          {tenant.onepayPayoutAccountHint ? (
            <p className="text-[13px] text-[var(--cat-muted)]">
              Cuenta destino: <span className="font-mono">{tenant.onepayPayoutAccountHint}</span>
            </p>
          ) : null}
          <label className="block space-y-1">
            <span className="text-[12px] text-[var(--cat-muted)]">Monto a retirar (COP)</span>
            <input
              className="mc-input w-full"
              inputMode="numeric"
              placeholder="Vacío = saldo completo · mínimo $10.000"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={busy}
            />
          </label>
          {previewFee !== null ? (
            <p className="text-[13px] text-[var(--cat-muted)]">
              Comisión estimada del retiro: <strong className="text-amber-900">−{formatCop(previewFee)}</strong>
            </p>
          ) : null}
          <button type="submit" className="mc-btn-cat w-full py-3.5 font-semibold uppercase tracking-[0.1em]" disabled={busy}>
            {busy ? 'Procesando…' : 'Solicitar dispersión'}
          </button>
          <button
            type="button"
            className="mc-btn-secondary w-full text-[14px]"
            disabled={busy}
            onClick={() => setStep('setup')}
          >
            Cambiar cuenta bancaria
          </button>
        </form>
      )}

      <button
        type="button"
        className="text-[14px] font-medium text-[var(--cat-muted)] underline underline-offset-2"
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
