import { ReportHubPage } from '@/components/reports/ReportHubPage'
import { CATALOG_REPORTS } from '@/lib/reports/reportDefinitions'
import { useDemoAdmin } from '@/vendedor/demo-admin/DemoAdminContext'
import { demoAdminPath } from '@/vendedor/demo-admin/demoAdminPaths'

export function DemoAdminReportesHubPage() {
  const { demo } = useDemoAdmin()

  return (
    <ReportHubPage
      reports={CATALOG_REPORTS}
      basePath={demoAdminPath(demo.id, 'reportes')}
      backTo={demoAdminPath(demo.id, 'pedidos')}
      title="Centro de reportes"
      subtitle="Elegí el análisis que necesitás: ganancias, cierres de periodo, ciudades, horarios y más. Filtrá por fecha y exportá en Excel o PDF."
    />
  )
}
