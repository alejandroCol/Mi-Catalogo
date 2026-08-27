import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { McPublicPageLoadingFallback } from '@/components/McPublicPageLoadingFallback'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicStore } from '@/public/PublicStoreContext'
import { tenantHasPoliticas } from '@/lib/tenantPoliticas'

type PanelKey = 'envios' | 'pagos' | 'cambios'

function PolicyPanel({
  id,
  title,
  body,
  open,
  onToggle,
}: {
  id: PanelKey
  title: string
  body: string
  open: boolean
  onToggle: () => void
}) {
  const trimmed = body.trim()
  if (!trimmed) return null
  return (
    <div className="border-b mc-pc-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 py-4 text-left transition hover:opacity-80"
        aria-expanded={open}
        aria-controls={`policy-${id}`}
        id={`policy-trigger-${id}`}
      >
        <span className="mc-pc-display text-[15px] font-medium tracking-tight mc-pc-text">{title}</span>
        <span className="shrink-0 text-lg tabular-nums mc-pc-muted" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      <div
        id={`policy-${id}`}
        role="region"
        aria-labelledby={`policy-trigger-${id}`}
        className={clsx('overflow-hidden transition-[max-height] duration-200 ease-out', open ? 'max-h-[2000px]' : 'max-h-0')}
      >
        <p className="whitespace-pre-wrap pb-5 text-sm leading-relaxed mc-pc-muted">{trimmed}</p>
      </div>
    </div>
  )
}

export function PublicPoliciesPage() {
  const { slug, to } = usePublicStore()
  const { tenant, loading, error } = useCatalogTenant()
  const [openKey, setOpenKey] = useState<PanelKey | null>(null)

  useEffect(() => {
    if (!tenant) return
    const e = (tenant.politicasEnvios ?? '').trim()
    const pa = (tenant.politicasPagos ?? '').trim()
    const c = (tenant.politicasCambios ?? '').trim()
    if (e) setOpenKey('envios')
    else if (pa) setOpenKey('pagos')
    else if (c) setOpenKey('cambios')
    else setOpenKey(null)
  }, [tenant])

  if (loading) {
    return <McPublicPageLoadingFallback />
  }
  if (error || !tenant || !slug) {
    return (
      <div className="mc-public-catalog-inset py-16 text-center text-sm mc-pc-muted">
        {error ?? 'No disponible.'}
      </div>
    )
  }

  const has = tenantHasPoliticas(tenant)

  return (
    <div className="mc-public-catalog-inset max-w-3xl space-y-8 py-8 sm:space-y-10 sm:py-10">
      <div>
        <nav className="text-[12px] sm:text-[13px] mc-pc-muted" aria-label="Políticas">
          <Link
            to={to('/')}
            className="font-medium text-[var(--cat-text)] transition hover:opacity-80"
          >
            {tenant.nombreTienda}
          </Link>
          <span className="mx-1.5 text-[color-mix(in_srgb,var(--cat-muted)_55%,transparent)]" aria-hidden>
            /
          </span>
          <span>Ayuda</span>
        </nav>
        <h1 className="mc-pc-display mt-3 text-2xl font-semibold tracking-tight text-[var(--cat-text)] sm:mt-4 sm:text-3xl">
          Políticas
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--cat-muted)] sm:mt-3">
          Envíos, pagos y cambios publicados por la tienda.
        </p>
      </div>

      {!has ? (
        <p className="rounded-md border border-dashed mc-pc-border px-4 py-5 text-sm leading-relaxed mc-pc-muted">
          La tienda aún no cargó textos de políticas. Escribiles por WhatsApp si tenés dudas.
        </p>
      ) : (
        <div className="mc-pc-rey-card rounded-2xl border-0 bg-[var(--cat-surface)] px-4 py-0 sm:px-5">
          <PolicyPanel
            id="envios"
            title="Envíos"
            body={tenant.politicasEnvios ?? ''}
            open={openKey === 'envios'}
            onToggle={() => setOpenKey((k) => (k === 'envios' ? null : 'envios'))}
          />
          <PolicyPanel
            id="pagos"
            title="Pagos"
            body={tenant.politicasPagos ?? ''}
            open={openKey === 'pagos'}
            onToggle={() => setOpenKey((k) => (k === 'pagos' ? null : 'pagos'))}
          />
          <PolicyPanel
            id="cambios"
            title="Cambios y devoluciones"
            body={tenant.politicasCambios ?? ''}
            open={openKey === 'cambios'}
            onToggle={() => setOpenKey((k) => (k === 'cambios' ? null : 'cambios'))}
          />
        </div>
      )}
    </div>
  )
}
