import { ReportHubPage } from '@/components/reports/ReportHubPage'
import { POS_REPORTS } from '@/lib/reports/reportDefinitions'

export function PosReportesHubPage() {
  return (
    <div className="mc-pos-page">
      <ReportHubPage
        reports={POS_REPORTS}
        basePath="/pos/admin/reportes"
        backTo="/pos/admin"
        title="Centro de reportes POS"
        subtitle="Ganancias, cierres de periodo, sedes, horarios, métodos de pago y comparativos. Filtrá por fecha y exportá resultados."
      />
    </div>
  )
}
