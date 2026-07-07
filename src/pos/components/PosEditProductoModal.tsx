import { useEffect, useMemo, useState } from 'react'
import { deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { ProductoVariantesEditor } from '@/components/producto/ProductoVariantesEditor'
import { ProductoRopaSkuMatrixEditor } from '@/components/producto/ProductoRopaSkuMatrixEditor'
import { useMcAuth } from '@/auth/McAuthContext'
import { getDb } from '@/lib/firebase'
import { mcPosProductosCollection, mcPosStockCollection, mcPosStockDocId } from '@/lib/mcPosCollections'
import { buildTallasFromDrafts } from '@/lib/productoTallas'
import type { TallaDraft } from '@/lib/productoTallas'
import {
  buildVarianteFromDraft,
  parsePrecioVarianteOpcional,
  type VarianteDraftConArchivo,
} from '@/lib/productoVariantes'
import { formatCopInputWhileTyping, parseCopInput } from '@/pos/lib/posCopInput'
import {
  mergeSedeStockIntoGlobal,
  removeCatalogMirrorForPosProduct,
  sumStockForProduct,
  syncCatalogStockFromPos,
} from '@/pos/lib/posCatalogSync'
import {
  buildPosRopaStockFromDrafts,
  coloresDraftFromPosProducto,
  ensureSkuDraftMatrix,
  skusDraftFromPosStock,
  validatePosRopaStock,
  type SkuDraft,
} from '@/pos/lib/posProductoSkus'
import {
  buildPosVariantesFromDrafts,
  inferPosStockModo,
  variantesDraftFromPosProducto,
} from '@/pos/lib/posProductoVariantes'
import { PosTallasStockEditor } from '@/pos/components/PosTallasStockEditor'
import type { McPosProducto, McPosStock } from '@/types/mc'

type Props = {
  producto: McPosProducto & { id: string }
  sedeId: string
  stockSede: (McPosStock & { id: string })[]
  stockGlobal: (McPosStock & { id: string })[]
  onClose: () => void
  onSaved: () => void
}

function inferTallaModo(nombres: string[]): 'ropa' | 'zapatos' {
  if (nombres.length > 0 && nombres.every((n) => /^\d{2}$/.test(n))) return 'zapatos'
  return 'ropa'
}

function stockRowsForProduct(stock: McPosStock[], productoId: string, sedeId: string) {
  return stock.filter((s) => s.productoId === productoId && s.sedeId === sedeId)
}

export function PosEditProductoModal({
  producto,
  sedeId,
  stockSede,
  stockGlobal,
  onClose,
  onSaved,
}: Props) {
  const { tenant, profile } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const stockModo = inferPosStockModo(producto)
  const usaSkus = stockModo === 'skus'
  const usaTallas = stockModo === 'tallas'
  const usaVariantes = stockModo === 'variantes'
  const stockProducto = useMemo(
    () => stockRowsForProduct(stockSede, producto.id, sedeId),
    [stockSede, producto.id, sedeId],
  )

  const [nombre, setNombre] = useState(producto.nombre)
  const [codigo, setCodigo] = useState(producto.codigo ?? '')
  const [codigoBarras, setCodigoBarras] = useState(producto.codigoBarras ?? '')
  const [precioInput, setPrecioInput] = useState(String(producto.precioCop))
  const [precioCostoInput, setPrecioCostoInput] = useState(
    producto.precioCostoCop != null ? String(producto.precioCostoCop) : '',
  )
  const [stockSimple, setStockSimple] = useState(() => {
    const row = stockProducto.find((s) => !s.varianteId)
    return String(row?.cantidad ?? 0)
  })
  const [tallasStock, setTallasStock] = useState<TallaDraft[]>(() =>
    (producto.variantes ?? []).map((v) => {
      const row = stockProducto.find((s) => s.varianteId === v.id && !s.tallaId)
      return { id: v.id, nombre: v.nombre, stock: String(row?.cantidad ?? 0) }
    }),
  )
  const [colores, setColores] = useState<VarianteDraftConArchivo[]>(() =>
    usaSkus ? coloresDraftFromPosProducto(producto) : [],
  )
  const [skuMatrix, setSkuMatrix] = useState<SkuDraft[]>(() =>
    usaSkus ? skusDraftFromPosStock(producto, stockProducto) : [],
  )
  const [variantes, setVariantes] = useState<VarianteDraftConArchivo[]>(() =>
    usaVariantes ? variantesDraftFromPosProducto(producto, stockProducto) : [],
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const tallaModo = inferTallaModo((producto.variantes ?? []).map((v) => v.nombre))
  const colorRows = colores.filter((v) => v.nombre.trim())
  const colorMatrixKey = colorRows.map((v) => `${v.id}:${v.nombre.trim()}`).join('|')
  const tallaMatrixKey = tallasStock.map((t) => `${t.id}:${t.nombre}`).join('|')

  useEffect(() => {
    if (!usaSkus) return
    const builtTallas = buildTallasFromDrafts(tallasStock)
    const builtVar = colorRows
      .map((v) => buildVarianteFromDraft(v))
      .filter((v): v is NonNullable<ReturnType<typeof buildVarianteFromDraft>> => v != null)
    setSkuMatrix((prev) => ensureSkuDraftMatrix(builtVar, builtTallas, prev))
  }, [usaSkus, tallaMatrixKey, colorMatrixKey, tallasStock, colorRows])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !nombre.trim() || !sedeId) return

    const varianteRows = variantes.filter((v) => v.nombre.trim())
    const ropaStock = usaSkus
      ? buildPosRopaStockFromDrafts({ tallas: tallasStock, colores, skuMatrix })
      : null

    if (usaSkus) {
      const errRopa = validatePosRopaStock(ropaStock!)
      if (errRopa) {
        setMsg(errRopa)
        return
      }
    }

    if (usaVariantes) {
      for (const v of varianteRows) {
        if (v.precio.trim() && parsePrecioVarianteOpcional(v.precio) == null) {
          setMsg(`Precio opcional inválido en variante «${v.nombre.trim()}».`)
          return
        }
      }
      if (buildPosVariantesFromDrafts(varianteRows).length === 0) {
        setMsg('Agregá al menos una variante con nombre.')
        return
      }
    }

    setSaving(true)
    setMsg(null)
    try {
      const db = getDb()
      const now = Date.now()
      const precioCop = parseCopInput(precioInput)
      const precioCostoCop = precioCostoInput.trim() ? parseCopInput(precioCostoInput) : null
      const batch = writeBatch(db)

      const productPatch: Record<string, unknown> = {
        nombre: nombre.trim(),
        codigo: codigo.trim() || null,
        codigoBarras: codigoBarras.trim() || null,
        precioCop,
        precioCostoCop,
        updatedAt: now,
      }

      if (usaSkus && ropaStock) {
        productPatch.posStockModo = 'skus'
        productPatch.posColores = ropaStock.posColores ?? []
        productPatch.variantes = ropaStock.tallasPos
      }

      if (usaVariantes) {
        productPatch.posStockModo = 'variantes'
        productPatch.variantes = buildPosVariantesFromDrafts(varianteRows)
      }

      batch.update(doc(db, mcPosProductosCollection(tenantId), producto.id), productPatch)

      const sedeRows: { varianteId?: string; tallaId?: string; cantidad: number }[] = []

      if (usaSkus && ropaStock) {
        const validPairs = new Set<string>()
        for (const c of ropaStock.posColores ?? []) {
          for (const t of ropaStock.tallasPos) {
            validPairs.add(`${c.id}__${t.id}`)
          }
        }
        for (const old of stockProducto) {
          if (!old.varianteId || !old.tallaId) continue
          if (!validPairs.has(`${old.varianteId}__${old.tallaId}`)) {
            batch.delete(doc(db, mcPosStockCollection(tenantId), old.id))
          }
        }
        const rowPairs = new Set(
          ropaStock.stockRows.map((r) => `${r.varianteId}__${r.tallaId}`),
        )
        for (const c of ropaStock.posColores ?? []) {
          for (const t of ropaStock.tallasPos) {
            const pair = `${c.id}__${t.id}`
            if (!rowPairs.has(pair)) {
              const existing = stockProducto.find(
                (s) => s.varianteId === c.id && s.tallaId === t.id,
              )
              if (existing?.id) {
                batch.delete(doc(db, mcPosStockCollection(tenantId), existing.id))
              }
            }
          }
        }
        for (const row of ropaStock.stockRows) {
          sedeRows.push(row)
          batch.set(
            doc(
              db,
              mcPosStockCollection(tenantId),
              mcPosStockDocId(sedeId, producto.id, row.varianteId, row.tallaId),
            ),
            {
              sedeId,
              productoId: producto.id,
              ...(row.varianteId ? { varianteId: row.varianteId } : {}),
              ...(row.tallaId ? { tallaId: row.tallaId } : {}),
              cantidad: row.cantidad,
              updatedAt: now,
            },
            { merge: true },
          )
        }
      } else if (usaTallas) {
        const nextIds = new Set(tallasStock.map((t) => t.id))
        for (const old of stockProducto) {
          if (old.varianteId && !old.tallaId && !nextIds.has(old.varianteId)) {
            batch.delete(doc(db, mcPosStockCollection(tenantId), old.id))
          }
        }
        for (const t of tallasStock) {
          const cantidad = Math.max(0, Math.round(Number(t.stock.replace(/\D/g, '')) || 0))
          sedeRows.push({ varianteId: t.id, cantidad })
          batch.set(
            doc(db, mcPosStockCollection(tenantId), mcPosStockDocId(sedeId, producto.id, t.id)),
            { sedeId, productoId: producto.id, varianteId: t.id, cantidad, updatedAt: now },
            { merge: true },
          )
        }
      } else if (usaVariantes) {
        const nextIds = new Set(varianteRows.map((v) => v.id))
        for (const old of producto.variantes ?? []) {
          if (!nextIds.has(old.id)) {
            const stockId = mcPosStockDocId(sedeId, producto.id, old.id)
            const existing = stockProducto.find((s) => s.id === stockId || s.varianteId === old.id)
            if (existing?.id) {
              batch.delete(doc(db, mcPosStockCollection(tenantId), existing.id))
            }
          }
        }
        for (const v of varianteRows) {
          const cantidad = Math.max(0, Math.round(Number(v.stock.replace(/\D/g, '')) || 0))
          sedeRows.push({ varianteId: v.id, cantidad })
          batch.set(
            doc(db, mcPosStockCollection(tenantId), mcPosStockDocId(sedeId, producto.id, v.id)),
            { sedeId, productoId: producto.id, varianteId: v.id, cantidad, updatedAt: now },
            { merge: true },
          )
        }
      } else {
        const cantidad = Math.max(0, Math.round(Number(stockSimple.replace(/\D/g, '')) || 0))
        sedeRows.push({ cantidad })
        batch.set(
          doc(db, mcPosStockCollection(tenantId), mcPosStockDocId(sedeId, producto.id)),
          { sedeId, productoId: producto.id, cantidad, updatedAt: now },
          { merge: true },
        )
      }

      await batch.commit()

      const mergedGlobal = mergeSedeStockIntoGlobal(stockGlobal, producto.id, sedeId, sedeRows)
      await syncCatalogStockFromPos(
        tenantId,
        producto.id,
        sumStockForProduct(mergedGlobal, producto.id),
        mergedGlobal,
      )

      onSaved()
      onClose()
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function desactivar() {
    if (!tenantId || !confirm('¿Desactivar este producto?')) return
    setSaving(true)
    try {
      const db = getDb()
      await updateDoc(doc(db, mcPosProductosCollection(tenantId), producto.id), {
        activo: false,
        updatedAt: Date.now(),
      })
      await removeCatalogMirrorForPosProduct(tenantId, producto, 'deactivate')
      onSaved()
      onClose()
    } catch {
      setMsg('No se pudo desactivar.')
    } finally {
      setSaving(false)
    }
  }

  async function borrar() {
    if (!tenantId || !confirm('¿Eliminar producto y su stock? Esta acción no se puede deshacer.')) return
    setSaving(true)
    try {
      const db = getDb()
      const stockRows = stockGlobal.filter((s) => s.productoId === producto.id)
      await Promise.all([
        deleteDoc(doc(db, mcPosProductosCollection(tenantId), producto.id)),
        ...stockRows.map((s) => deleteDoc(doc(db, mcPosStockCollection(tenantId), s.id))),
      ])
      await removeCatalogMirrorForPosProduct(tenantId, producto, 'delete')
      onSaved()
      onClose()
    } catch {
      setMsg('No se pudo eliminar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
      <div className="mc-pos-modal mc-pos-modal--wide mc-pos-modal--stacked">
        <div className="shrink-0 space-y-2">
          <h2 className="mc-pos-modal__title">Editar producto</h2>
          {msg && <p className="mc-pos-status mc-pos-status--error">{msg}</p>}
        </div>
        <form className="mc-pos-modal__form" onSubmit={guardar}>
          <div className="mc-pos-modal__body mc-pos-form-grid">
            <label className="mc-pos-field mc-pos-field--full">
              <span>Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>
            <label className="mc-pos-field">
              <span>Código</span>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </label>
            <label className="mc-pos-field">
              <span>Código de barras</span>
              <input value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} />
            </label>
            <label className="mc-pos-field">
              <span>Precio</span>
              <input
                inputMode="numeric"
                value={precioInput}
                onChange={(e) => setPrecioInput(formatCopInputWhileTyping(e.target.value))}
              />
            </label>
            <label className="mc-pos-field">
              <span>Precio de costo (opcional)</span>
              <input
                inputMode="numeric"
                value={precioCostoInput}
                onChange={(e) => setPrecioCostoInput(formatCopInputWhileTyping(e.target.value))}
              />
            </label>

            {usaSkus ? (
              <div className="mc-pos-field mc-pos-field--full space-y-4">
                <PosTallasStockEditor
                  tallas={tallasStock}
                  onChange={setTallasStock}
                  modo={tallaModo}
                  hideStock
                  titulo="Curva de tallas"
                  disabled={saving}
                />
                <ProductoVariantesEditor
                  variantes={colores}
                  onChange={setColores}
                  allowImage={false}
                  esRopa
                  disabled={saving}
                />
                <ProductoRopaSkuMatrixEditor
                  variantes={colorRows.map((v) => ({
                    id: v.id,
                    nombre: v.nombre.trim(),
                    hex: v.hex,
                    tipo: v.tipo,
                  }))}
                  tallas={tallasStock}
                  skus={skuMatrix}
                  onChange={setSkuMatrix}
                  disabled={saving}
                />
              </div>
            ) : usaTallas ? (
              <div className="mc-pos-field mc-pos-field--full">
                <PosTallasStockEditor
                  tallas={tallasStock}
                  onChange={setTallasStock}
                  modo={tallaModo}
                  titulo="Stock por talla"
                  disabled={saving}
                />
              </div>
            ) : usaVariantes ? (
              <div className="mc-pos-field mc-pos-field--full">
                <ProductoVariantesEditor
                  variantes={variantes}
                  onChange={setVariantes}
                  allowImage={false}
                  disabled={saving}
                />
              </div>
            ) : (
              <label className="mc-pos-field">
                <span>Stock en esta sede</span>
                <input
                  inputMode="numeric"
                  value={stockSimple}
                  onChange={(e) => setStockSimple(e.target.value.replace(/\D/g, ''))}
                />
              </label>
            )}
          </div>

          <div className="mc-pos-modal__actions shrink-0">
            <button type="button" className="mc-landing-btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="mc-landing-btn-ghost text-sm" disabled={saving} onClick={desactivar}>
              Desactivar
            </button>
            <button type="button" className="mc-landing-btn-ghost text-sm text-red-700" disabled={saving} onClick={borrar}>
              Eliminar
            </button>
            <button type="submit" className="mc-landing-btn-primary" disabled={saving}>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
