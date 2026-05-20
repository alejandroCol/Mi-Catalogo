import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getDb, getFirebaseFunctions } from '@/lib/firebase'
import { onepayCatalogWebhookUrl } from '@/lib/onepayCatalogWebhookUrl'
import { MC } from '@/lib/mcCollections'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import type { McPlatformSettings } from '@/types/mc'
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

export function SuperAdminPasarelaMicatalogoPage() {
  const { profile } = useMcAuth()
  const [settings, setSettings] = useState<McPlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [onePaySk, setOnePaySk] = useState('')
  const [onePayWebhookSecret, setOnePayWebhookSecret] = useState('')
  const [onePayWebhookToken, setOnePayWebhookToken] = useState('')
  const [onePayPublicKey, setOnePayPublicKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [hookKHint, setHookKHint] = useState<string | null>(null)
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false)
  const [captureRouteId, setCaptureRouteId] = useState('ggMoeO2K3G')

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    try {
      const snap = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
      const data = snap.exists() ? (snap.data() as McPlatformSettings) : {}
      setSettings(data)
      setCaptureRouteId(data.onepayCaptureRouteId?.trim() || 'ggMoeO2K3G')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const kShown = hookKHint ?? settings?.onpayWebHookK
  const webhookUrlFull = useMemo(
    () => (kShown ? onepayCatalogWebhookUrl(kShown) : ''),
    [kShown],
  )

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }

  async function vincularPlataforma() {
    if (!firebaseConfigured) return
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
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayLinkPlatformPasarela')
      const res = (await fn(
        wh.length >= 8
          ? {
              secretKey: k,
              webhookSecret: wh,
              ...(wt.length >= 8 ? { webhookToken: wt } : {}),
              ...(pk.length >= 8 ? { publicKey: pk } : {}),
            }
          : {
              secretKey: k,
              ...(wt.length >= 8 ? { webhookToken: wt } : {}),
              ...(pk.length >= 8 ? { publicKey: pk } : {}),
            },
      )) as { data: { onpayWebHookK?: string; needWebhookSecret?: boolean } }
      setOnePaySk('')
      if (res.data?.onpayWebHookK) {
        setHookKHint(res.data.onpayWebHookK)
      }
      if (res.data?.needWebhookSecret) {
        setMsg(
          'Paso 1: clave API guardada. Copiá la URL de abajo, creá en OnePay un webhook apuntando a esa URL y pegá el Secreto del webhook.',
        )
      } else {
        setOnePayWebhookSecret('')
        setOnePayWebhookToken('')
        setOnePayPublicKey('')
        setMsg('Pasarela Mi Catálogo activa.')
      }
      await load()
    } catch (e) {
      setMsg(callableErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function completarWebhook() {
    if (!firebaseConfigured) return
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
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepaySetPlatformWebhookSecret')
      await fn({
        webhookSecret: wh,
        ...(wt.length >= 8 ? { webhookToken: wt } : {}),
        ...(pk.length >= 8 ? { publicKey: pk } : {}),
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

  async function desvincular() {
    if (!firebaseConfigured || !window.confirm('¿Quitar la pasarela Mi Catálogo? Las tiendas en modo “sin registro” dejarán de cobrar en línea.'))
      return
    setBusy(true)
    setMsg(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayUnlinkPlatformPasarela')
      await fn({})
      setMsg('Pasarela Mi Catálogo desvinculada.')
      setHookKHint(null)
      await load()
    } catch (e) {
      setMsg(callableErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function guardarCaptureRoute() {
    if (!firebaseConfigured) return
    const id = captureRouteId.trim()
    if (!id) {
      setMsg('Ingresá el ID de ruta FTCaptures.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      await setDoc(
        doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc),
        { onepayCaptureRouteId: id, updatedAt: Date.now() },
        { merge: true },
      )
      setMsg('Ruta de captura guardada.')
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

  const activa = settings?.pasarelaMicatalogoActiva === true

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
        <h1 className="ios-large-title">Pasarela Mi Catálogo</h1>
        <p className="ios-subhead mt-2 max-w-2xl text-mc-600">
          Cuenta OnePay de la <strong className="text-mc-900">plataforma</strong> para que las tiendas puedan cobrar sin
          registrar su propio comercio. En cada webhook de pago, OnePay incluye metadata con el{' '}
          <strong className="text-mc-900">store id</strong> de la tienda (<code className="rounded bg-mc-100 px-1 text-[12px]">mi_catalogo_store_id</code>
          ).
        </p>
      </div>

      <div className="mc-card space-y-2 border border-neutral-200/70 bg-neutral-50/40 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-mc-500">Estado</p>
        {loading ? (
          <p className="text-mc-600">Cargando…</p>
        ) : activa ? (
          <p className="text-[15px] text-emerald-800">
            <strong>Activa</strong>
            {settings?.onepayKeyHint ? <> · API ···{settings.onepayKeyHint}</> : null}
            {settings?.onepayWebhookHint ? <> · whsec ···{settings.onepayWebhookHint}</> : null}
            {settings?.onepayWebhookTokenHint ? <> · wh_hdr ···{settings.onepayWebhookTokenHint}</> : null}
            {settings?.onepayPublicKeyHint ? <> · pk ···{settings.onepayPublicKeyHint}</> : null}
          </p>
        ) : (
          <p className="text-[15px] text-mc-800">
            <strong>Inactiva</strong> — cargá clave API y webhook para habilitar el modo “sin registro” en las tiendas.
          </p>
        )}
      </div>

      <div className="mc-card space-y-5">
        <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
          Es la misma URL{' '}
          <code className="rounded bg-mc-100 px-1 text-[12px]">mcOnepayCatalogWebhook</code> con un{' '}
          <code className="rounded bg-mc-100 px-1 text-[12px]">?k=</code> distinto al de cada comercio. En OnePay creá
          un webhook que apunte a esta URL; el cuerpo del evento referencia el pago y en metadata va el id de tienda. Más
          info:{' '}
          <a
            href="https://docs.onepay.la/client/webhooks/index"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline decoration-neutral-300 underline-offset-4"
          >
            verificación de firma
          </a>
          .
        </p>

        {kShown ? (
          <div className="rounded-md border border-neutral-200/60 bg-mc-50/40 px-3 py-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-mc-500">
                URL del webhook (OnePay → Mi Catálogo)
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

        <div className="space-y-2 border-t border-neutral-200/60 pt-4">
          <p className="text-[12px] font-medium text-mc-700">Suscripciones in-app (FTCaptures)</p>
          <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
            ID de ruta OnePay Elements
          </label>
          <input
            className="mc-input mt-1 font-mono text-[14px]"
            value={captureRouteId}
            disabled={busy}
            onChange={(e) => setCaptureRouteId(e.target.value)}
            placeholder="ggMoeO2K3G"
          />
          <button
            type="button"
            className="mc-btn-secondary mt-2 w-full py-2.5 text-[14px]"
            disabled={busy}
            onClick={() => void guardarCaptureRoute()}
          >
            Guardar ruta de captura
          </button>
        </div>

        {activa ? (
          <div className="space-y-3">
            <button
              type="button"
              className="mc-btn-secondary w-full py-2.5 text-[14px]"
              disabled={busy}
              onClick={() => void desvincular()}
            >
              {busy ? 'Quitando…' : 'Desvincular pasarela plataforma'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-medium text-mc-700">Paso 1 · Clave API (comercio plataforma)</p>
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
                onClick={() => void vincularPlataforma()}
              >
                {busy ? 'Guardando…' : 'Guardar clave API'}
              </button>
              <p className="mt-1.5 text-[11px] leading-relaxed text-mc-500">
                Podés pegar el secreto del webhook en el paso 2 en el mismo envío.
              </p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-mc-700">Paso 2 · Webhook OnePay</p>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Secreto HMAC (<span className="font-mono">whsec_…</span>)
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
                Header / token (<span className="font-mono">wh_hdr_…</span> →{' '}
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
              {(settings?.onepayKeyHint || hookKHint) && !activa && kShown ? (
                <button
                  type="button"
                  className="mc-btn-secondary mt-2 w-full border-mc-300 py-2.5 text-[14px]"
                  disabled={busy || onePayWebhookSecret.trim().length < 8}
                  onClick={() => void completarWebhook()}
                >
                  {busy ? 'Activando…' : 'Activar con este secreto'}
                </button>
              ) : null}
            </div>
          </div>
        )}

        <p className="ios-footnote text-[var(--cat-muted)]">
          Callables:{' '}
          <code className="rounded bg-mc-100 px-1 text-[12px]">mcOnepayLinkPlatformPasarela</code> ·{' '}
          <code className="rounded bg-mc-100 px-1 text-[12px]">mcOnepaySetPlatformWebhookSecret</code> · región{' '}
          <code className="rounded bg-mc-100 px-1 text-[12px]">VITE_FIREBASE_FUNCTIONS_REGION</code>.
        </p>
        {msg && <p className="text-[15px] text-[var(--cat-text)]">{msg}</p>}
      </div>
    </div>
  )
}
