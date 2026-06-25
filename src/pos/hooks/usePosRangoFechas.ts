import { useMemo, useState } from 'react'
import {
  posFechaKeyLocal,
  posFormatRangoLabel,
  posRangoFechas,
  posRangoPresetToRange,
  type PosRangoPreset,
} from '@/pos/lib/posDate'

export function usePosRangoFechas(initialPreset: PosRangoPreset = 'hoy') {
  const hoy = posFechaKeyLocal()
  const [preset, setPreset] = useState<PosRangoPreset>(initialPreset)
  const [customDesde, setCustomDesde] = useState(hoy)
  const [customHasta, setCustomHasta] = useState(hoy)

  const range = useMemo(() => {
    if (preset === 'personalizado') {
      return posRangoPresetToRange('personalizado', { desde: customDesde, hasta: customHasta })
    }
    return posRangoPresetToRange(preset)
  }, [preset, customDesde, customHasta])

  const { start, end } = useMemo(() => posRangoFechas(range.desde, range.hasta), [range])
  const label = posFormatRangoLabel(range.desde, range.hasta)
  const multiDay = range.desde !== range.hasta

  return {
    preset,
    setPreset,
    customDesde,
    setCustomDesde,
    customHasta,
    setCustomHasta,
    range,
    start,
    end,
    label,
    multiDay,
    hoy,
  }
}
