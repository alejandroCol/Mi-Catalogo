import {
  POS_RANGO_PRESET_LABELS,
  type PosRangoPreset,
} from '@/pos/lib/posDate'

const PRESETS: PosRangoPreset[] = ['hoy', 'ayer', 'semana', 'quincena', 'personalizado']

type Props = {
  preset: PosRangoPreset
  onPresetChange: (preset: PosRangoPreset) => void
  customDesde: string
  customHasta: string
  onCustomDesdeChange: (value: string) => void
  onCustomHastaChange: (value: string) => void
  hoy: string
  className?: string
}

export function PosRangoFechasFilter({
  preset,
  onPresetChange,
  customDesde,
  customHasta,
  onCustomDesdeChange,
  onCustomHastaChange,
  hoy,
  className,
}: Props) {
  return (
    <div className={className ?? 'mc-pos-reportes-filters'}>
      <div className="mc-pos-reportes-presets">
        {PRESETS.map((id) => (
          <button
            key={id}
            type="button"
            className={`mc-pos-payment-pill ${preset === id ? 'mc-pos-payment-pill--active' : ''}`}
            onClick={() => onPresetChange(id)}
          >
            {POS_RANGO_PRESET_LABELS[id]}
          </button>
        ))}
      </div>
      {preset === 'personalizado' && (
        <>
          <label className="mc-pos-field mc-pos-field--inline">
            <span>Desde</span>
            <input
              type="date"
              value={customDesde}
              max={customHasta > hoy ? hoy : customHasta}
              onChange={(e) => onCustomDesdeChange(e.target.value)}
            />
          </label>
          <label className="mc-pos-field mc-pos-field--inline">
            <span>Hasta</span>
            <input
              type="date"
              value={customHasta}
              min={customDesde}
              max={hoy}
              onChange={(e) => onCustomHastaChange(e.target.value)}
            />
          </label>
        </>
      )}
    </div>
  )
}
