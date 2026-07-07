import type { McTallerBrandType } from '@/types/mc'

export const MC_TALLER_BRAND_TYPE_OPTIONS: { value: McTallerBrandType; label: string }[] = [
  { value: 'start_selling', label: 'Quiero empezar a vender productos' },
  { value: 'new_brand', label: 'Tengo una marca nueva' },
  { value: 'established_brand', label: 'Tengo una marca hace años' },
  { value: 'switch_for_costs', label: 'Quiero cambiar mi tienda actual por costos' },
  { value: 'other', label: 'Otro' },
]

export function mcTallerBrandTypeLabel(type: McTallerBrandType, otherText?: string): string {
  if (type === 'other' && otherText?.trim()) return otherText.trim()
  return MC_TALLER_BRAND_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}
