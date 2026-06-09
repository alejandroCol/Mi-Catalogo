import { useMemo } from 'react'
import { McOptionCombobox } from '@/components/McOptionCombobox'
import { ciiuEntryLabel, getCiiuByCode, searchCiiu, CIIU_COLOMBIA_COUNT } from '@/lib/ciiuColombia'

type Props = {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
}

/**
 * Buscador de código CIIU (4 dígitos) con catálogo local DANE Rev. 4 A.C.
 * OnePay no expone endpoint de actividades económicas; el valor se envía en `economic_activity`.
 */
export function OnepayKybCiiuPicker({ value, onChange, disabled }: Props) {
  const options = useMemo(() => {
    return searchCiiu('', 500).map((entry) => ({
      value: entry.code,
      label: ciiuEntryLabel(entry),
    }))
  }, [])

  const selected = getCiiuByCode(value)

  return (
    <div className="space-y-2">
      <McOptionCombobox
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        inputClassName="mc-input w-full"
        placeholder="Buscá por código o actividad (ej. 4791, comercio, café)…"
        emptyMessage="Sin coincidencias en el catálogo CIIU"
      />
      <p className="text-[11px] leading-relaxed text-[var(--cat-muted)]">
        Catálogo oficial Colombia (CIIU Rev. 4 A.C., {CIIU_COLOMBIA_COUNT} actividades). OnePay exige un código de 4
        dígitos.
      </p>
      {selected ? (
        <div className="border border-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--cat-accent)_10%,transparent)] px-3 py-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-accent)]">
            Actividad seleccionada
          </p>
          <p className="mt-1 text-[14px] font-medium text-[var(--cat-text)]">{selected.description}</p>
          <p className="mt-0.5 font-mono text-[11px] text-[var(--cat-muted)]">CIIU {selected.code}</p>
        </div>
      ) : null}
    </div>
  )
}
