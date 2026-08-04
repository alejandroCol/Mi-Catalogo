import type { McProducto, McProductoSku, McProductoTalla, McProductoVariante } from '@/types/mc'
import {
  createCurvaZapatosDraft,
  createTallaDraft,
  type TallaDraft,
} from '@/lib/productoTallas'
import { parseStockInput, variantesPublicas } from '@/lib/productoVariantes'
import type { RopaStockPayload } from '@/lib/productoSkus'
import { sumarStockSkus, syncTallasStockFromSkus } from '@/lib/productoSkus'
import { imagenDraftFromProducto, resolveImagenesFromDrafts, uploadVarianteImagenes, type ProductoImagenDraft } from '@/lib/productoImagenes'
import type { FirebaseStorage } from 'firebase/storage'

export type ColorZapatoDraft = {
  id: string
  nombre: string
  hex: string
  tipo: string
  tallas: TallaDraft[]
  imagenes: ProductoImagenDraft[]
  coverId: string | null
}

export function createColorZapatoDraft(partial?: Partial<Omit<ColorZapatoDraft, 'id' | 'tallas'>>): ColorZapatoDraft {
  return {
    id: crypto.randomUUID(),
    nombre: '',
    hex: '#525252',
    tipo: 'Color',
    tallas: createCurvaZapatosDraft(),
    imagenes: [],
    coverId: null,
    ...partial,
  }
}

export function colorTieneImagenes(color: ColorZapatoDraft): boolean {
  return color.imagenes.length > 0
}

/** Elige el color cuya portada será la imagen principal del producto. */
export function resolveImagenPrincipalColorId(
  colores: ColorZapatoDraft[],
  current: string | null,
): string | null {
  const conFotos = colores.filter((c) => colorTieneImagenes(c))
  if (conFotos.length === 0) return null
  if (current && conFotos.some((c) => c.id === current)) return current
  if (conFotos.length === 1) return conFotos[0]!.id
  return conFotos[0]!.id
}

export function colorZapatoToVariante(
  color: ColorZapatoDraft,
  imgs?: { imageUrl?: string; galeriaImagenes?: string[] },
): McProductoVariante | null {
  const nombre = color.nombre.trim()
  if (!nombre) return null
  return {
    id: color.id,
    nombre,
    tipo: color.tipo.trim() || 'Color',
    ...(color.hex?.trim() ? { hex: color.hex.trim() } : {}),
    ...(imgs?.imageUrl ? { imageUrl: imgs.imageUrl } : {}),
    ...(imgs?.galeriaImagenes?.length ? { galeriaImagenes: imgs.galeriaImagenes } : {}),
  }
}

export function productImageFromZapatosVariantes(
  variantes: McProductoVariante[],
  imagenPrincipalColorId?: string | null,
): { imageUrl?: string; imagenPrincipalColorId?: string } {
  if (variantes.length === 0) return {}
  const principal =
    (imagenPrincipalColorId && variantes.find((v) => v.id === imagenPrincipalColorId)) ||
    variantes.find((v) => v.imageUrl) ||
    variantes[0]
  if (!principal?.imageUrl) return {}
  return { imageUrl: principal.imageUrl, imagenPrincipalColorId: principal.id }
}

/** Arma tallas/skus cuando cada color tiene su propia curva de tallas. */
export function buildZapatosStockPayload(colores: ColorZapatoDraft[]): RopaStockPayload {
  const tallas: McProductoTalla[] = []
  const skus: McProductoSku[] = []

  for (const color of colores) {
    if (!color.nombre.trim()) continue
    for (const t of color.tallas) {
      const nombreTalla = t.nombre.trim()
      if (!nombreTalla) continue
      const stock = parseStockInput(t.stock)
      const tallaId = t.id
      tallas.push({ id: tallaId, nombre: nombreTalla, stock })
      skus.push({
        id: crypto.randomUUID(),
        varianteId: color.id,
        tallaId,
        stock,
      })
    }
  }

  const tallasBase = tallas.map((t) => ({ ...t, stock: 0 }))
  return {
    tallas: syncTallasStockFromSkus(tallasBase, skus),
    skus,
    stockFinal: sumarStockSkus(skus),
    usaMatriz: true,
  }
}

function imagenesDraftFromVariante(v: McProductoVariante): Pick<ColorZapatoDraft, 'imagenes' | 'coverId'> {
  const { items, coverId } = imagenDraftFromProducto({ imageUrl: v.imageUrl, galeriaImagenes: v.galeriaImagenes })
  return { imagenes: items, coverId }
}

export function coloresZapatosDraftFromProducto(product: McProducto): ColorZapatoDraft[] {
  const colores = variantesPublicas(product)
  if (colores.length === 0) return []

  const skus = product.skus ?? []
  const tallasById = new Map((product.tallas ?? []).map((t) => [t.id, t]))

  return colores.map((c) => {
    const colorSkus = skus.filter((s) => s.varianteId === c.id)
    let tallas: TallaDraft[]
    if (colorSkus.length > 0) {
      tallas = colorSkus.map((s) => {
        const meta = tallasById.get(s.tallaId)
        return {
          id: s.tallaId,
          nombre: meta?.nombre ?? '',
          stock: String(Math.max(0, Math.floor(s.stock ?? 0))),
        }
      })
    } else {
      tallas = createCurvaZapatosDraft()
    }
    const { imagenes, coverId } = imagenesDraftFromVariante(c)
    return {
      id: c.id,
      nombre: c.nombre,
      hex: c.hex ?? '#525252',
      tipo: c.tipo?.trim() || 'Color',
      tallas,
      imagenes,
      coverId,
    }
  })
}

export function sumarStockColoresZapatos(colores: ColorZapatoDraft[]): number {
  let total = 0
  for (const c of colores) {
    for (const t of c.tallas) {
      total += parseStockInput(t.stock)
    }
  }
  return total
}

export function coloresZapatosTienenStock(colores: ColorZapatoDraft[]): boolean {
  return sumarStockColoresZapatos(colores) > 0
}

/** Tallas disponibles para un color en catálogo (curvas independientes por color). */
export function tallasParaVarianteZapatos(prod: McProducto, varianteId: string): McProductoTalla[] {
  if (prod.tallaModo !== 'zapatos' || !(prod.skus?.length ?? 0)) {
    return (prod.tallas ?? []).filter((t) => t.nombre?.trim())
  }
  const tallaIds = new Set(
    prod.skus!.filter((s) => s.varianteId === varianteId).map((s) => s.tallaId),
  )
  return (prod.tallas ?? []).filter((t) => tallaIds.has(t.id) && t.nombre?.trim())
}

export function varianteZapatosConImagenes(v: McProductoVariante): boolean {
  return !!(v.imageUrl || (v.galeriaImagenes?.length ?? 0) > 0)
}

export function agregarColorSugerido(
  colores: ColorZapatoDraft[],
  nombre: string,
  hex: string,
): ColorZapatoDraft[] {
  if (colores.some((c) => c.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
    return colores
  }
  return [...colores, createColorZapatoDraft({ nombre, hex, tipo: 'Color' })]
}

export function duplicarCurvaTallasEnColor(color: ColorZapatoDraft, tallas: TallaDraft[]): ColorZapatoDraft {
  return {
    ...color,
    tallas: tallas.map((t) => createTallaDraft(t.nombre, t.stock)),
  }
}

export async function uploadColoresZapatosVariantes(
  storage: FirebaseStorage,
  tenantId: string,
  productId: string,
  colores: ColorZapatoDraft[],
): Promise<McProductoVariante[]> {
  const out: McProductoVariante[] = []
  for (const c of colores.filter((row) => row.nombre.trim())) {
    let imgs: { imageUrl?: string; galeriaImagenes?: string[] } = {}
    if (c.imagenes.length > 0) {
      const hasNew = c.imagenes.some((i) => i.kind === 'new')
      imgs = hasNew
        ? await uploadVarianteImagenes(storage, tenantId, productId, c.id, c.imagenes, c.coverId)
        : resolveImagenesFromDrafts(c.imagenes, c.coverId)
    }
    const v = colorZapatoToVariante(c, imgs)
    if (v) out.push(v)
  }
  return out
}

export function serializeColoresZapatosForDraft(colores: ColorZapatoDraft[]): ColorZapatoDraft[] {
  return colores.map((c) => ({
    ...c,
    imagenes: c.imagenes.filter((i): i is Extract<ProductoImagenDraft, { kind: 'existing' }> => i.kind === 'existing'),
  }))
}
