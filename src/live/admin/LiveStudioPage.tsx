import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import {
  liveEndSession,
  liveGetBrowserBroadcastConfig,
  livePinProduct,
  liveStartSession,
  liveUpdateProducts,
} from '@/live/lib/liveApi'
import { liveCallableErrorMessage } from '@/live/lib/liveCallableError'
import {
  LIVE_HOST_DISCONNECT_GRACE_MS,
  liveEndSessionKeepalive,
  liveEndSessionOnHostLeave,
} from '@/live/lib/liveHostDisconnect'
import { getAuthApp } from '@/lib/firebase'
import { useLiveSession } from '@/live/hooks/useLiveSession'
import { useLiveSessionProducts } from '@/live/hooks/useLiveSessionProducts'
import { useLiveChat } from '@/live/hooks/useLiveChat'
import { LiveProductPicker } from '@/live/admin/LiveProductPicker'
import { BrowserLiveBroadcaster } from '@/live/admin/BrowserLiveBroadcaster'
import { LiveVideoPlayer } from '@/live/viewer/LiveVideoPlayer'
import { IconSmartphone, IconVideoCamera } from '@/icons/McIcons'
import type { McLiveIngestMode, McProducto } from '@/types/mc'

type IngestTab = McLiveIngestMode

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border border-[var(--cat-muted)]/20 bg-[var(--cat-bg)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--cat-muted)]">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-xs text-[var(--cat-text)]">{value}</code>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 rounded-lg bg-[var(--cat-accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--cat-accent-text)]"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}

export function LiveStudioPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { effectiveTenantId } = useMcAuth()

  const { session, loading: sessionLoading } = useLiveSession(effectiveTenantId ?? undefined, sessionId)
  const { products: sessionProducts } = useLiveSessionProducts(effectiveTenantId ?? undefined, sessionId)
  const { messages } = useLiveChat(
    effectiveTenantId ?? undefined,
    sessionId,
    session?.status === 'live',
  )

  const [ingestTab, setIngestTab] = useState<IngestTab>('browser')
  const [browserAvailable, setBrowserAvailable] = useState<boolean | null>(null)
  const [catalogProducts, setCatalogProducts] = useState<McProducto[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  const sessionIdRef = useRef(sessionId)
  const browserBroadcastingRef = useRef(false)
  const browserLiveActiveRef = useRef(false)
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idTokenRef = useRef<string | null>(null)
  const studioMountGenRef = useRef(0)

  sessionIdRef.current = sessionId
  browserLiveActiveRef.current =
    session?.status === 'live' && session?.ingestMode === 'browser'

  const clearHostDisconnectTimer = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current)
      disconnectTimerRef.current = null
    }
  }, [])

  const scheduleHostDisconnectEnd = useCallback(() => {
    const sid = sessionIdRef.current
    if (!sid || !browserLiveActiveRef.current) return
    clearHostDisconnectTimer()
    disconnectTimerRef.current = setTimeout(() => {
      void liveEndSessionOnHostLeave(sid, 'disconnect_timeout')
    }, LIVE_HOST_DISCONNECT_GRACE_MS)
  }, [clearHostDisconnectTimer])

  const handleBroadcastingChange = useCallback(
    (active: boolean) => {
      browserBroadcastingRef.current = active
      if (active) clearHostDisconnectTimer()
    },
    [clearHostDisconnectTimer],
  )

  const handleBroadcasterError = useCallback((msg: string) => {
    setError(msg)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function refreshToken() {
      try {
        const token = await getAuthApp().currentUser?.getIdToken()
        if (!cancelled && token) idTokenRef.current = token
      } catch {
        /* ignore */
      }
    }
    if (session?.status === 'live' && session?.ingestMode === 'browser') {
      void refreshToken()
    }
    return () => {
      cancelled = true
    }
  }, [session?.status, session?.ingestMode])

  useEffect(() => {
    function onPageHide() {
      const sid = sessionIdRef.current
      if (!sid) return
      if (!browserBroadcastingRef.current && !browserLiveActiveRef.current) return
      const token = idTokenRef.current
      if (token) liveEndSessionKeepalive(sid, token, 'tab_close')
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [])

  useEffect(() => {
    const mountGen = ++studioMountGenRef.current
    return () => {
      clearHostDisconnectTimer()
      window.setTimeout(() => {
        if (studioMountGenRef.current !== mountGen) return
        const sid = sessionIdRef.current
        if (!sid) return
        if (browserBroadcastingRef.current || browserLiveActiveRef.current) {
          void liveEndSessionOnHostLeave(sid, 'host_left')
        }
      }, 120)
    }
  }, [clearHostDisconnectTimer])

  useEffect(() => {
    void liveGetBrowserBroadcastConfig()
      .then((r) => setBrowserAvailable(r.available))
      .catch(() => setBrowserAvailable(false))
  }, [])

  useEffect(() => {
    if (session?.ingestMode === 'obs' || session?.ingestMode === 'browser') {
      setIngestTab(session.ingestMode)
    }
  }, [session?.ingestMode])

  useEffect(() => {
    if (!effectiveTenantId) return
    const q = query(
      collection(getDb(), mcProductosCollection(effectiveTenantId)),
      orderBy('orden', 'asc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setCatalogProducts(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })),
      )
      setProductsLoading(false)
    })
    return () => unsub()
  }, [effectiveTenantId])

  useEffect(() => {
    setSelectedIds(sessionProducts.map((p) => p.productId))
  }, [sessionProducts])

  const saveProducts = useCallback(async () => {
    if (!sessionId) return
    setBusy('products')
    setError(null)
    try {
      await liveUpdateProducts(sessionId, selectedIds)
    } catch (e) {
      setError(liveCallableErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }, [sessionId, selectedIds])

  async function handleStartObs() {
    if (!sessionId) return
    setBusy('start')
    setError(null)
    try {
      await saveProducts()
      await liveStartSession(sessionId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar')
    } finally {
      setBusy(null)
    }
  }

  async function handleEnd() {
    if (!sessionId || !window.confirm('¿Terminar el live?')) return
    clearHostDisconnectTimer()
    setBusy('end')
    try {
      await liveEndSession(sessionId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo terminar')
    } finally {
      setBusy(null)
    }
  }

  async function handlePin(productId: string) {
    if (!sessionId) return
    const next = session?.featuredProductId === productId ? null : productId
    setBusy(`pin-${productId}`)
    try {
      await livePinProduct(sessionId, next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anclar')
    } finally {
      setBusy(null)
    }
  }

  async function copyShare() {
    if (!session?.shareUrl) return
    try {
      await navigator.clipboard.writeText(session.shareUrl)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (sessionLoading || !session) {
    return (
      <div className="mc-shell">
        <p className="text-sm text-[var(--cat-muted)]">Cargando estudio…</p>
      </div>
    )
  }

  const isLive = session.status === 'live'
  const isEnded = session.status === 'ended'
  const tabLocked = isLive || isEnded

  return (
    <div className="mc-shell pb-32">
      <Link to="/app/live" className="mb-4 inline-flex text-sm text-[var(--cat-muted)] hover:text-[var(--cat-text)]">
        ← Lives
      </Link>

      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{session.title}</h1>
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800">
              <span className="mc-live-pulse-dot scale-[0.6]" /> En vivo
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--cat-muted)]">
          {session.viewerCount} viendo · {session.purchaseCount} compras
          {session.streamActive ? ' · Señal conectada' : ''}
        </p>
      </header>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!isEnded && (
        <section className="mb-6 overflow-hidden rounded-2xl border border-[var(--cat-muted)]/15 bg-black">
          <LiveVideoPlayer
            playbackUrl={session.playbackUrl}
            isLive={isLive}
            streamActive={session.streamActive}
            isEnded={isEnded}
            className="aspect-[9/16] max-h-[280px] w-full sm:max-h-[320px]"
          />
        </section>
      )}

      {!isEnded && (
        <section className="mb-6 rounded-2xl border border-[var(--cat-muted)]/15 bg-[var(--cat-surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold">Cómo transmitir</h2>
          <div className="mb-4 flex rounded-xl bg-[var(--cat-bg)] p-1">
            <button
              type="button"
              disabled={tabLocked && ingestTab !== 'browser'}
              onClick={() => setIngestTab('browser')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition',
                ingestTab === 'browser'
                  ? 'bg-[var(--cat-surface)] text-[var(--cat-text)] shadow-sm'
                  : 'text-[var(--cat-muted)]',
              )}
            >
              <IconSmartphone size={16} aria-hidden />
              Navegador
            </button>
            <button
              type="button"
              disabled={tabLocked && ingestTab !== 'obs'}
              onClick={() => setIngestTab('obs')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition',
                ingestTab === 'obs'
                  ? 'bg-[var(--cat-surface)] text-[var(--cat-text)] shadow-sm'
                  : 'text-[var(--cat-muted)]',
              )}
            >
              <IconVideoCamera size={16} aria-hidden />
              OBS / Larix
            </button>
          </div>

          {ingestTab === 'browser' ? (
            browserAvailable === false ? (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                La transmisión desde navegador requiere configurar LiveKit en el servidor. Mientras
                tanto, usá la pestaña OBS / Larix con la app{' '}
                <a
                  href="https://larix.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  Larix Broadcaster
                </a>{' '}
                en el celular.
              </div>
            ) : (
              <>
                {!isLive && (
                  <p className="mb-3 text-xs text-[var(--cat-muted)]">
                    Guardá los productos y tocá transmitir. No necesitás instalar nada.
                  </p>
                )}
                <BrowserLiveBroadcaster
                  key={sessionId}
                  sessionId={sessionId!}
                  disabled={isEnded || busy === 'end'}
                  onBeforeStart={saveProducts}
                  onBroadcastingChange={handleBroadcastingChange}
                  onHostDisconnected={scheduleHostDisconnectEnd}
                  onError={handleBroadcasterError}
                />
              </>
            )
          ) : (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-[var(--cat-muted)]">
                Copiá estos datos en OBS, Streamlabs o Larix Broadcaster. Luego tocá «Ir en vivo» y
                conectá la transmisión.
              </p>
              <CopyField label="Servidor RTMP" value={session.ingestUrl} />
              <CopyField label="Stream key" value={session.streamKey} />
              <p className="text-[11px] text-[var(--cat-muted)]">
                Larix (iOS/Android): Settings → Connections → New connection → URL = servidor + key.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-[var(--cat-muted)]/15 bg-[var(--cat-surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Compartir link</h2>
        <div className="flex gap-2">
          <input
            readOnly
            value={session.shareUrl}
            className="min-w-0 flex-1 rounded-xl border border-[var(--cat-muted)]/20 bg-[var(--cat-bg)] px-3 py-2 text-xs"
          />
          <button
            type="button"
            onClick={() => void copyShare()}
            className="shrink-0 rounded-xl bg-[#c5a367] px-4 py-2 text-xs font-bold text-[#1c1b1f]"
          >
            {shareCopied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </section>

      {!isEnded && (
        <section className="mb-6 rounded-2xl border border-[var(--cat-muted)]/15 bg-[var(--cat-surface)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Productos en el live</h2>
            <button
              type="button"
              disabled={busy === 'products'}
              onClick={() => void saveProducts()}
              className="text-xs font-semibold text-[var(--cat-accent)]"
            >
              Guardar
            </button>
          </div>
          <LiveProductPicker
            products={catalogProducts}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            loading={productsLoading}
          />
        </section>
      )}

      {sessionProducts.length > 0 && !isEnded && isLive && (
        <section className="mb-6 rounded-2xl border border-[var(--cat-muted)]/15 bg-[var(--cat-surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold">Anclar en pantalla</h2>
          <ul className="space-y-2">
            {sessionProducts.map((sp) => {
              const pinned = session.featuredProductId === sp.productId
              return (
                <li key={sp.id}>
                  <button
                    type="button"
                    disabled={busy?.startsWith('pin-')}
                    onClick={() => void handlePin(sp.productId)}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                      pinned
                        ? 'border-[#c5a367] bg-[#c5a367]/10'
                        : 'border-[var(--cat-muted)]/15 hover:border-[var(--cat-muted)]/30',
                    )}
                  >
                    {sp.snapshot.imageUrl && (
                      <img src={sp.snapshot.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{sp.snapshot.nombre}</span>
                    <span className="text-xs font-bold text-[#c5a367]">{pinned ? 'Anclado' : 'Anclar'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {isLive && messages.length > 0 && (
        <section className="mb-6 rounded-2xl border border-[var(--cat-muted)]/15 bg-[var(--cat-surface)] p-4">
          <h2 className="mb-2 text-sm font-semibold">Chat en vivo</h2>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
            {messages.slice(-20).map((m) => (
              <li key={m.id} className="text-[var(--cat-muted)]">
                <strong className="text-[var(--cat-text)]">{m.displayName}</strong>{' '}
                {m.type === 'purchase' ? m.text : `: ${m.text}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-5 md:static md:mt-6 md:px-0">
        {!isEnded && !isLive && ingestTab === 'obs' && (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleStartObs()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-red-700 disabled:opacity-60"
          >
            <span className="mc-live-pulse-dot scale-75 bg-white" />
            {busy === 'start' ? 'Iniciando…' : 'Ir en vivo (OBS)'}
          </button>
        )}
        {isLive && (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleEnd()}
            className="w-full rounded-2xl border border-red-200 bg-red-50 py-3.5 text-sm font-semibold text-red-800"
          >
            Terminar live
          </button>
        )}
      </div>
    </div>
  )
}
