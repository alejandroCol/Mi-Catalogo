import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getDb, getFirebaseFunctions } from '@/lib/firebase'
import { onepayCatalogWebhookUrl } from '@/lib/onepayCatalogWebhookUrl'
import { MC } from '@/lib/mcCollections'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import type { McTenant } from '@/types/mc'
import { IconChevronLeft, IconClipboard } from '@/icons/McIcons'

function callableErrorMessage(e: unknown): string {
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return 'No se pudo completar.'
}

export function SuperAdminTenantOnepayPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const { profile } = useMcAuth()
  const [tenant, setTenant] = useState<(McTenant & { id: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [onePaySk, setOnePaySk] = useState('')
  const [onePayWebhookSecret, setOnePayWebhookSecret] = useState('')
  const [onePayWebhookToken, setOnePayWebhookToken] = useState('')
  const [onePayPublicKey, setOnePayPublicKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [hookKHint, setHookKHint] = useState<string | null>(null)
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId || !firebaseConfigured) return
    setLoading(true)
    try {
      const snap = await getDoc(doc(getDb(), MC.tenants, tenantId))
      if (!snap.exists()) {
        setTenant(null)
        return
      }
      setTenant({ id: snap.id, ...(snap.data() as Omit<McTenant, 'id'>) })
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void load()
  }, [load])

  const kShown = hookKHint ?? tenant?.onpayWebHookK
  const webhookUrlFull = useMemo(
    () => (kShown ? onepayCatalogWebhookUrl(kShown) : ''),
    [kShown],
  )

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }
  if (!tenantId) {
    return <Navigate to="/superadmin" replace />
  }

  async function vincularOnepay() {
    if (!firebaseConfigured || !tenantId) return
    const k = onePaySk.trim()
    const wh = onePayWebhookSecret.trim()
    const wt = onePayWebhookToken.trim()
    const pk = onePayPublicKey.trim()
    if (!k.startsWith('sk_test_') && !k.startsWith('sk_live_')) {
      setMsg('La clave debe ser la API secret de OnePay (sk_test_… o sk_live_…).')
      return
    }
    setBusy(true)
    setMsg(null)
    setHookKHint(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayLinkMerchant')
      const res = (await fn(
        wh.length >= 8
          ? {
              secretKey: k,
              webhookSecret: wh,
              ...(wt.length >= 8 ? { webhookToken: wt } : {}),
              ...(pk.length >= 8 ? { publicKey: pk } : {}),
              targetTenantId: tenantId,
            }
          : {
              secretKey: k,
              ...(wt.length >= 8 ? { webhookToken: wt } : {}),
              ...(pk.length >= 8 ? { publicKey: pk } : {}),
              targetTenantId: tenantId,
            },
      )) as { data: { onpayWebHookK?: string; needWebhookSecret?: boolean } }
      setOnePaySk('')
      if (res.data?.onpayWebHookK) {
        setHookKHint(res.data.onpayWebHookK)
      }
      if (res.data?.needWebhookSecret) {
        setMsg(
          'Paso 1: clave API guardada. Copiá la URL de abajo, creá en OnePay un webhook a esa URL y pegá el Secreto del webhook.',
        )
      } else {
        setOnePayWebhookSecret('')
        setOnePayWebhookToken('')
        setOnePayPublicKey('')
        setMsg('OnePay activo para esta tienda.')
      }
      await load()
    } catch (e) {
      setMsg(callableErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function completarWebhookOnepay() {
    if (!firebaseConfigured || !tenantId) return
    const wh = onePayWebhookSecret.trim()
    const wt = onePayWebhookToken.trim()
    const pk = onePayPublicKey.trim()
    if (wh.length < 8) {
      setMsg('Pegá el Secreto del webhook (whsec_…).')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepaySetWebhookSecret')
      await fn({
        webhookSecret: wh,
        ...(wt.length >= 8 ? { webhookToken: wt } : {}),
        ...(pk.length >= 8 ? { publicKey: pk } : {}),
        targetTenantId: tenantId,
      })
      setOnePayWebhookSecret('')
      setOnePayWebhookToken('')
      setOnePayPublicKey('')
      setMsg('Webhook guardado y pasarela activada.')
      await load()
    } catch (e) {
      setMsg(callableErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function desvincularOnepay() {
    if (!firebaseConfigured || !tenantId || !window.confirm('¿Quitar OnePay de esta tienda?')) return
    setBusy(true)
    setMsg(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayUnlinkMerchant')
      await fn({ targetTenantId: tenantId })
      setMsg('OnePay desvinculado.')
      setHookKHint(null)
      await load()
    } catch (e) {
      setMsg(callableErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function copiarWebhookUrl() {
    if (!webhookUrlFull || !navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(webhookUrlFull)
      setWebhookUrlCopied(true)
      window.setTimeout(() => setWebhookUrlCopied(false), 2200)
    } catch {
      setMsg('No se pudo copiar. Copiá la URL manualmente.')
    }
  }

  return (
    <div className="mc-shell space-y-6 pb-32">
      <Link
        to="/superadmin"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
      >
        <IconChevronLeft size={18} />
        Volver a tiendas
      </Link>

      <div>
        <h1 className="ios-large-title">OnePay · tienda</h1>
        {loading ? (
          <p className="ios-subhead mt-2 text-mc-600">Cargando…</p>
        ) : tenant ? (
          <p className="ios-subhead mt-2 text-mc-600">
            <strong className="text-mc-900">{tenant.nombreTienda}</strong> ·{' '}
            <span className="font-mono text-[13px]">/{tenant.slug}</span>
          </p>
        ) : (
          <p className="ios-subhead mt-2 text-red-700">Tienda no encontrada.</p>
        )}
      </div>

      {!tenant || loading ? null : (
        <div className="mc-card border border-neutral-200/70 bg-neutral-50/40 space-y-2 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-mc-500">Estado KYB en la tienda</p>
          <p className="text-[15px] text-mc-900">
            <strong>{tenant.onepayKybStatus ?? '—'}</strong>
            {tenant.onepayCompanyId ? (
              <>
                {' '}
                · empresa <span className="font-mono text-[13px]">{tenant.onepayCompanyId}</span>
              </>
            ) : null}
          </p>
          <p className="ios-footnote leading-relaxed text-mc-600">
            El dueño solicita empresa desde Mi Catálogo. En{' '}
            <Link className="font-medium text-mc-900 underline decoration-neutral-300 underline-offset-2" to="/superadmin">
              Súper admin
            </Link>{' '}
            marcás KYB como aprobada o rechazada. En esta página solo se cargan la clave{' '}
            <strong className="text-mc-900">API </strong>
            del comerciante y el <strong className="text-mc-900">webhook</strong>, que son lo que terminan autorizando a la tienda
            a usar la pasarela en el checkout.
          </p>
          {tenant.onepayKybStatus === 'pending' ? (
            <p className="border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-[13px] leading-relaxed text-amber-950">
              KYB marcada pendiente — conviene tener el OK real en OnePay antes de cargar cobros aquí.
            </p>
          ) : null}
          {tenant.onepayKybStatus === 'rejected' ? (
            <p className="border border-red-200/70 bg-red-50/35 px-3 py-2 text-[13px] leading-relaxed text-red-950">
              KYB marcada rechazada. Revisá con el vendedor antes de vincular cobros con esta cuenta.
            </p>
          ) : null}
        </div>
      )}

      {!tenant || loading ? null : (
        <div className="mc-card space-y-5">
          <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
            Credenciales de comercio en{' '}
            <a
              href="https://docs.onepay.la/client/payments/index"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4"
            >
              OnePay
            </a>
            . La misma URL base de webhook con <code className="rounded bg-mc-100 px-1 text-[12px]">?k=</code> por tienda.
            Documentación firma:{' '}
            <a
              href="https://docs.onepay.la/client/webhooks/index"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--cat-text)] underline"
            >
              x-onepay-signature
            </a>
            .
          </p>

          {kShown ? (
            <div className="rounded-md border border-neutral-200/60 bg-mc-50/40 px-3 py-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-mc-500">
                  URL del webhook (OnePay → esta tienda)
                </p>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-md border border-neutral-200/75 bg-white/80 px-3 py-2 text-[13px] font-medium text-mc-900 transition hover:bg-neutral-50"
                  onClick={() => void copiarWebhookUrl()}
                >
                  <IconClipboard size={16} />
                  {webhookUrlCopied ? 'Copiado' : 'Copiar URL'}
                </button>
              </div>
              <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-mc-800">{webhookUrlFull}</p>
            </div>
          ) : null}

          {tenant.onepayPaymentsEnabled ? (
            <div className="space-y-3">
              <p className="ios-subhead text-[13px] leading-relaxed text-emerald-800">
                Pasarela activa
                {tenant.onepayKeyHint ? <> · API ···{tenant.onepayKeyHint}</> : null}
                {tenant.onepayWebhookHint ? <> · whsec ···{tenant.onepayWebhookHint}</> : null}
                {tenant.onepayWebhookTokenHint ? <> · wh_hdr ···{tenant.onepayWebhookTokenHint}</> : null}
                {tenant.onepayPublicKeyHint ? <> · pk ···{tenant.onepayPublicKeyHint}</> : null}
              </p>
              <button
                type="button"
                className="mc-btn-secondary w-full py-2.5 text-[14px]"
                disabled={busy}
                onClick={() => void desvincularOnepay()}
              >
                {busy ? 'Quitando…' : 'Desvincular OnePay'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[12px] font-medium text-mc-700">Paso 1 · Clave API</p>
                <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">sk_test_… o sk_live_…</label>
                <input
                  type="password"
                  className="mc-input mt-1 py-2.5 font-mono text-[14px]"
                  autoComplete="off"
                  placeholder="sk_test_…"
                  value={onePaySk}
                  disabled={busy}
                  onChange={(e) => setOnePaySk(e.target.value)}
                />
                <button
                  type="button"
                  className="mc-btn-primary mt-2 w-full py-2.5 text-[14px]"
                  disabled={busy || !onePaySk.trim()}
                  onClick={() => void vincularOnepay()}
                >
                  {busy ? 'Guardando…' : 'Guardar clave API'}
                </button>
                <p className="mt-1.5 text-[11px] leading-relaxed text-mc-500">
                  Podés enviar también el secreto del webhook junto con la clave (rellená el paso 2).
                </p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-mc-700">Paso 2 · Webhook OnePay</p>
                <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                  Secreto HMAC (<span className="font-mono">whsec_…</span>, al crear el webhook)
                </label>
                <input
                  type="password"
                  className="mc-input mt-1 py-2.5 font-mono text-[14px]"
                  autoComplete="off"
                  placeholder="whsec_…"
                  value={onePayWebhookSecret}
                  disabled={busy}
                  onChange={(e) => setOnePayWebhookSecret(e.target.value)}
                />
                <label className="ios-footnote mt-3 block font-medium text-[var(--cat-text)] opacity-80">
                  Header / token (<span className="font-mono">wh_hdr_…</span> → cabecera{' '}
                  <span className="font-mono">x-webhook-token</span>)
                </label>
                <input
                  type="password"
                  className="mc-input mt-1 py-2.5 font-mono text-[14px]"
                  autoComplete="off"
                  placeholder="wh_hdr_…"
                  value={onePayWebhookToken}
                  disabled={busy}
                  onChange={(e) => setOnePayWebhookToken(e.target.value)}
                />
                <label className="ios-footnote mt-3 block font-medium text-[var(--cat-text)] opacity-80">
                  Clave pública opcional (<span className="font-mono">pk_test_…</span> /{' '}
                  <span className="font-mono">pk_live_…</span>)
                </label>
                <input
                  type="password"
                  className="mc-input mt-1 py-2.5 font-mono text-[14px]"
                  autoComplete="off"
                  placeholder="pk_test_…"
                  value={onePayPublicKey}
                  disabled={busy}
                  onChange={(e) => setOnePayPublicKey(e.target.value)}
                />
                {(tenant.onepayKeyHint || hookKHint) &&
                !tenant.onepayPaymentsEnabled &&
                (tenant.onpayWebHookK || hookKHint) ? (
                  <button
                    type="button"
                    className="mc-btn-secondary mt-2 w-full border-mc-300 py-2.5 text-[14px]"
                    disabled={busy || onePayWebhookSecret.trim().length < 8}
                    onClick={() => void completarWebhookOnepay()}
                  >
                    {busy ? 'Activando…' : 'Activar con este secreto'}
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <p className="ios-footnote text-[var(--cat-muted)]">
            Cloud Function <code className="rounded bg-mc-100 px-1 text-[12px]">mcOnepayCatalogWebhook</code> · región{' '}
            <code className="rounded bg-mc-100 px-1 text-[12px]">VITE_FIREBASE_FUNCTIONS_REGION</code>.
          </p>
          {msg && <p className="text-[15px] text-[var(--cat-text)]">{msg}</p>}
        </div>
      )}
    </div>
  )
}
