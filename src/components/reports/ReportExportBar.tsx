type Props = {
  onExportExcel?: () => void
  onExportPdf?: () => void
  disabled?: boolean
}

export function ReportExportBar({ onExportExcel, onExportPdf, disabled }: Props) {
  if (!onExportExcel && !onExportPdf) return null
  return (
    <div className="flex flex-wrap gap-2">
      {onExportExcel ? (
        <button type="button" className="mc-btn-secondary px-4 py-2 text-[13px]" disabled={disabled} onClick={onExportExcel}>
          Descargar Excel
        </button>
      ) : null}
      {onExportPdf ? (
        <button type="button" className="mc-btn-secondary px-4 py-2 text-[13px]" disabled={disabled} onClick={onExportPdf}>
          Descargar PDF
        </button>
      ) : null}
    </div>
  )
}
