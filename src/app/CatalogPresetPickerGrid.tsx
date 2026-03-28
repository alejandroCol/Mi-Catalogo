import clsx from 'clsx'
import {
  CATALOG_PRESET_LABELS,
  CATALOG_PRESET_TAGLINES,
  catalogColorsToCssVars,
  defaultColorsForPreset,
  publicCatalogPresetClass,
} from '@/lib/catalogTheme'
import type { McCatalogThemePreset } from '@/types/mc'

const PRESET_ORDER: McCatalogThemePreset[] = ['morning', 'ios', 'minimal', 'bold', 'boutique']

/** Miniatura compacta que ocupa el área cuadrada superior de cada tarjeta. */
function PresetLayoutMini({ preset }: { preset: McCatalogThemePreset }) {
  const vars = catalogColorsToCssVars(defaultColorsForPreset(preset))
  const shell = `mc-public-catalog-page ${publicCatalogPresetClass(preset)} h-full w-full overflow-hidden rounded-[6px] px-1 py-0.5 text-[2px] leading-none sm:text-[3px]`

  if (preset === 'minimal') {
    return (
      <div className={shell} style={vars}>
        <div className="flex h-full flex-col justify-center gap-0.5 border-b-0">
          <div className="flex gap-0.5">
            <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] mc-pc-image-placeholder" />
            <div className="min-w-0 flex-1 space-y-[1px] pt-[1px]">
              <div className="h-[2px] w-full rounded-[1px] bg-[var(--cat-text)]/85" />
              <div className="h-[1px] w-2/3 rounded-[1px] bg-[var(--cat-muted)]" />
            </div>
          </div>
          <div className="flex gap-0.5 border-t mc-pc-border pt-0.5">
            <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] mc-pc-image-placeholder" />
            <div className="min-w-0 flex-1 space-y-[1px] pt-[1px]">
              <div className="h-[2px] w-full rounded-[1px] bg-[var(--cat-text)]/85" />
              <div className="h-[1px] w-1/2 rounded-[1px] bg-[var(--cat-muted)]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (preset === 'bold') {
    return (
      <div className={shell} style={vars}>
        <div className="flex h-full flex-col justify-center">
          <div className="overflow-hidden rounded-[4px] border mc-pc-border">
            <div className="aspect-[16/10] w-full mc-pc-image-placeholder" />
            <div className="space-y-[1px] px-0.5 py-0.5 text-center">
              <div className="mx-auto h-[2px] w-4/5 rounded-[1px] bg-[var(--cat-text)]" />
              <div className="mx-auto h-[1px] w-1/3 rounded-[1px] bg-[var(--cat-muted)]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (preset === 'boutique') {
    return (
      <div className={shell} style={vars}>
        <div className="grid h-full grid-cols-2 gap-[1px]">
          <div className="flex min-h-0 flex-col overflow-hidden rounded border mc-pc-border mc-pc-surface">
            <div className="min-h-0 flex-1 mc-pc-image-placeholder" />
            <div className="shrink-0 space-y-[1px] p-[1px] text-center">
              <div className="mx-auto h-[1px] w-full bg-[var(--cat-text)]/80" />
              <div className="mx-auto h-[1px] w-2/3 bg-[var(--cat-muted)]" />
            </div>
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden rounded border mc-pc-border mc-pc-surface">
            <div className="min-h-0 flex-1 mc-pc-image-placeholder" />
            <div className="shrink-0 space-y-[1px] p-[1px] text-center">
              <div className="mx-auto h-[1px] w-full bg-[var(--cat-text)]/80" />
              <div className="mx-auto h-[1px] w-2/3 bg-[var(--cat-muted)]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={shell} style={vars}>
      <div className="flex h-full flex-col justify-center gap-0.5">
        <div className="flex gap-0.5 overflow-hidden rounded border mc-pc-border mc-pc-surface">
          <div className="h-3 w-3 shrink-0 mc-pc-image-placeholder" />
          <div className="min-w-0 flex-1 space-y-[1px] py-0.5 pr-0.5">
            <div className="h-[2px] w-full rounded-[1px] bg-[var(--cat-text)]/90" />
            <div className="h-[1px] w-1/2 rounded-[1px] bg-[var(--cat-muted)]" />
          </div>
        </div>
        <div className="flex gap-0.5 overflow-hidden rounded border mc-pc-border mc-pc-surface">
          <div className="h-3 w-3 shrink-0 mc-pc-image-placeholder" />
          <div className="min-w-0 flex-1 space-y-[1px] py-0.5 pr-0.5">
            <div className="h-[2px] w-full rounded-[1px] bg-[var(--cat-text)]/90" />
            <div className="h-[1px] w-2/3 rounded-[1px] bg-[var(--cat-muted)]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CatalogPresetPickerGrid({
  value,
  onChange,
  disabled,
}: {
  value: McCatalogThemePreset
  onChange: (p: McCatalogThemePreset) => void
  disabled?: boolean
}) {
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-5"
      role="radiogroup"
      aria-label="Plantilla del catálogo público"
    >
      {PRESET_ORDER.map((key) => {
        const selected = value === key
        const tag = CATALOG_PRESET_TAGLINES[key]
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            title={`${CATALOG_PRESET_LABELS[key]} — ${tag}`}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={clsx(
              'flex aspect-square min-w-0 flex-col overflow-hidden rounded-[12px] border-2 bg-[var(--cat-surface)] p-1 text-left transition',
              selected
                ? 'border-[var(--cat-accent)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--cat-accent)_30%,transparent)]'
                : 'border-[color-mix(in_srgb,var(--cat-muted)_38%,transparent)] hover:border-[color-mix(in_srgb,var(--cat-accent)_40%,var(--cat-muted)_60%)]',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <PresetLayoutMini preset={key} />
            </div>
            <span className="line-clamp-2 shrink-0 px-0.5 pt-1 text-center text-[9px] font-semibold leading-tight text-[var(--cat-text)] sm:text-[10px]">
              {CATALOG_PRESET_LABELS[key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
