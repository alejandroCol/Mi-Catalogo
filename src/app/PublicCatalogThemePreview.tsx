import { useState } from 'react'
import {
  buildCatalogThemeForSave,
  catalogColorsToCssVars,
  publicCatalogPresetClass,
  resolveCatalogTheme,
} from '@/lib/catalogTheme'
import { IconChevronRight } from '@/icons/McIcons'
import type { McCatalogThemePreset, McTenant } from '@/types/mc'

const HEX = /^#[0-9A-Fa-f]{6}$/

type Props = {
  tenant: McTenant
  preset: McCatalogThemePreset
  cAccent: string
  cAccentText: string
  cBg: string
  cSurface: string
  cText: string
  cMuted: string
}

function PreviewListInner({ preset }: { preset: McCatalogThemePreset }) {
  if (preset === 'minimal') {
    return (
      <div className="divide-y mc-pc-border">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-2 py-2 first:pt-0">
            <div className="h-10 w-10 shrink-0 rounded-md mc-pc-image-placeholder" />
            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
              <div className="h-2 w-full rounded bg-[var(--cat-text)]/80" />
              <div className="h-1.5 w-12 rounded bg-[var(--cat-muted)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (preset === 'bold') {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-lg border mc-pc-border">
            <div className="aspect-[5/3] w-full mc-pc-image-placeholder" />
            <div className="space-y-1 px-2 py-2 text-center">
              <div className="mx-auto h-2 w-3/4 rounded bg-[var(--cat-text)]" />
              <div className="mx-auto h-1.5 w-1/3 rounded bg-[var(--cat-muted)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (preset === 'boutique') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="overflow-hidden rounded border mc-pc-border mc-pc-surface">
            <div className="aspect-[3/4] w-full mc-pc-image-placeholder" />
            <div className="space-y-1 p-1.5 text-center">
              <div className="mx-auto h-1.5 w-full rounded-sm bg-[var(--cat-text)]/85" />
              <div className="mx-auto h-1 w-2/3 rounded-sm bg-[var(--cat-muted)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  // ios + morning
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="flex overflow-hidden rounded-lg border mc-pc-border mc-pc-surface">
          <div className="h-12 w-12 shrink-0 mc-pc-image-placeholder" />
          <div className="min-w-0 flex-1 space-y-1 p-2">
            <div className="h-2 w-full rounded-sm bg-[var(--cat-text)]/90" />
            <div className="h-1.5 w-10 rounded-sm bg-[var(--cat-muted)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PublicCatalogThemePreview({
  tenant,
  preset,
  cAccent,
  cAccentText,
  cBg,
  cSurface,
  cText,
  cMuted,
}: Props) {
  const colors = resolveCatalogTheme({
    ...tenant,
    billingPlan: 'expert',
    catalogTheme: buildCatalogThemeForSave(preset, {
      ...(HEX.test(cAccent) ? { accent: cAccent } : {}),
      ...(HEX.test(cAccentText) ? { accentText: cAccentText } : {}),
      ...(HEX.test(cBg) ? { bg: cBg } : {}),
      ...(HEX.test(cSurface) ? { surface: cSurface } : {}),
      ...(HEX.test(cText) ? { text: cText } : {}),
      ...(HEX.test(cMuted) ? { muted: cMuted } : {}),
    }),
  }).colors

  const vars = catalogColorsToCssVars(colors)
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <div className="border border-neutral-200/50">
      <button
        type="button"
        onClick={() => setPreviewOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 bg-neutral-50/80 px-4 py-3 text-left transition duration-200 ease-in-out hover:bg-neutral-100/80"
        aria-expanded={previewOpen}
      >
        <span className="text-[13px] font-medium text-neutral-800">
          {previewOpen ? 'Ocultar vista previa del catálogo' : 'Ver vista previa del catálogo público'}
        </span>
        <IconChevronRight
          size={18}
          className={`shrink-0 text-mc-500 transition-transform duration-200 ${previewOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {previewOpen && (
        <div className="border-t border-neutral-200/40 bg-neutral-50/50 p-3">
          <div
            className={`mc-public-catalog-page ${publicCatalogPresetClass(preset)} max-h-[min(240px,38vh)] overflow-y-auto border border-neutral-200/50`}
            style={vars}
          >
            <header className="border-b mc-pc-border mc-pc-surface px-3 py-2.5">
              <p className="mc-pc-display text-[14px] font-medium tracking-tight mc-pc-text">{tenant.nombreTienda}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed mc-pc-muted">Encabezado · listado según plantilla</p>
            </header>
            <div className="px-3 py-4">
              <h3
                className={
                  preset === 'bold'
                    ? 'mc-pc-display mb-3 text-center text-base font-semibold tracking-tighter mc-pc-text'
                    : preset === 'minimal'
                      ? 'mc-pc-display mb-3 border-l-2 border-[var(--cat-accent)] pl-3 text-left text-sm font-medium mc-pc-text'
                      : 'mc-pc-display mb-3 text-center text-sm font-medium tracking-tight mc-pc-text'
                }
              >
                Catálogo
              </h3>
              <PreviewListInner preset={preset} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
