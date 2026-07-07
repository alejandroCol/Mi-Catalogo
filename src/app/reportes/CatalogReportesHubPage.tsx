import { ReportHubPage } from '@/components/reports/ReportHubPage'
import { CATALOG_REPORTS } from '@/lib/reports/reportDefinitions'

export function CatalogReportesHubPage() {
  return (
    <ReportHubPage
      reports={CATALOG_REPORTS}
      basePath="/app/reportes"
      backTo="/app/pedidos"
      title="Centro de reportes"
      subtitle="Elegí el análisis que necesitás: ganancias, cierres de periodo, ciudades, horarios y más. Filtrá por fecha y exportá en Excel o PDF."
    />
  )
}
