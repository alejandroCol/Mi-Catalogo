import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore'
import { ProductoVariantesEditor } from '@/components/producto/ProductoVariantesEditor'
import { ProductoRopaSkuMatrixEditor } from '@/components/producto/ProductoRopaSkuMatrixEditor'
import { getDb } from '@/lib/firebase'
import {
  mcPosProductosCollection,
  mcPosStockCollection,
  mcPosStockDocId,
} from '@/lib/mcPosCollections'
import { mcProductosCollection } from '@/lib/mcCollections'
import {
  buildTallasFromDrafts,
  createCurvaTallasDraft,
  createCurvaZapatosDraft,
  type TallaDraft,
} from '@/lib/productoTallas'
import {
  buildVarianteFromDraft,
  parsePrecioVarianteOpcional,
  type VarianteDraftConArchivo,
} from '@/lib/productoVariantes'
import {
  buildPosRopaStockFromDrafts,
  ensureSkuDraftMatrix,
  ropaPosUsaMatrizEnForm,
  validatePosRopaStock,
  type SkuDraft,
} from '@/pos/lib/posProductoSkus'
import { formatCopInputWhileTyping, parseCopInput } from '@/pos/lib/posCopInput'
import { generatePosCodigoBarras, generatePosCodigoInterno } from '@/pos/lib/posBarcode'
import {
  buildPosVariantesFromDrafts,
  catalogVariantesFromPosVariantes,
  sumarStockFromVarianteDrafts,
} from '@/pos/lib/posProductoVariantes'
import { PosTallasStockEditor } from '@/pos/components/PosTallasStockEditor'
import type { McPosSede, McPosVariante } from '@/types/mc'

type StockModo = 'simple' | 'ropa' | 'zapatos' | 'variantes'

type Props = {
  open: boolean
  tenantId: string
  sedeId: string
  sede?: McPosSede
  onClose: () => void
  onCreated: () => void
}

export function PosNuevoProductoModal({ open, tenantId, sedeId, sede, onClose, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [precioInput, setPrecioInput] = useState('')
  const [precioCostoInput, setPrecioCostoInput] = useState('')
  const [stockInput, setStockInput] = useState('0')
  const [stockModo, setStockModo] = useState<StockModo>('simple')
  const [tallas, setTallas] = useState<TallaDraft[]>([])
  const [colores, setColores] = useState<VarianteDraftConArchivo[]>([])
  const [skuMatrix, setSkuMatrix] = useState<SkuDraft[]>([])
  const [variantes, setVariantes] = useState<VarianteDraftConArchivo[]>([])
  const [codigo] = useState(() => generatePosCodigoInterno())
  const [codigoBarras] = useState(() => generatePosCodigoBarras())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function activarTallasRopa() {
    setStockModo('ropa')
    setTallas(createCurvaTallasDraft())
    setColores([])
    setSkuMatrix([])
    setVariantes([])
    setStockInput('0')
  }

  function activarTallasZapatos() {
    setStockModo('zapatos')
    setTallas(createCurvaZapatosDraft())
    setColores([])
    setSkuMatrix([])
    setVariantes([])
    setStockInput('0')
  }

  function usarStockSimple() {
    setStockModo('simple')
    setTallas([])
    setColores([])
    setSkuMatrix([])
    setVariantes([])
  }

  function activarVariantes() {
    setStockModo('variantes')
    setTallas([])
    setColores([])
    setSkuMatrix([])
    setStockInput('0')
  }

  const colorRows = colores.filter((v) => v.nombre.trim())
  const usaMatrizRopa = stockModo === 'ropa' && ropaPosUsaMatrizEnForm(colorRows.length)
  const colorMatrixKey = colorRows.map((v) => `${v.id}:${v.nombre.trim()}`).join('|')
  const tallaMatrixKey = tallas.map((t) => `${t.id}:${t.nombre}`).join('|')

  useEffect(() => {
    if (!usaMatrizRopa) return
    const builtTallas = buildTallasFromDrafts(tallas)
    const builtVar = colorRows
      .map((v) => buildVarianteFromDraft(v))
      .filter((v): v is NonNullable<ReturnType<typeof buildVarianteFromDraft>> => v != null)
    setSkuMatrix((prev) => ensureSkuDraftMatrix(builtVar, builtTallas, prev))
  }, [usaMatrizRopa, tallaMatrixKey, colorMatrixKey, tallas, colorRows])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return

    const usaTallas = stockModo === 'ropa' || stockModo === 'zapatos'
    const usaVariantes = stockModo === 'variantes'
    const ropaStock = usaTallas
      ? buildPosRopaStockFromDrafts({ tallas, colores, skuMatrix })
      : null
    const varianteRows = usaVariantes ? variantes.filter((v) => v.nombre.trim()) : []
    const builtPosVariantes = usaVariantes ? buildPosVariantesFromDrafts(varianteRows) : []
    const cantidadSimple = Math.max(0, Math.round(Number(stockInput) || 0))
    const cantidadTotal = usaTallas
      ? ropaStock!.stockTotal
      : usaVariantes
        ? sumarStockFromVarianteDrafts(varianteRows)
        : cantidadSimple

    if (usaTallas) {
      const errRopa = validatePosRopaStock(ropaStock!)
      if (errRopa) {
        setError(errRopa)
        return
      }
    }

    if (usaVariantes && builtPosVariantes.length === 0) {
      setError('Agregá al menos una variante con nombre.')
      return
    }

    if (usaVariantes) {
      for (const v of varianteRows) {
        if (v.precio.trim() && parsePrecioVarianteOpcional(v.precio) == null) {
          setError(`Precio opcional inválido en variante «${v.nombre.trim()}».`)
          return
        }
      }
      if (cantidadTotal <= 0) {
        setError('Indicá stock en al menos una variante.')
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      const db = getDb()
      const now = Date.now()
      const precioCop = parseCopInput(precioInput)
      const precioCostoCop = precioCostoInput.trim() ? parseCopInput(precioCostoInput) : undefined

      const variantesPos: McPosVariante[] | null = usaTallas
        ? ropaStock!.tallasPos
        : usaVariantes
          ? builtPosVariantes
          : null

      const prodRef = await addDoc(collection(db, mcPosProductosCollection(tenantId)), {
        nombre: nombre.trim(),
        codigo,
        codigoBarras,
        precioCop,
        ...(precioCostoCop != null && precioCostoCop >= 0 ? { precioCostoCop } : {}),
        activo: true,
        sedeId,
        ...(usaTallas ? { posStockModo: ropaStock!.posStockModo } : {}),
        ...(usaTallas && ropaStock!.posColores?.length ? { posColores: ropaStock!.posColores } : {}),
        ...(usaVariantes ? { posStockModo: 'variantes' } : {}),
        variantes: variantesPos?.length ? variantesPos : null,
        createdAt: now,
        updatedAt: now,
      })

      const batch = writeBatch(db)

      if (usaTallas) {
        for (const row of ropaStock!.stockRows) {
          batch.set(
            doc(
              db,
              mcPosStockCollection(tenantId),
              mcPosStockDocId(sedeId, prodRef.id, row.varianteId, row.tallaId),
            ),
            {
              sedeId,
              productoId: prodRef.id,
              ...(row.varianteId ? { varianteId: row.varianteId } : {}),
              ...(row.tallaId ? { tallaId: row.tallaId } : {}),
              cantidad: row.cantidad,
              updatedAt: now,
            },
          )
        }
      } else if (usaVariantes) {
        for (const v of varianteRows) {
          const cantidad = Math.max(0, Math.round(Number(v.stock.replace(/\D/g, '')) || 0))
          if (cantidad > 0) {
            batch.set(
              doc(db, mcPosStockCollection(tenantId), mcPosStockDocId(sedeId, prodRef.id, v.id)),
              { sedeId, productoId: prodRef.id, varianteId: v.id, cantidad, updatedAt: now },
            )
          }
        }
      } else if (cantidadSimple > 0) {
        batch.set(doc(db, mcPosStockCollection(tenantId), mcPosStockDocId(sedeId, prodRef.id)), {
          sedeId,
          productoId: prodRef.id,
          cantidad: cantidadSimple,
          updatedAt: now,
        })
      }

      if (sede?.mostrarEnTiendaVirtual) {
        const stockById = new Map(
          varianteRows.map((v) => [v.id, Math.max(0, Math.round(Number(v.stock.replace(/\D/g, '')) || 0))]),
        )
        const catalogRef = doc(collection(db, mcProductosCollection(tenantId)))
        batch.set(catalogRef, {
          nombre: nombre.trim(),
          precioCop,
          ...(precioCostoCop != null && precioCostoCop >= 0 ? { precioCostoCop } : {}),
          stock: cantidadTotal,
          activo: true,
          enCatalogo: false,
          esBorrador: true,
          origenPos: true,
          posProductoId: prodRef.id,
          posSedeId: sedeId,
          posPendientePublicar: true,
          orden: now,
          createdAt: now,
          updatedAt: now,
          ...(usaTallas && ropaStock!.catalogPayload
            ? {
                esRopa: true,
                ...(stockModo === 'zapatos' ? { tallaModo: 'zapatos' as const } : { tallaModo: 'ropa' as const }),
                tallas: ropaStock!.catalogPayload.tallas,
                ...(ropaStock!.catalogPayload.variantes.length
                  ? { variantes: ropaStock!.catalogPayload.variantes }
                  : {}),
                ...(ropaStock!.catalogPayload.skus?.length
                  ? { skus: ropaStock!.catalogPayload.skus }
                  : {}),
              }
            : {}),
          ...(usaVariantes
            ? { variantes: catalogVariantesFromPosVariantes(builtPosVariantes, stockById) }
            : {}),
        })
        batch.update(prodRef, { catalogProductoId: catalogRef.id })
      }

      await batch.commit()

      onCreated()
      onClose()
    } catch {
      setError('No se pudo crear el producto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
      <div className="mc-pos-modal mc-pos-modal--wide mc-pos-modal--stacked">
        <div className="shrink-0 space-y-2">
          <h2 className="mc-pos-modal__title">Nuevo producto</h2>
          {sede && <p className="mc-pos-muted text-sm">Sede: {sede.nombre}</p>}
          {error && <p className="mc-pos-status mc-pos-status--error">{error}</p>}
        </div>
        <form className="mc-pos-modal__form" onSubmit={guardar}>
          <div className="mc-pos-modal__body mc-pos-form-grid">
            <label className="mc-pos-field mc-pos-field--full">
              <span>Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
            </label>
            <label className="mc-pos-field">
              <span>Código interno</span>
              <input value={codigo} readOnly className="mc-pos-field--readonly" />
            </label>
            <label className="mc-pos-field">
              <span>Precio</span>
              <input
                inputMode="numeric"
                value={precioInput}
                onChange={(e) => setPrecioInput(formatCopInputWhileTyping(e.target.value))}
                required
              />
            </label>
            <label className="mc-pos-field">
              <span>Precio de costo (opcional)</span>
              <input
                inputMode="numeric"
                value={precioCostoInput}
                onChange={(e) => setPrecioCostoInput(formatCopInputWhileTyping(e.target.value))}
                placeholder="Para calcular ganancias"
              />
            </label>
            <label className="mc-pos-field mc-pos-field--full">
              <span>Código de barras</span>
              <input value={codigoBarras} readOnly className="mc-pos-field--readonly" />
              <span className="mc-pos-muted text-xs">Generado automáticamente para escanear en caja.</span>
            </label>

            <div className="mc-pos-field mc-pos-field--full">
              <span>Stock</span>
              <div className="mc-pos-tallas-mode">
                <button
                  type="button"
                  className={`mc-pos-tallas-mode__btn ${stockModo === 'simple' ? 'mc-pos-tallas-mode__btn--active' : ''}`}
                  onClick={usarStockSimple}
                >
                  Stock único
                </button>
                <button
                  type="button"
                  className={`mc-pos-tallas-mode__btn ${stockModo === 'variantes' ? 'mc-pos-tallas-mode__btn--active' : ''}`}
                  onClick={activarVariantes}
                >
                  Variantes
                </button>
                <button
                  type="button"
                  className={`mc-pos-tallas-mode__btn ${stockModo === 'ropa' ? 'mc-pos-tallas-mode__btn--active' : ''}`}
                  onClick={activarTallasRopa}
                >
                  Tallas ropa
                </button>
                <button
                  type="button"
                  className={`mc-pos-tallas-mode__btn ${stockModo === 'zapatos' ? 'mc-pos-tallas-mode__btn--active' : ''}`}
                  onClick={activarTallasZapatos}
                >
                  Tallas zapatos
                </button>
              </div>
            </div>

            {stockModo === 'simple' ? (
              <label className="mc-pos-field">
                <span>Stock inicial</span>
                <input
                  inputMode="numeric"
                  value={stockInput}
                  onChange={(e) => setStockInput(e.target.value.replace(/\D/g, ''))}
                />
              </label>
            ) : stockModo === 'variantes' ? (
              <div className="mc-pos-field mc-pos-field--full">
                <ProductoVariantesEditor
                  variantes={variantes}
                  onChange={setVariantes}
                  allowImage={false}
                  disabled={saving}
                />
              </div>
            ) : (
              <div className="mc-pos-field mc-pos-field--full space-y-4">
                <PosTallasStockEditor
                  tallas={tallas}
                  onChange={setTallas}
                  modo={stockModo}
                  disabled={saving}
                  hideStock={usaMatrizRopa}
                  titulo={usaMatrizRopa ? 'Curva de tallas' : undefined}
                />
                {stockModo === 'ropa' ? (
                  <ProductoVariantesEditor
                    variantes={colores}
                    onChange={setColores}
                    allowImage={false}
                    esRopa
                    disabled={saving}
                  />
                ) : null}
                {usaMatrizRopa ? (
                  <ProductoRopaSkuMatrixEditor
                    variantes={colorRows.map((v) => ({
                      id: v.id,
                      nombre: v.nombre.trim(),
                      hex: v.hex,
                      tipo: v.tipo,
                    }))}
                    tallas={tallas}
                    skus={skuMatrix}
                    onChange={setSkuMatrix}
                    disabled={saving}
                  />
                ) : null}
              </div>
            )}
          </div>

          <div className="mc-pos-modal__actions shrink-0">
            <button type="button" className="mc-landing-btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="mc-landing-btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
