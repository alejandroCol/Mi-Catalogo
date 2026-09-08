import { parseDecimalInput } from '@/app/envio/envioFormShared'
import { MC_ENVIO_EMPAQUE_CAMISETA } from '@/lib/envioCotizacion'
import { parseEmpaqueDims, type EmpaqueDims } from '@/lib/envioEmpaquePack'
import type { McProducto, McProductoEnvioMedidas } from '@/types/mc'

export type ProductoEnvioMedidasDraft = {
  enabled: boolean
  pesoKg: string
  largoCm: string
  anchoCm: string
  altoCm: string
}

export function emptyProductoEnvioMedidasDraft(): ProductoEnvioMedidasDraft {
  return { enabled: false, pesoKg: '', largoCm: '', anchoCm: '', altoCm: '' }
}

export function productEnvioMedidasDraftFromProduct(
  product: Pick<McProducto, 'envioMedidas'> | null | undefined,
): ProductoEnvioMedidasDraft {
  const medidas = parseEmpaqueDims(product?.envioMedidas)
  if (!medidas) return emptyProductoEnvioMedidasDraft()
  return {
    enabled: true,
    pesoKg: String(medidas.pesoKg),
    largoCm: String(medidas.largoCm),
    anchoCm: String(medidas.anchoCm),
    altoCm: String(medidas.altoCm),
  }
}

export function productoEnvioMedidasDraftFromCamiseta(): ProductoEnvioMedidasDraft {
  return {
    enabled: true,
    pesoKg: String(MC_ENVIO_EMPAQUE_CAMISETA.pesoKg),
    largoCm: String(MC_ENVIO_EMPAQUE_CAMISETA.largoCm),
    anchoCm: String(MC_ENVIO_EMPAQUE_CAMISETA.anchoCm),
    altoCm: String(MC_ENVIO_EMPAQUE_CAMISETA.altoCm),
  }
}

export function parseProductoEnvioMedidasDraft(
  draft: ProductoEnvioMedidasDraft,
): { ok: true; medidas: McProductoEnvioMedidas | null } | { ok: false; error: string } {
  if (!draft.enabled) return { ok: true, medidas: null }
  const pesoKg = parseDecimalInput(draft.pesoKg, 30)
  const largoCm = parseDecimalInput(draft.largoCm, 200)
  const anchoCm = parseDecimalInput(draft.anchoCm, 200)
  const altoCm = parseDecimalInput(draft.altoCm, 200)
  if (!pesoKg || !largoCm || !anchoCm || !altoCm) {
    return { ok: false, error: 'Completá peso y las tres medidas de envío, o desmarcá la opción.' }
  }
  return { ok: true, medidas: { pesoKg, largoCm, anchoCm, altoCm } }
}

export function draftHasProductoEnvioMedidas(draft: ProductoEnvioMedidasDraft): boolean {
  return (
    draft.enabled ||
    Boolean(draft.pesoKg.trim() || draft.largoCm.trim() || draft.anchoCm.trim() || draft.altoCm.trim())
  )
}

export function medidasToEmpaqueDims(medidas: McProductoEnvioMedidas | null): EmpaqueDims | null {
  return medidas ? parseEmpaqueDims(medidas) : null
}
