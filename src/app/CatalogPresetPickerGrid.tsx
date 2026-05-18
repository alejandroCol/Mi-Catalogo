import clsx from 'clsx'
import {
  CATALOG_PRESET_LABELS,
  CATALOG_PRESET_TAGLINES,
  catalogColorsToCssVars,
  defaultColorsForPreset,
  publicCatalogPresetClass,
} from '@/lib/catalogTheme'
import type { McCatalogThemePreset } from '@/types/mc'

/** Orden en UI: el rey primero, luego familias de tienda. */
const PRESET_ORDER: McCatalogThemePreset[] = ['morning', 'ios', 'boutique', 'bold', 'minimal']

/** Miniatura legible: siluetas distintas por plantilla (lista / cuadrícula / hero / vitrina). */
function PresetLayoutMini({ preset }: { preset: McCatalogThemePreset }) {
  const vars = catalogColorsToCssVars(defaultColorsForPreset(preset))
  const shell = clsx(
    'mc-public-catalog-page h-full w-full overflow-hidden rounded-lg border border-transparent px-1.5 py-1.5',
    publicCatalogPresetClass(preset),
  )

  if (preset === 'minimal') {
    return (
      <div className={shell} style={vars}>
        <div className="flex h-full min-h-[88px] flex-col justify-center gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-1.5 border-l-[3px] border-[var(--cat-accent)] pl-1.5">
              <div className="h-8 w-8 shrink-0 rounded-sm mc-pc-image-placeholder" />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-0.5">
                <div className="h-2 w-[92%] rounded-sm bg-[var(--cat-text)]/88" />
                <div className="h-1.5 w-2/5 rounded-sm bg-[var(--cat-muted)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (preset === 'bold') {
    return (
      <div className={shell} style={vars}>
        <div className="flex h-full min-h-[88px] flex-col justify-center">
          <div className="overflow-hidden rounded-lg border-2 mc-pc-border">
            <div className="aspect-[5/3] w-full mc-pc-image-placeholder" />
            <div className="space-y-1 px-1.5 py-1.5 text-center">
              <div className="mx-auto h-2 w-4/5 rounded-sm bg-[var(--cat-text)]" />
              <div className="mx-auto h-1.5 w-2/5 rounded-sm bg-[var(--cat-muted)]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (preset === 'boutique') {
    return (
      <div className={shell} style={vars}>
        <div className="grid h-full min-h-[88px] grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex min-h-0 flex-col overflow-hidden rounded-md border mc-pc-border mc-pc-surface"
            >
              <div className="aspect-square w-full min-h-[22px] mc-pc-image-placeholder" />
              <div className="flex flex-col gap-0.5 p-1">
                <div className="h-1.5 w-full rounded-sm bg-[var(--cat-text)]/82" />
                <div className="h-1 w-2/3 rounded-sm bg-[var(--cat-muted)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (preset === 'morning') {
    return (
      <div className={shell} style={vars}>
        <div className="flex h-full min-h-[88px] flex-col justify-center gap-1">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--cat-muted)]/55" />
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex w-full gap-1 overflow-hidden rounded-lg border mc-pc-border mc-pc-surface p-1"
            >
              <div className="h-7 w-7 shrink-0 rounded-md mc-pc-image-placeholder" />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                <div className="h-2 w-full rounded-sm bg-[var(--cat-text)]/90" />
                <div className="h-1.5 w-3/5 rounded-sm bg-[var(--cat-muted)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (preset === 'ios') {
    return (
      <div className={shell} style={vars}>
        <div className="grid h-full min-h-[88px] grid-cols-2 gap-1 content-center">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex min-h-0 flex-col overflow-hidden rounded-md border mc-pc-border mc-pc-surface"
            >
              <div className="flex gap-0.5 p-0.5">
                <div className="h-5 w-5 shrink-0 rounded-[3px] mc-pc-image-placeholder" />
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pr-0.5">
                  <div className="h-1.5 w-full rounded-sm bg-[var(--cat-text)]/90" />
                  <div className="h-1 w-1/2 rounded-sm bg-[var(--cat-muted)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
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
      className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5"
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
              'flex min-w-0 flex-col overflow-hidden rounded-md border bg-[var(--cat-surface)] p-1.5 text-left transition duration-200 ease-in-out',
              selected
                ? 'border-[var(--cat-accent)] ring-1 ring-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)]'
                : 'border-neutral-200/60 hover:border-neutral-300/90',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <div className="h-[102px] w-full shrink-0 overflow-hidden rounded-md sm:h-[110px]">
              <PresetLayoutMini preset={key} />
            </div>
            <span className="line-clamp-2 shrink-0 px-0.5 pt-1.5 text-center text-[9px] font-medium leading-tight text-[var(--cat-text)] sm:text-[10px]">
              {CATALOG_PRESET_LABELS[key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
