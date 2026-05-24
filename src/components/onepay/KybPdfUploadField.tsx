import type { ReactNode } from 'react'

export type KybPdfFieldKey = 'rut' | 'dni' | 'ccc' | 'bank' | 'simple'

type KybPdfUploadFieldProps = {
  label: ReactNode
  field: KybPdfFieldKey
  uploaded: boolean
  uploading: boolean
  disabled: boolean
  /** true mientras cualquier archivo KYB está subiendo */
  uploadsLocked: boolean
  storageConfigured: boolean
  onPickPdf: (field: KybPdfFieldKey, list: FileList | null) => void
}

function PdfCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PdfDocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function KybPdfUploadField({
  label,
  field,
  uploaded,
  uploading,
  disabled,
  uploadsLocked,
  storageConfigured,
  onPickPdf,
}: KybPdfUploadFieldProps) {
  const freezeFields = disabled || uploadsLocked
  const canPick = storageConfigured && !freezeFields

  const fileInput = (
    <input
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      disabled={!canPick}
      onChange={(e) => {
        onPickPdf(field, e.target.files)
        e.target.value = ''
      }}
    />
  )

  return (
    <div className="block space-y-2">
      <span className="text-[12px] font-medium text-[var(--cat-muted)]">{label}</span>

      {uploaded && !uploading ? (
        <div className="flex flex-col gap-3 border border-emerald-200/70 bg-emerald-50/45 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <PdfCheckIcon />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-emerald-950">Documento subido</p>
              <p className="text-[12px] leading-snug text-emerald-800/80">PDF listo para enviar a OnePay</p>
            </div>
          </div>
          <label
            className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-emerald-300/60 bg-[var(--cat-surface)] px-3.5 py-2 text-[13px] font-medium text-emerald-950 transition hover:bg-emerald-50/80 ${
              canPick ? '' : 'pointer-events-none opacity-45'
            }`}
          >
            {fileInput}
            Cambiar
          </label>
        </div>
      ) : (
        <label
          className={`flex min-h-[108px] flex-col items-center justify-center gap-2 border border-dashed px-4 py-5 text-center transition ${
            uploading
              ? 'border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] bg-[color-mix(in_srgb,var(--cat-accent)_6%,var(--cat-surface))]'
              : canPick
                ? 'cursor-pointer border-neutral-300/70 bg-[var(--cat-surface)] hover:border-[color-mix(in_srgb,var(--cat-text)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--cat-accent)_8%,var(--cat-surface))]'
                : 'pointer-events-none border-neutral-200/60 bg-neutral-50/40 opacity-50'
          }`}
        >
          {fileInput}
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              uploading
                ? 'bg-[color-mix(in_srgb,var(--cat-text)_8%,transparent)] text-[var(--cat-text)]'
                : 'bg-[color-mix(in_srgb,var(--cat-accent)_14%,transparent)] text-[var(--cat-text)]'
            }`}
          >
            <PdfDocIcon />
          </span>
          <span className="text-[14px] font-medium text-[var(--cat-text)]">
            {uploading ? 'Subiendo documento…' : 'Subir PDF'}
          </span>
          {!uploading ? (
            <span className="text-[12px] text-[var(--cat-muted)]">Solo archivos PDF · máximo 15 MB</span>
          ) : null}
        </label>
      )}

      {!storageConfigured ? (
        <p className="text-[12px] leading-relaxed text-amber-900/90">
          La subida de documentos requiere Firebase Storage configurado en el proyecto.
        </p>
      ) : null}
    </div>
  )
}
