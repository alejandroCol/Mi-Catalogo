import { useMemo, useState, type ReactNode } from 'react'
import { httpsCallable } from 'firebase/functions'
import { Link } from 'react-router-dom'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { useMcAuth } from '@/auth/McAuthContext'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { hasAddiFeatureAccess } from '@/lib/addiAccess'
import { planMasterDisplayName } from '@/lib/billingAccess'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { IconBankCard } from '@/icons/McIcons'

/** Registro de comercio aliado Addi (Colombia). */
const ADDI_ALIADOS_SIGNUP_URL = 'https://co.addi.com/aliados'
const ADDI_PORTAL_URL = 'https://aliados.addi.com'

function callableErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return 'No se pudo guardar.'
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'ok' | 'warn' | 'muted'
  children: ReactNode
}) {
  const cls =
    tone === 'ok'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200/80'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-900 ring-amber-200/80'
        : 'bg-neutral-100 text-[var(--cat-muted)] ring-neutral-200/80'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${cls}`}>
      {children}
    </span>
  )
}

export function PagosAddiPage() {
  const { tenant } = useMcAuth()
  const { returnTo, returnLabel } = useConfigSubpageNav()
  const { platformSettings } = usePlatformSettings()
  const masterName = planMasterDisplayName(platformSettings)
  const canUse = hasAddiFeatureAccess(tenant)

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [allySlug, setAllySlug] = useState(tenant?.addiAllySlug ?? '')
  const [sandbox, setSandbox] = useState(tenant?.addiSandbox === true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const linked = tenant?.addiPaymentsEnabled === true || Boolean(tenant?.addiClientIdHint)
  const enabled = tenant?.addiPaymentsEnabled === true
  const hints = useMemo(
    () => ({
      clientId: tenant?.addiClientIdHint ? `····${tenant.addiClientIdHint}` : null,
      ally: tenant?.addiAllySlug || null,
    }),
    [tenant?.addiClientIdHint, tenant?.addiAllySlug],
  )

  async function saveCredentials(enableAfterSave: boolean) {
    setErr(null)
    setOkMsg(null)
    if (!firebaseConfigured) {
      setErr('Firebase no configurado.')
      return
    }
    if (!canUse) {
      setErr(`Addi requiere plan ${masterName} activo.`)
      return
    }
    if (!clientId.trim() || !clientSecret.trim() || !allySlug.trim()) {
      setErr('Completá Client ID, Client Secret y Ally slug.')
      return
    }
    setBusy(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcAddiLinkMerchant')
      const res = await fn({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        allySlug: allySlug.trim(),
        sandbox,
        enabled: enableAfterSave,
      })
      const data = res.data as { callbackCredentialsReady?: boolean }
      setClientSecret('')
      setOkMsg(
        data.callbackCredentialsReady
          ? 'Addi vinculado. Ya podés ofrecer cuotas en el checkout.'
          : 'Credenciales guardadas. Si el webhook falla, contactá a Addi para las callback credentials.',
      )
    } catch (e) {
      setErr(callableErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function setEnabled(next: boolean) {
    setErr(null)
    setOkMsg(null)
    setBusy(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcAddiSetEnabled')
      await fn({ enabled: next })
      setOkMsg(next ? 'Addi habilitado en el checkout.' : 'Addi deshabilitado en el checkout.')
    } catch (e) {
      setErr(callableErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function unlink() {
    setErr(null)
    setOkMsg(null)
    setBusy(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcAddiUnlinkMerchant')
      await fn({})
      setClientId('')
      setClientSecret('')
      setAllySlug('')
      setOkMsg('Addi desvinculado.')
    } catch (e) {
      setErr(callableErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfiguracionesSubpageLayout title="Addi · Cuotas" backTo={returnTo} backLabel={returnLabel}>
      <div className="space-y-4">
        <div className="mc-card space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--cat-accent)_12%,transparent)] text-[var(--cat-accent)]">
              <IconBankCard size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-semibold tracking-tight text-[var(--cat-text)]">Addi · Cuotas</h2>
                {canUse ? (
                  enabled ? (
                    <StatusPill tone="ok">Activo en checkout</StatusPill>
                  ) : linked ? (
                    <StatusPill tone="warn">Guardado · off</StatusPill>
                  ) : (
                    <StatusPill tone="muted">Sin vincular</StatusPill>
                  )
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">
                Tus clientes pagan a cuotas sin tarjeta. Addi liquida al comercio; Mi Catálogo solo confirma el pedido.
              </p>
            </div>
          </div>

          {!canUse ? (
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 px-4 py-3.5">
              <p className="text-[13px] font-semibold text-amber-950">Requiere plan {masterName}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-amber-900/85">
                Activá {masterName} con suscripción vigente para ofrecer Addi en tu checkout.
              </p>
              <Link
                to="/app/plan"
                className="mt-2.5 inline-flex text-[12px] font-semibold text-amber-950 underline underline-offset-2"
              >
                Ver planes
              </Link>
            </div>
          ) : (
            <>
              {hints.ally ? (
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--cat-text)_8%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_45%,var(--cat-surface)_55%)] px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
                    Comercio vinculado
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--cat-text)]">
                    <span className="font-medium">{hints.ally}</span>
                    {hints.clientId ? (
                      <span className="text-[var(--cat-muted)]"> · Client ID {hints.clientId}</span>
                    ) : null}
                    {tenant?.addiSandbox ? (
                      <span className="text-[var(--cat-muted)]"> · Sandbox</span>
                    ) : null}
                  </p>
                </div>
              ) : null}

              {linked ? (
                <McToggleSwitch
                  checked={enabled}
                  disabled={busy}
                  onChange={(v) => void setEnabled(v)}
                  label="Mostrar Addi en el checkout"
                  description="Si está apagado, las credenciales se conservan pero no se ofrece el pago."
                />
              ) : null}
            </>
          )}
        </div>

        {canUse ? (
          <>
            <div className="mc-card space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cat-muted)]">Paso 1</p>
                <h3 className="mt-1 text-[15px] font-semibold text-[var(--cat-text)]">Creá tu cuenta en Addi</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">
                  Registrate como aliado. Cuando te aprueben, Addi te envía Client ID, Client Secret y ally_slug por
                  correo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={ADDI_ALIADOS_SIGNUP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mc-btn-primary inline-flex items-center justify-center px-4 py-2.5 text-[13px] font-semibold"
                >
                  Crear cuenta en Addi
                </a>
                <a
                  href={ADDI_PORTAL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-200/80 bg-[var(--cat-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--cat-text)] transition hover:bg-neutral-50"
                >
                  Portal aliados
                </a>
              </div>
            </div>

            <div className="mc-card space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cat-muted)]">Paso 2</p>
                <h3 className="mt-1 text-[15px] font-semibold text-[var(--cat-text)]">Pegá tus credenciales</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">
                  Las guardamos cifradas en el servidor. Nunca van al documento público de la tienda.
                </p>
              </div>

              <div className="space-y-3.5">
                <label className="block">
                  <span className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Client ID</span>
                  <input
                    className="mc-input mt-1.5"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder={hints.clientId || 'Client ID de Addi'}
                    autoComplete="off"
                    disabled={busy}
                  />
                </label>
                <label className="block">
                  <span className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Client Secret</span>
                  <input
                    className="mc-input mt-1.5"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Client Secret de Addi"
                    autoComplete="new-password"
                    disabled={busy}
                  />
                </label>
                <label className="block">
                  <span className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Ally slug</span>
                  <input
                    className="mc-input mt-1.5"
                    value={allySlug}
                    onChange={(e) => setAllySlug(e.target.value)}
                    placeholder="ej. mi-tienda-ecommerce"
                    autoComplete="off"
                    disabled={busy}
                  />
                </label>

                <McToggleSwitch
                  checked={sandbox}
                  disabled={busy}
                  onChange={setSandbox}
                  label="Ambiente sandbox"
                  description="Usá solo para pruebas con credenciales de staging de Addi."
                />
              </div>

              {err ? (
                <p className="rounded-xl border border-red-200/70 bg-red-50/50 px-3.5 py-2.5 text-[13px] text-red-800">
                  {err}
                </p>
              ) : null}
              {okMsg ? (
                <p className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 px-3.5 py-2.5 text-[13px] text-emerald-900">
                  {okMsg}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveCredentials(true)}
                  className="mc-btn-primary inline-flex items-center justify-center px-4 py-3 text-[14px] font-semibold disabled:opacity-50"
                >
                  {busy ? 'Guardando…' : linked ? 'Actualizar y habilitar' : 'Guardar y habilitar'}
                </button>
                {linked ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void unlink()}
                    className="inline-flex items-center justify-center rounded-full border border-neutral-200/80 px-4 py-3 text-[14px] font-semibold text-[var(--cat-muted)] transition hover:border-red-200 hover:bg-red-50/40 hover:text-red-800 disabled:opacity-50"
                  >
                    Desvincular Addi
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </ConfiguracionesSubpageLayout>
  )
}
