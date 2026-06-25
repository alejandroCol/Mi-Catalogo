import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { liveJoinViewer } from '@/live/lib/liveApi'
import { useLiveSession } from '@/live/hooks/useLiveSession'
import { useLiveSessionProducts } from '@/live/hooks/useLiveSessionProducts'
import {
  getLiveViewerDisplayName,
  getLiveViewerSessionId,
  useLiveChat,
} from '@/live/hooks/useLiveChat'
import { LiveVideoPlayer } from '@/live/viewer/LiveVideoPlayer'
import { LiveFeaturedProductCard } from '@/live/viewer/LiveFeaturedProductCard'
import { LiveChatPanel } from '@/live/viewer/LiveChatPanel'
import { LiveQuickBuySheet } from '@/live/viewer/LiveQuickBuySheet'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicStore } from '@/public/PublicStoreContext'
import { usePublicTenantId } from '@/public/usePublicTenantId'
import { trackMcEvent } from '@/lib/mcAnalytics'
import type { McLiveSessionProduct } from '@/types/mc'

export function LiveViewerPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { slug, to, pathBase } = usePublicStore()
  const { tenantId, loading: tenantIdLoading, error: tenantIdError } = usePublicTenantId(slug)
  const { tenant } = useCatalogTenant()

  const { session, loading: sessionLoading, error: sessionError } = useLiveSession(
    tenantId ?? undefined,
    sessionId,
  )
  const { products } = useLiveSessionProducts(tenantId ?? undefined, sessionId)
  const chatEnabled = session?.chatEnabled !== false && session?.status === 'live'
  const { messages } = useLiveChat(tenantId ?? undefined, sessionId, chatEnabled)

  const [displayName] = useState(getLiveViewerDisplayName)
  const [buyProduct, setBuyProduct] = useState<McLiveSessionProduct | null>(null)
  const [productEntering, setProductEntering] = useState(false)
  const [prevFeaturedId, setPrevFeaturedId] = useState<string | null>(null)

  const featuredProduct = useMemo(() => {
    if (!session?.featuredProductId) return null
    return products.find((p) => p.productId === session.featuredProductId) ?? null
  }, [products, session?.featuredProductId])

  useEffect(() => {
    if (session?.featuredProductId && session.featuredProductId !== prevFeaturedId) {
      setPrevFeaturedId(session.featuredProductId)
      setProductEntering(true)
      const t = window.setTimeout(() => setProductEntering(false), 500)
      return () => window.clearTimeout(t)
    }
  }, [session?.featuredProductId, prevFeaturedId])

  useEffect(() => {
    if (!slug || !sessionId || !session || session.status === 'draft') return
    const viewerSessionId = getLiveViewerSessionId(sessionId)
    void liveJoinViewer(slug, sessionId, viewerSessionId).catch(() => {})
    void trackMcEvent('live_view', { store_slug: slug, session_id: sessionId })
  }, [slug, sessionId, session?.status])

  const isLive = session?.status === 'live'
  const isEnded = session?.status === 'ended'
  const streamActive = session?.streamActive === true
  const playbackUrl =
    isEnded && session?.recordingUrl ? session.recordingUrl : session?.playbackUrl ?? ''

  const loading = tenantIdLoading || sessionLoading
  const pageError = tenantIdError ?? sessionError

  if (loading) {
    return (
      <div className="mc-live-page flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="mc-live-pulse-dot mx-auto mb-4 scale-125" />
          <p className="text-sm text-white/70">Conectando al live…</p>
        </div>
      </div>
    )
  }

  if (pageError || !session) {
    return (
      <div className="mc-live-page flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center">
        <p className="text-white/90">{pageError ?? 'Live no disponible'}</p>
        <p className="mt-2 max-w-sm text-xs text-white/50">
          {session?.status === 'draft'
            ? 'El host todavía no inició la transmisión.'
            : 'Verificá que el link sea correcto y que el live esté en curso.'}
        </p>
        <Link to={pathBase || '/'} className="mt-4 text-sm text-[#c5a367] underline">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  if (session.status === 'draft' || session.status === 'scheduled') {
    return (
      <div className="mc-live-page flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center">
        <div className="mc-live-pulse-dot mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-white">{session.title}</h1>
        <p className="mt-2 text-sm text-white/60">El live comenzará pronto. Actualizá esta página.</p>
        <Link to={pathBase || '/'} className="mt-6 text-sm text-[#c5a367] underline">
          Ver catálogo mientras tanto
        </Link>
      </div>
    )
  }

  const posterUrl = tenant?.storeLogoUrl

  return (
    <div className="mc-live-page relative h-[100dvh] w-full overflow-hidden bg-black">
      <LiveVideoPlayer
        playbackUrl={playbackUrl}
        posterUrl={posterUrl}
        isLive={isLive && !isEnded}
        streamActive={streamActive}
        isEnded={isEnded}
        allowAudioUnlock
        className="absolute inset-0 h-full w-full"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      <header className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          {isLive && !isEnded && (
            <span className="mc-live-badge flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <span className="mc-live-badge-dot h-1.5 w-1.5 rounded-full bg-white" />
              En vivo
            </span>
          )}
          {isEnded && (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/90">
              Finalizado
            </span>
          )}
          <span className="text-xs font-medium text-white/75">
            {session.viewerCount > 0 ? `${session.viewerCount} viendo` : 'Live shopping'}
          </span>
        </div>
        <Link
          to={pathBase || '/'}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/55"
          aria-label="Salir del live"
        >
          ✕
        </Link>
      </header>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {chatEnabled && (
          <LiveChatPanel
            messages={messages}
            slug={slug ?? ''}
            sessionId={sessionId ?? ''}
            displayName={displayName}
            enabled={chatEnabled}
          />
        )}

        {featuredProduct && isLive && (
          <div className="pointer-events-auto px-3 pb-2 pt-2">
            <LiveFeaturedProductCard
              product={featuredProduct}
              pinned
              entering={productEntering}
              onBuy={() => setBuyProduct(featuredProduct)}
            />
          </div>
        )}

        {isEnded && (
          <div className="pointer-events-auto mx-3 mb-3 rounded-2xl bg-black/50 p-4 text-center backdrop-blur-xl">
            <p className="text-sm font-medium text-white">Este live terminó</p>
            <Link
              to={to('/')}
              className="mt-3 inline-flex rounded-full bg-[#c5a367] px-5 py-2.5 text-sm font-semibold text-[#1c1b1f]"
            >
              Seguir comprando
            </Link>
          </div>
        )}
      </div>

      {buyProduct && sessionId && tenantId && (
        <LiveQuickBuySheet
          open={Boolean(buyProduct)}
          sessionProduct={buyProduct}
          sessionId={sessionId}
          displayName={displayName}
          onClose={() => setBuyProduct(null)}
        />
      )}
    </div>
  )
}
