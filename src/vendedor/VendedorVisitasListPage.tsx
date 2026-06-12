import { useMemo, useState } from 'react'
import { useMcAuth } from '@/auth/McAuthContext'
import { IconCalendar, IconChevronRight, IconPlus } from '@/icons/McIcons'
import { ActualizarVisitaModal } from '@/vendedor/ActualizarVisitaModal'
import { VendedorPageHeader } from '@/vendedor/components/VendedorPageHeader'
import { useSalesRepVisits } from '@/vendedor/hooks/useSalesRepVisits'
import {
  formatSalesVisitDateKey,
  formatSalesVisitTimestamp,
  salesVisitOutcomeLabel,
} from '@/lib/salesVisitLabels'
import type { McSalesVisit, McSalesVisitOutcome } from '@/types/mc'

type VisitListConfig = {
  filter: McSalesVisitOutcome
  eyebrow: string
  title: string
  titleAccent: string
  lead: string
  emptyTitle: string
  emptyLead: string
  showUpdateAction: boolean
}

const CONFIG: Record<'pendientes' | 'vendidas', VisitListConfig> = {
  pendientes: {
    filter: 'pendiente',
    eyebrow: 'Seguimiento',
    title: 'Tiendas',
    titleAccent: ' pendientes',
    lead: 'Marcas que quedaron en seguimiento. Agregá actualizaciones después de cada visita o llamada.',
    emptyTitle: 'Sin pendientes por ahora',
    emptyLead: 'Cuando registres visitas con estado pendiente, aparecerán acá para que les des seguimiento.',
    showUpdateAction: true,
  },
  vendidas: {
    filter: 'venta_exitosa',
    eyebrow: 'Cierres',
    title: 'Tiendas',
    titleAccent: ' vendidas',
    lead: 'Marcas que cerraron con Mi Catálogo. Revisá el historial de cada venta.',
    emptyTitle: 'Aún no hay ventas registradas',
    emptyLead: 'Cuando cierres una marca, registrá la visita como venta exitosa y la verás en esta lista.',
    showUpdateAction: false,
  },
}

function VisitCard({
  visit,
  showUpdateAction,
  onUpdate,
}: {
  visit: McSalesVisit
  showUpdateAction: boolean
  onUpdate: (visit: McSalesVisit) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const updates = visit.updates ?? []
  const hasUpdates = updates.length > 0

  return (
    <article className="mc-vendedor-visit-card">
      <div className="mc-vendedor-visit-card__main">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight text-mc-brand-gray sm:text-lg">
              {visit.storeName}
            </h2>
            <span className={`mc-vendedor-visit-card__badge mc-vendedor-visit-card__badge--${visit.outcome}`}>
              {salesVisitOutcomeLabel(visit.outcome)}
            </span>
          </div>

          {visit.storeDetail ? (
            <p className="mt-1.5 text-sm leading-relaxed text-mc-600">{visit.storeDetail}</p>
          ) : null}

          <p className="mt-2 flex items-center gap-1.5 text-xs text-mc-500">
            <IconCalendar size={14} className="shrink-0" />
            Visitada el {formatSalesVisitDateKey(visit.dateKey)}
            {visit.tenantSlug ? (
              <span className="before:mx-1.5 before:content-['·']">{visit.tenantSlug}</span>
            ) : null}
          </p>
        </div>

        {showUpdateAction ? (
          <button
            type="button"
            className="mc-vendedor-visit-card__action"
            onClick={() => onUpdate(visit)}
          >
            <IconPlus size={16} />
            <span>Actualización</span>
          </button>
        ) : null}
      </div>

      {hasUpdates ? (
        <div className="mc-vendedor-visit-card__updates">
          <button
            type="button"
            className="mc-vendedor-visit-card__updates-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <span>
              {updates.length} actualización{updates.length === 1 ? '' : 'es'}
            </span>
            <IconChevronRight
              size={16}
              className={`shrink-0 rotate-90 transition-transform duration-200 ${expanded ? '-rotate-90' : ''}`}
            />
          </button>

          {expanded ? (
            <ol className="mc-vendedor-visit-card__updates-list">
              {[...updates]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((update) => (
                  <li key={update.id} className="mc-vendedor-visit-card__update-item">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`mc-vendedor-visit-card__badge mc-vendedor-visit-card__badge--${update.outcome}`}
                      >
                        {salesVisitOutcomeLabel(update.outcome)}
                      </span>
                      <time className="text-[11px] text-mc-500" dateTime={new Date(update.createdAt).toISOString()}>
                        {formatSalesVisitTimestamp(update.createdAt)}
                      </time>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-mc-700">{update.description}</p>
                  </li>
                ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function VisitListPage({ mode }: { mode: 'pendientes' | 'vendidas' }) {
  const config = CONFIG[mode]
  const { profile } = useMcAuth()
  const { visits, loading } = useSalesRepVisits(profile?.uid)
  const [updateVisit, setUpdateVisit] = useState<McSalesVisit | null>(null)

  const filtered = useMemo(
    () => visits.filter((v) => v.outcome === config.filter),
    [visits, config.filter],
  )

  return (
    <div className="mc-vendedor-page">
      <VendedorPageHeader
        eyebrow={config.eyebrow}
        title={config.title}
        titleAccent={config.titleAccent}
        lead={config.lead}
      />

      {loading ? (
        <div className="mc-vendedor-visit-list__loading">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="mc-vendedor-visit-card mc-vendedor-visit-card--skeleton" aria-hidden />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mc-vendedor-visit-empty">
          <p className="text-lg font-semibold tracking-tight text-mc-brand-gray">{config.emptyTitle}</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-mc-600">{config.emptyLead}</p>
        </div>
      ) : (
        <div className="mc-vendedor-visit-list">
          <p className="mc-vendedor-visit-list__count">
            {filtered.length} tienda{filtered.length === 1 ? '' : 's'}
          </p>
          {filtered.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              showUpdateAction={config.showUpdateAction}
              onUpdate={setUpdateVisit}
            />
          ))}
        </div>
      )}

      <ActualizarVisitaModal
        visit={updateVisit}
        open={updateVisit != null}
        onClose={() => setUpdateVisit(null)}
      />
    </div>
  )
}

export function VendedorPendientesPage() {
  return <VisitListPage mode="pendientes" />
}

export function VendedorVendidasPage() {
  return <VisitListPage mode="vendidas" />
}
