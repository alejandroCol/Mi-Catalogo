import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import { formatCop } from '@/lib/formatCop'
import { productoPrecioVenta } from '@/lib/productoDescuento'
import {
  stockDisponibleTalla,
  tallaEnCarrito,
  tallasValidas,
} from '@/lib/productoTallas'
import {
  agruparVariantesPorTipo,
  stockDisponibleVariante,
  varianteEtiqueta,
  variantesPublicas,
} from '@/lib/productoVariantes'
import type { McProducto, McProductoTalla, McProductoVariante } from '@/types/mc'

type Props = {
  product: McProducto | null
  open: boolean
  onClose: () => void
  onAdded: (productId: string) => void
}

/** Abre sheet si hay tallas (siempre pregunta) o más de una variante. */
export function productNeedsShowroomOptions(product: McProducto): boolean {
  const tallas = tallasValidas(product)
  if (tallas.length > 0) return true
  const vars = variantesPublicas(product)
  return vars.length > 1
}

export function ShowroomQuickAddSheet({ product, open, onClose, onAdded }: Props) {
  const { add, lines } = useCatalogoSimpleCart()
  const [selectedVariant, setSelectedVariant] = useState<McProductoVariante | null>(null)
  const [selectedTalla, setSelectedTalla] = useState<McProductoTalla | null>(null)

  const vars = product ? variantesPublicas(product) : []
  const tallas = product ? tallasValidas(product) : []
  const hasVariants = vars.length > 0
  const hasTallas = tallas.length > 0
  const grupos = useMemo(() => agruparVariantesPorTipo(vars), [vars])

  useEffect(() => {
    if (!open || !product) return
    const nextVars = variantesPublicas(product)
    setSelectedVariant(nextVars.length === 1 ? nextVars[0]! : null)
    const nextTallas = tallasValidas(product)
    // Con una sola talla la preseleccionamos; igual debe confirmar en el sheet.
    setSelectedTalla(nextTallas.length === 1 ? nextTallas[0]! : null)
  }, [open, product?.id])

  const price = product ? productoPrecioVenta(product, selectedVariant ?? undefined) : 0

  const totalEnCarritoProducto = useMemo(() => {
    if (!product) return 0
    return lines.filter((l) => l.productId === product.id).reduce((s, l) => s + l.cantidad, 0)
  }, [lines, product?.id])

  const enCarritoVariante = useMemo(() => {
    if (!product || !selectedVariant) return 0
    return lines
      .filter((l) => l.productId === product.id && l.varianteId === selectedVariant.id)
      .reduce((s, l) => s + l.cantidad, 0)
  }, [lines, product?.id, selectedVariant?.id])

  const disp = useMemo(() => {
    if (!product) return 0
    if (hasTallas && selectedTalla) {
      return stockDisponibleTalla(
        product,
        selectedTalla,
        tallaEnCarrito(lines, product.id, selectedTalla.id),
      )
    }
    if (hasVariants && selectedVariant) {
      return stockDisponibleVariante(
        product,
        selectedVariant,
        enCarritoVariante,
        totalEnCarritoProducto,
      )
    }
    return Math.max(0, Math.floor(product.stock ?? 0) - totalEnCarritoProducto)
  }, [
    product,
    hasTallas,
    selectedTalla,
    hasVariants,
    selectedVariant,
    lines,
    enCarritoVariante,
    totalEnCarritoProducto,
  ])

  const needsVariant = hasVariants && !selectedVariant
  const needsTalla = hasTallas && !selectedTalla
  const canAdd = Boolean(product && !needsVariant && !needsTalla && disp > 0)

  function confirmAdd() {
    if (!product || !canAdd) return
    const tituloParts = [product.nombre]
    if (selectedVariant) tituloParts.push(varianteEtiqueta(selectedVariant))
    if (selectedTalla?.nombre) tituloParts.push(selectedTalla.nombre)
    const imageUrl = selectedVariant?.imageUrl || product.imageUrl
    add({
      productId: product.id,
      ...(selectedVariant ? { varianteId: selectedVariant.id } : {}),
      ...(selectedTalla ? { tallaId: selectedTalla.id } : {}),
      titulo: tituloParts.join(' · '),
      ...(product.referencia?.trim() ? { referencia: product.referencia.trim() } : {}),
      precioUnitarioCop: price,
      ...(imageUrl ? { imageUrl } : {}),
      cantidad: 1,
    })
    onAdded(product.id)
    onClose()
  }

  if (!open || !product) return null

  return (
    <div className="mc-showroom-sheet" role="dialog" aria-modal="true" aria-label="Elegir opciones">
      <button type="button" className="mc-showroom-sheet__backdrop" onClick={onClose} aria-label="Cerrar" />
      <div className="mc-showroom-sheet__panel">
        <div className="mc-showroom-sheet__handle" aria-hidden />
        <div className="mc-showroom-sheet__head">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="mc-showroom-sheet__thumb" />
          ) : (
            <div className="mc-showroom-sheet__thumb" />
          )}
          <div className="min-w-0">
            <p className="mc-showroom-sheet__name">{product.nombre}</p>
            <p className="mc-showroom-sheet__price">{formatCop(price)}</p>
          </div>
        </div>

        {hasVariants
          ? grupos.map((g) => (
              <div key={g.tipo} className="mc-showroom-sheet__block">
                <p className="mc-showroom-sheet__label">{g.tipo || 'Opción'}</p>
                <div className="mc-showroom-sheet__chips">
                  {g.items.map((v) => {
                    const active = selectedVariant?.id === v.id
                    const enCart = lines
                      .filter((l) => l.productId === product.id && l.varianteId === v.id)
                      .reduce((s, l) => s + l.cantidad, 0)
                    const dispV = stockDisponibleVariante(
                      product,
                      v,
                      enCart,
                      totalEnCarritoProducto,
                    )
                    const agotada = dispV < 1
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={agotada}
                        onClick={() => setSelectedVariant(v)}
                        className={clsx(
                          'mc-showroom-sheet__chip',
                          active && 'is-active',
                          agotada && 'is-disabled',
                        )}
                      >
                        {v.hex ? (
                          <span
                            className="mc-showroom-sheet__swatch"
                            style={{ backgroundColor: v.hex }}
                            aria-hidden
                          />
                        ) : null}
                        {varianteEtiqueta(v)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          : null}

        {hasTallas ? (
          <div className="mc-showroom-sheet__block">
            <p className="mc-showroom-sheet__label">Talla</p>
            <div className="mc-showroom-sheet__chips">
              {tallas.map((t) => {
                const active = selectedTalla?.id === t.id
                const dispT = stockDisponibleTalla(
                  product,
                  t,
                  tallaEnCarrito(lines, product.id, t.id),
                )
                const agotada = dispT < 1
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={agotada}
                    onClick={() => setSelectedTalla(t)}
                    className={clsx(
                      'mc-showroom-sheet__chip mc-showroom-sheet__chip--size',
                      active && 'is-active',
                      agotada && 'is-disabled',
                    )}
                  >
                    {t.nombre}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {(needsVariant || needsTalla) && (
          <p className="mc-showroom-sheet__hint">
            {needsTalla ? 'Elegí una talla para continuar.' : 'Elegí una opción para continuar.'}
          </p>
        )}

        <button
          type="button"
          className="mc-showroom-sheet__cta"
          disabled={!canAdd}
          onClick={confirmAdd}
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  )
}
