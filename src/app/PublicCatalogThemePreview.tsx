import {
  buildCatalogThemeForSave,
  catalogColorsToCssVars,
  publicCatalogPresetClass,
  resolveCatalogTheme,
} from '@/lib/catalogTheme'
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

  return (
    <div className="rounded-[14px] border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <p className="rounded-t-[13px] bg-zinc-100 px-3 py-2 text-[12px] font-medium text-zinc-600">
        Vista previa ampliada · mismo layout que verán en la web
      </p>
      <div className="bg-zinc-50/80 p-2">
        <div
          className={`mc-public-catalog-page ${publicCatalogPresetClass(preset)} max-h-[min(210px,30vh)] overflow-y-auto rounded-lg border border-zinc-200/60 shadow-sm`}
          style={vars}
        >
          <header className="border-b mc-pc-border mc-pc-surface px-3 py-2.5 shadow-sm">
            <p className="mc-pc-display text-[15px] font-semibold mc-pc-text">{tenant.nombreTienda}</p>
            <p className="mt-0.5 text-[10px] mc-pc-muted">Encabezado compartido · listado según plantilla</p>
          </header>
          <div className="px-3 py-4">
            <h3
              className={
                preset === 'bold'
                  ? 'mc-pc-display mb-3 text-center text-lg font-black mc-pc-text'
                  : preset === 'minimal'
                    ? 'mc-pc-display mb-3 border-l-4 border-[var(--cat-accent)] pl-3 text-left text-base font-semibold mc-pc-text'
                    : 'mc-pc-display mb-3 text-center text-base font-semibold mc-pc-text'
              }
            >
              Catálogo
            </h3>
            <PreviewListInner preset={preset} />
          </div>
        </div>
      </div>
    </div>
  )
}
