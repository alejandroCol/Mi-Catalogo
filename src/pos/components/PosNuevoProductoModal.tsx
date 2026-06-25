import { useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore'
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
  sumarStockTallas,
  type TallaDraft,
  type TallaModo,
} from '@/lib/productoTallas'
import { formatCopInputWhileTyping, parseCopInput } from '@/pos/lib/posCopInput'
import { generatePosCodigoBarras, generatePosCodigoInterno } from '@/pos/lib/posBarcode'
import { PosTallasStockEditor } from '@/pos/components/PosTallasStockEditor'
import type { McPosSede, McPosVariante } from '@/types/mc'

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
  const [stockInput, setStockInput] = useState('0')
  const [tallaModo, setTallaModo] = useState<TallaModo>('simple')
  const [tallas, setTallas] = useState<TallaDraft[]>([])
  const [codigo] = useState(() => generatePosCodigoInterno())
  const [codigoBarras] = useState(() => generatePosCodigoBarras())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function activarTallasRopa() {
    setTallaModo('ropa')
    setTallas(createCurvaTallasDraft())
    setStockInput('0')
  }

  function activarTallasZapatos() {
    setTallaModo('zapatos')
    setTallas(createCurvaZapatosDraft())
    setStockInput('0')
  }

  function usarStockSimple() {
    setTallaModo('simple')
    setTallas([])
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return

    const usaTallas = tallaModo !== 'simple'
    const builtTallas = usaTallas ? buildTallasFromDrafts(tallas) : []
    const cantidadSimple = Math.max(0, Math.round(Number(stockInput) || 0))
    const cantidadTotal = usaTallas ? sumarStockTallas(builtTallas) : cantidadSimple

    if (usaTallas && cantidadTotal <= 0) {
      setError('Indicá stock en al menos una talla.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const db = getDb()
      const now = Date.now()
      const precioCop = parseCopInput(precioInput)

      const variantes: McPosVariante[] | null = usaTallas
        ? builtTallas.map((t) => ({ id: t.id, nombre: t.nombre }))
        : null

      const prodRef = await addDoc(collection(db, mcPosProductosCollection(tenantId)), {
        nombre: nombre.trim(),
        codigo,
        codigoBarras,
        precioCop,
        activo: true,
        sedeId,
        variantes: variantes?.length ? variantes : null,
        createdAt: now,
        updatedAt: now,
      })

      const batch = writeBatch(db)

      if (usaTallas) {
        for (const t of builtTallas) {
          if (t.stock > 0) {
            batch.set(
              doc(db, mcPosStockCollection(tenantId), mcPosStockDocId(sedeId, prodRef.id, t.id)),
              { sedeId, productoId: prodRef.id, varianteId: t.id, cantidad: t.stock, updatedAt: now },
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
        const catalogRef = doc(collection(db, mcProductosCollection(tenantId)))
        batch.set(catalogRef, {
          nombre: nombre.trim(),
          precioCop,
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
          ...(usaTallas ? { esRopa: true, tallas: builtTallas } : {}),
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
      <div className="mc-pos-modal mc-pos-modal--wide">
        <h2 className="mc-pos-modal__title">Nuevo producto</h2>
        {sede && <p className="mc-pos-muted text-sm">Sede: {sede.nombre}</p>}
        {error && <p className="mc-pos-status mc-pos-status--error">{error}</p>}
        <form className="mc-pos-form-grid" onSubmit={guardar}>
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
                className={`mc-pos-tallas-mode__btn ${tallaModo === 'simple' ? 'mc-pos-tallas-mode__btn--active' : ''}`}
                onClick={usarStockSimple}
              >
                Stock único
              </button>
              <button
                type="button"
                className={`mc-pos-tallas-mode__btn ${tallaModo === 'ropa' ? 'mc-pos-tallas-mode__btn--active' : ''}`}
                onClick={activarTallasRopa}
              >
                Tallas ropa
              </button>
              <button
                type="button"
                className={`mc-pos-tallas-mode__btn ${tallaModo === 'zapatos' ? 'mc-pos-tallas-mode__btn--active' : ''}`}
                onClick={activarTallasZapatos}
              >
                Tallas zapatos
              </button>
            </div>
          </div>

          {tallaModo === 'simple' ? (
            <label className="mc-pos-field">
              <span>Stock inicial</span>
              <input
                inputMode="numeric"
                value={stockInput}
                onChange={(e) => setStockInput(e.target.value.replace(/\D/g, ''))}
              />
            </label>
          ) : (
            <div className="mc-pos-field mc-pos-field--full">
              <PosTallasStockEditor
                tallas={tallas}
                onChange={setTallas}
                modo={tallaModo}
                disabled={saving}
              />
            </div>
          )}

          <div className="mc-pos-modal__actions mc-pos-field--full">
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
