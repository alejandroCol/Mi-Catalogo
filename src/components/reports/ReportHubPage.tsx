import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ReportDefinition } from '@/lib/reports/reportDefinitions'
import {
  IconCalendar,
  IconChartBars,
  IconChevronLeft,
  IconChevronRight,
  IconCoins,
  IconCube,
  IconHome,
  IconPerson,
  IconShipping,
} from '@/icons/McIcons'

const ICONS = {
  chart: IconChartBars,
  money: IconCoins,
  calendar: IconCalendar,
  clock: IconCalendar,
  map: IconShipping,
  week: IconChartBars,
  products: IconCube,
  funnel: IconChartBars,
  store: IconHome,
  users: IconPerson,
  compare: IconChartBars,
} as const

const REPORT_GROUPS: {
  id: string
  label: string
  match: (report: ReportDefinition) => boolean
}[] = [
  {
    id: 'finanzas',
    label: 'Finanzas',
    match: (r) => r.icon === 'money' || r.icon === 'calendar' || r.icon === 'chart',
  },
  {
    id: 'patrones',
    label: 'Patrones de venta',
    match: (r) => r.icon === 'clock' || r.icon === 'week' || r.icon === 'map' || r.icon === 'store',
  },
  {
    id: 'detalle',
    label: 'Productos y tráfico',
    match: (r) => r.icon === 'products' || r.icon === 'funnel' || r.icon === 'users' || r.icon === 'compare',
  },
]

const FEATURED_ID = 'ventas-ganancias'

/** Tonos pastel solo para iconos — el resto de la tarjeta sigue neutro. */
const PASTEL_BY_REPORT_ID: Record<string, string> = {
  'ventas-ganancias': 'honey',
  'cierre-periodo': 'lavender',
  'estado-cuenta': 'mint',
  'horarios-venta': 'sky',
  'por-ciudad': 'blush',
  'por-dia-semana': 'periwinkle',
  'productos-margen': 'peach',
  'conversion-trafico': 'aqua',
  'por-sede': 'blush',
  'metodos-pago': 'sage',
  general: 'sand',
  vendedores: 'slate',
  articulos: 'peach',
  comparativo: 'lilac',
}

const PASTEL_BY_ICON: Record<ReportDefinition['icon'], string> = {
  money: 'honey',
  calendar: 'lavender',
  chart: 'mint',
  clock: 'sky',
  map: 'blush',
  week: 'periwinkle',
  products: 'peach',
  funnel: 'aqua',
  store: 'blush',
  users: 'slate',
  compare: 'lilac',
}

function reportPastelTone(report: Pick<ReportDefinition, 'id' | 'icon'>): string {
  return PASTEL_BY_REPORT_ID[report.id] ?? PASTEL_BY_ICON[report.icon] ?? 'sand'
}

type Props = {
  reports: ReportDefinition[]
  basePath: string
  title: string
  subtitle: string
  backTo: string
}

function ReportRowLink({
  report,
  to,
  index,
}: {
  report: ReportDefinition
  to: string
  index: number
}) {
  const Icon = ICONS[report.icon] ?? IconChartBars
  const pastel = reportPastelTone(report)

  return (
    <Link to={to} className="mc-reports-row group">
      <span className="mc-reports-row__index" aria-hidden>
        {String(index).padStart(2, '0')}
      </span>
      <span className={`mc-reports-row__icon mc-reports-icon--${pastel}`}>
        <Icon size={24} />
      </span>
      <span className="mc-reports-row__body">
        <span className="mc-reports-row__title">{report.title}</span>
        <span className="mc-reports-row__desc">{report.subtitle}</span>
      </span>
      <IconChevronRight size={20} className="mc-reports-row__chevron" />
    </Link>
  )
}

export function ReportHubPage({ reports, basePath, title, subtitle, backTo }: Props) {
  const featured = reports.find((r) => r.id === FEATURED_ID) ?? reports[0]
  const rest = featured ? reports.filter((r) => r.id !== featured.id) : reports

  const grouped = useMemo(() => {
    const assigned = new Set<string>()
    const sections = REPORT_GROUPS.map((group) => {
      const items = rest.filter((r) => {
        if (assigned.has(r.id)) return false
        if (!group.match(r)) return false
        assigned.add(r.id)
        return true
      })
      return { ...group, items }
    }).filter((g) => g.items.length > 0)

    const leftovers = rest.filter((r) => !assigned.has(r.id))
    if (leftovers.length > 0) {
      sections.push({ id: 'otros', label: 'Más reportes', match: () => true, items: leftovers })
    }

    return sections
  }, [rest])

  let rowIndex = 1
  const FeaturedIcon = featured ? ICONS[featured.icon] ?? IconChartBars : IconChartBars
  const featuredPastel = featured ? reportPastelTone(featured) : 'sand'

  return (
    <div className="mc-shell mc-reports space-y-6 pb-28 sm:space-y-8">
      <Link to={backTo} className="mc-reports-back">
        <IconChevronLeft size={18} />
        Volver
      </Link>

      <section className="mc-reports-hero">
        <div className="mc-reports-hero__orb" aria-hidden />
        <div className="mc-reports-hero__content">
          <div className="mc-reports-hero__eyebrow-row">
            <IconChartBars size={18} />
            <p className="mc-reports-hero__eyebrow">Reportes</p>
          </div>
          <h1 className="mc-reports-hero__title">{title}</h1>
          <p className="mc-reports-hero__subtitle">{subtitle}</p>
        </div>
      </section>

      {featured ? (
        <Link to={`${basePath}/${featured.id}`} className="mc-reports-featured group">
          <div className="mc-reports-featured__main">
            <p className="mc-reports-featured__label">Recomendado para empezar</p>
            <div className="mc-reports-featured__head">
              <span className={`mc-reports-featured__icon mc-reports-icon--${featuredPastel}`}>
                <FeaturedIcon size={26} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="mc-reports-featured__title">{featured.title}</h2>
                <p className="mc-reports-featured__desc">{featured.subtitle}</p>
              </div>
            </div>
          </div>
          <span className="mc-reports-featured__cta">
            Ver análisis
            <IconChevronRight size={18} />
          </span>
        </Link>
      ) : null}

      <div className="mc-reports-sections">
        {grouped.map((section) => (
          <section key={section.id} className="mc-reports-section">
            <h2 className="mc-reports-section__label">{section.label}</h2>
            <div className="mc-reports-list">
              {section.items.map((report) => {
                const current = rowIndex
                rowIndex += 1
                return (
                  <ReportRowLink
                    key={report.id}
                    report={report}
                    to={`${basePath}/${report.id}`}
                    index={current}
                  />
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
