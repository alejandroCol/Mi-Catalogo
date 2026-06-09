import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  catalogPublishBlockReason,
  canOwnerPublishCatalog,
  isCatalogPubliclyAccessible,
  isLegacyGrandfatheredStore,
} from '@/lib/catalogPublish'
import { CatalogPublishStatusBadge } from '@/components/catalog/CatalogPublishStatusBadge'
import { callMcCatalogPublish, callMcCatalogUnpublish } from '@/lib/mcCatalogPublishApi'
import { ADMIN_CATALOG_PREVIEW_BASE } from '@/app/AdminCatalogPreviewLayout'
import { PUBLISH_FROM_HOME_NAV } from '@/app/configuraciones/configSubpageNav'
import { IconLink, IconMagnifier } from '@/icons/McIcons'
import type { McPlatformSettings, McTenant } from '@/types/mc'

type Props = {
  tenant: McTenant
  platformSettings: McPlatformSettings | null
  catalogoUrl: string
  onPublished?: () => void
  className?: string
  /** `home`: CTAs prominentes en inicio (Publicar + Vista previa). */
  variant?: 'default' | 'home'
  /** Oculta el badge de estado (p. ej. cuando se renderiza aparte en home). */
  showStatusBadge?: boolean
}

function publishCtaMessage(reason: ReturnType<typeof catalogPublishBlockReason>): string {
  switch (reason) {
    case 'needs_expert':
      return 'Activá el plan Expert para publicar tu tienda online.'
    case 'needs_checkout':
      return 'Configurá cómo cobrás antes de publicar.'
    case 'needs_envio':
      return 'Configurá el envío antes de publicar.'
    default:
      return ''
  }
}

export function CatalogPublishPanel({
  tenant,
  platformSettings,
  catalogoUrl,
  onPublished,
  className = '',
  variant = 'default',
  showStatusBadge = true,
}: Props) {
  const isHome = variant === 'home'
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const isLive = isCatalogPubliclyAccessible(tenant)
  const canPublish = canOwnerPublishCatalog(tenant, platformSettings)
  const blockReason = catalogPublishBlockReason(tenant, platformSettings)
  const isGrandfathered = isLegacyGrandfatheredStore(tenant)
  const showPreviewLink = !(isHome && isLive)

  async function handlePublish() {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      await callMcCatalogPublish()
      setMsg('¡Tu tienda está publicada! Ya podés compartir el enlace.')
      onPublished?.()
    } catch (e: unknown) {
      const m =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : 'No se pudo publicar. Intentá de nuevo.'
      setErr(m)
    } finally {
      setBusy(false)
    }
  }

  async function handleUnpublish() {
    if (!window.confirm('¿Despublicar tu tienda? Los clientes no podrán acceder al catálogo.')) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      await callMcCatalogUnpublish()
      setMsg('Tu tienda fue despublicada.')
      onPublished?.()
    } catch (e: unknown) {
      const m =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : 'No se pudo despublicar.'
      setErr(m)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showStatusBadge ? <CatalogPublishStatusBadge tenant={tenant} /> : null}

      <div
        className={
          isHome
            ? 'flex flex-col gap-2.5 sm:flex-row sm:items-stretch'
            : 'flex flex-col gap-2.5 sm:flex-row'
        }
      >
        {canPublish ? (
          <button
            type="button"
            className={
              isHome
                ? 'mc-btn-primary inline-flex min-h-[3.25rem] flex-[1.4] items-center justify-center gap-2.5 py-3.5 text-[16px] font-semibold shadow-[0_10px_28px_-14px_rgba(0,0,0,0.45)] sm:py-4'
                : 'mc-btn-primary inline-flex flex-1 items-center justify-center gap-2 py-3 text-[15px]'
            }
            disabled={busy}
            onClick={() => void handlePublish()}
          >
            <IconLink size={isHome ? 18 : 17} />
            {busy ? 'Publicando…' : isHome ? 'Publicar mi tienda' : 'Publicar tienda'}
          </button>
        ) : isHome && blockReason === 'needs_expert' ? (
          <Link
            to="/app/plan"
            state={PUBLISH_FROM_HOME_NAV}
            className="mc-btn-primary inline-flex min-h-[3.25rem] flex-[1.4] items-center justify-center gap-2.5 py-3.5 text-[16px] font-semibold no-underline shadow-[0_10px_28px_-14px_rgba(0,0,0,0.45)] sm:py-4"
          >
            <IconLink size={18} />
            Publicar mi tienda
          </Link>
        ) : isHome && blockReason === 'needs_checkout' ? (
          <Link
            to="/app/cuenta/checkout-ventas"
            state={PUBLISH_FROM_HOME_NAV}
            className="mc-btn-primary inline-flex min-h-[3.25rem] flex-[1.4] items-center justify-center gap-2.5 py-3.5 text-[16px] font-semibold no-underline shadow-[0_10px_28px_-14px_rgba(0,0,0,0.45)] sm:py-4"
          >
            <IconLink size={18} />
            Publicar mi tienda
          </Link>
        ) : isHome && blockReason === 'needs_envio' ? (
          <Link
            to="/app/cuenta/envio"
            state={PUBLISH_FROM_HOME_NAV}
            className="mc-btn-primary inline-flex min-h-[3.25rem] flex-[1.4] items-center justify-center gap-2.5 py-3.5 text-[16px] font-semibold no-underline shadow-[0_10px_28px_-14px_rgba(0,0,0,0.45)] sm:py-4"
          >
            <IconLink size={18} />
            Publicar mi tienda
          </Link>
        ) : null}

        {showPreviewLink ? (
          <Link
            to={ADMIN_CATALOG_PREVIEW_BASE}
            className={
              isHome
                ? 'mc-btn-secondary inline-flex min-h-[3.25rem] flex-1 items-center justify-center gap-2 py-3.5 text-[15px] no-underline sm:py-4'
                : 'mc-btn-secondary inline-flex flex-1 items-center justify-center gap-2 py-3 text-[15px] no-underline'
            }
          >
            <IconMagnifier size={17} />
            Vista previa
          </Link>
        ) : null}

        {!isHome && isLive && !isGrandfathered && tenant.catalogPublished ? (
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-neutral-200/80 bg-white px-4 py-3 text-[14px] font-medium text-[var(--cat-muted)] transition hover:border-neutral-300 hover:text-[var(--cat-text)]"
            disabled={busy}
            onClick={() => void handleUnpublish()}
          >
            Despublicar
          </button>
        ) : null}
      </div>

      {!isHome && !isLive && blockReason && blockReason !== 'already_published' ? (
        <div className="rounded-xl border border-amber-200/55 bg-amber-50/35 px-4 py-3.5">
          <p className="text-[13px] leading-relaxed text-amber-950">{publishCtaMessage(blockReason)}</p>
          {blockReason === 'needs_expert' ? (
            <Link
              to="/app/plan"
              className="mt-2 inline-flex text-[13px] font-semibold text-amber-900 no-underline hover:underline"
            >
              Ver plan Expert →
            </Link>
          ) : null}
          {blockReason === 'needs_checkout' ? (
            <Link
              to="/app/cuenta/checkout-ventas"
              className="mt-2 inline-flex text-[13px] font-semibold text-amber-900 no-underline hover:underline"
            >
              Configurar cobro →
            </Link>
          ) : null}
          {blockReason === 'needs_envio' ? (
            <Link
              to="/app/cuenta/envio"
              className="mt-2 inline-flex text-[13px] font-semibold text-amber-900 no-underline hover:underline"
            >
              Configurar envío →
            </Link>
          ) : null}
        </div>
      ) : null}

      {isHome && !isLive && blockReason && blockReason !== 'already_published' ? (
        <p className="text-center text-[12px] leading-relaxed text-[var(--cat-muted)] sm:text-left">
          {publishCtaMessage(blockReason)}
        </p>
      ) : null}

      {!isHome && isLive && catalogoUrl ? (
        <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/30 px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-800/80">
            Enlace público
          </p>
          <p className="mt-2 break-all font-mono text-[12px] leading-relaxed text-[var(--cat-text)] sm:text-[13px]">
            {catalogoUrl}
          </p>
        </div>
      ) : !isHome && !isLive && catalogoUrl ? (
        <p className="text-[12px] leading-relaxed text-[var(--cat-muted)]">
          El enlace público se activará cuando publiques con el plan Expert.
        </p>
      ) : null}

      {msg ? <p className="text-[13px] text-emerald-800">{msg}</p> : null}
      {err ? <p className="text-[13px] text-red-700">{err}</p> : null}
    </div>
  )
}
