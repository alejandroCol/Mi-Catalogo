import { useMemo, useState } from 'react'
import { deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { getDb } from '@/lib/firebase'
import { mcPosProductosCollection, mcPosStockCollection, mcPosStockDocId } from '@/lib/mcPosCollections'
import type { TallaDraft } from '@/lib/productoTallas'
import { formatCopInputWhileTyping, parseCopInput } from '@/pos/lib/posCopInput'
import {
  mergeSedeStockIntoGlobal,
  sumStockForProduct,
  syncCatalogStockFromPos,
} from '@/pos/lib/posCatalogSync'
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
  const variantes = producto.variantes ?? []
  const usaTallas = variantes.length > 0
  const stockProducto = useMemo(
    () => stockRowsForProduct(stockSede, producto.id, sedeId),
    [stockSede, producto.id, sedeId],
  )

  const [nombre, setNombre] = useState(producto.nombre)
  const [codigo, setCodigo] = useState(producto.codigo ?? '')
  const [codigoBarras, setCodigoBarras] = useState(producto.codigoBarras ?? '')
  const [precioInput, setPrecioInput] = useState(String(producto.precioCop))
  const [stockSimple, setStockSimple] = useState(() => {
    const row = stockProducto.find((s) => !s.varianteId)
    return String(row?.cantidad ?? 0)
  })
  const [tallasStock, setTallasStock] = useState<TallaDraft[]>(() =>
    variantes.map((v) => {
      const row = stockProducto.find((s) => s.varianteId === v.id)
      return { id: v.id, nombre: v.nombre, stock: String(row?.cantidad ?? 0) }
    }),
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const tallaModo = inferTallaModo(variantes.map((v) => v.nombre))

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !nombre.trim() || !sedeId) return
    setSaving(true)
    setMsg(null)
    try {
      const db = getDb()
      const now = Date.now()
      const precioCop = parseCopInput(precioInput)
      const batch = writeBatch(db)

      batch.update(doc(db, mcPosProductosCollection(tenantId), producto.id), {
        nombre: nombre.trim(),
        codigo: codigo.trim() || null,
        codigoBarras: codigoBarras.trim() || null,
        precioCop,
        updatedAt: now,
      })

      const sedeRows: { varianteId?: string; cantidad: number }[] = []

      if (usaTallas) {
        for (const t of tallasStock) {
          const cantidad = Math.max(0, Math.round(Number(t.stock.replace(/\D/g, '')) || 0))
          sedeRows.push({ varianteId: t.id, cantidad })
          batch.set(
            doc(db, mcPosStockCollection(tenantId), mcPosStockDocId(sedeId, producto.id, t.id)),
            { sedeId, productoId: producto.id, varianteId: t.id, cantidad, updatedAt: now },
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
      <div className="mc-pos-modal mc-pos-modal--wide">
        <h2 className="mc-pos-modal__title">Editar producto</h2>
        {msg && <p className="mc-pos-status mc-pos-status--error">{msg}</p>}
        <form className="mc-pos-form-grid" onSubmit={guardar}>
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

          {usaTallas ? (
            <div className="mc-pos-field mc-pos-field--full">
              <PosTallasStockEditor
                tallas={tallasStock}
                onChange={setTallasStock}
                modo={tallaModo}
                titulo="Stock por talla"
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

          <div className="mc-pos-modal__actions mc-pos-field--full">
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
