import { useState } from 'react'
import { addDoc, collection, updateDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { getDb, getStorageApp, firebaseStorageConfigured } from '@/lib/firebase'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { formatIntegerEsCo } from '@/lib/formatCop'
import { mcProductosCollection } from '@/lib/mcCollections'

export function QuickAddProductModal({
  tenantId,
  nextOrden,
  onClose,
}: {
  tenantId: string
  nextOrden: number
  onClose: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('0')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function onPrecioChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits === '') {
      setPrecio('')
      return
    }
    const n = Number(digits)
    if (!Number.isFinite(n)) {
      setPrecio('')
      return
    }
    setPrecio(formatIntegerEsCo(n))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const precioNum = Number(precio.replace(/\D/g, ''))
    const stockNum = Number(stock.replace(/\D/g, ''))
    if (!nombre.trim()) {
      setErr('Poné un nombre corto.')
      return
    }
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setErr('Precio inválido.')
      return
    }
    setBusy(true)
    try {
      const db = getDb()
      const col = collection(db, mcProductosCollection(tenantId))
      const docRef = await addDoc(col, {
        nombre: nombre.trim(),
        precioCop: precioNum,
        stock: Number.isFinite(stockNum) ? stockNum : 0,
        activo: true,
        enCatalogo: true,
        orden: nextOrden,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      let imageUrl: string | undefined
      if (file && firebaseStorageConfigured) {
        const storage = getStorageApp()
        const pathRef = ref(storage, `mc_tenants/${tenantId}/productos/${docRef.id}.jpg`)
        const optimized = await compressImageForUpload(file)
        await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
        imageUrl = await getDownloadURL(pathRef)
        await updateDoc(docRef, { imageUrl })
      }

      onClose()
    } catch {
      setErr('No se pudo guardar. Revisá conexión y reglas de Firebase.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[14px] bg-white p-5 shadow-xl sm:rounded-[14px]">
        <h2 className="ios-headline">Agregar artículo</h2>
        <p className="ios-footnote mt-1.5 text-mc-600">
          Ideal desde el celular: sacá la foto o elegí de la galería. La imagen se optimiza al subir para ocupar menos
          espacio.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="ios-footnote font-medium text-mc-700">Foto</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-1.5 w-full text-[15px] text-mc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-mc-100 file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-ios-blue"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Nombre</label>
            <input className="mc-input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ios-footnote font-medium text-mc-700">Precio (COP)</label>
              <input
                className="mc-input"
                inputMode="numeric"
                value={precio}
                onChange={(e) => onPrecioChange(e.target.value)}
                placeholder="25.000"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Stock</label>
              <input
                className="mc-input"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>
          {err && <p className="ios-subhead text-ios-red">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" className="mc-btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="mc-btn-primary flex-1">
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
