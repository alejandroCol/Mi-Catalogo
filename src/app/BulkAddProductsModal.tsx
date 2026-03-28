import { useEffect, useRef, useState } from 'react'
import { addDoc, collection, updateDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { formatIntegerEsCo } from '@/lib/formatCop'
import { mcProductosCollection } from '@/lib/mcCollections'

type DraftRow = {
  key: string
  file: File
  previewUrl: string
  nombre: string
  precio: string
  stock: string
}

function humanNameFromFile(file: File, index: number) {
  const base = file.name.replace(/\.[^.]+$/i, '').replace(/[_-]+/g, ' ').trim()
  return base || `Producto ${index + 1}`
}

export function BulkAddProductsModal({
  tenantId,
  nextOrden,
  onClose,
}: {
  tenantId: string
  nextOrden: number
  onClose: () => void
}) {
  const [rows, setRows] = useState<DraftRow[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  useEffect(() => {
    return () => {
      for (const r of rowsRef.current) {
        URL.revokeObjectURL(r.previewUrl)
      }
    }
  }, [])

  function onPrecioChange(key: string, raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits === '') {
      patchRow(key, { precio: '' })
      return
    }
    const n = Number(digits)
    if (!Number.isFinite(n)) {
      patchRow(key, { precio: '' })
      return
    }
    patchRow(key, { precio: formatIntegerEsCo(n) })
  }

  function patchRow(key: string, partial: Partial<Pick<DraftRow, 'nombre' | 'precio' | 'stock'>>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...partial } : r)))
  }

  function onPickFiles(files: FileList | null) {
    if (!files?.length) return
    setErr(null)
    const additions: DraftRow[] = []
    let idx = rows.length
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue
      idx += 1
      additions.push({
        key: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        nombre: humanNameFromFile(file, idx - 1),
        precio: '',
        stock: '0',
      })
    }
    if (additions.length === 0) {
      setErr('No hay imágenes válidas (solo se aceptan archivos de imagen).')
      return
    }
    setRows((prev) => [...prev, ...additions])
  }

  function removeRow(key: string) {
    setRows((prev) => {
      const row = prev.find((r) => r.key === key)
      if (row) URL.revokeObjectURL(row.previewUrl)
      return prev.filter((r) => r.key !== key)
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (rows.length === 0) {
      setErr('Elegí al menos una foto desde la galería.')
      return
    }
    if (!firebaseStorageConfigured) {
      setErr('Firebase Storage no está configurado: sin eso no podemos guardar las fotos.')
      return
    }
    for (const r of rows) {
      if (!r.nombre.trim()) {
        setErr('Completá el nombre en todas las filas.')
        return
      }
      const p = Number(r.precio.replace(/\D/g, ''))
      if (!Number.isFinite(p) || p < 0) {
        setErr(`Precio inválido en «${r.nombre.trim()}».`)
        return
      }
    }

    setBusy(true)
    try {
      const db = getDb()
      const col = collection(db, mcProductosCollection(tenantId))
      const storage = getStorageApp()
      const now = Date.now()

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        setProgress(`Guardando ${i + 1} de ${rows.length}…`)
        const precioNum = Number(r.precio.replace(/\D/g, ''))
        const stockNum = Number(r.stock.replace(/\D/g, ''))
        const docRef = await addDoc(col, {
          nombre: r.nombre.trim(),
          precioCop: precioNum,
          stock: Number.isFinite(stockNum) ? stockNum : 0,
          activo: true,
          enCatalogo: true,
          orden: nextOrden + i,
          createdAt: now,
          updatedAt: now,
        })
        const pathRef = ref(storage, `mc_tenants/${tenantId}/productos/${docRef.id}.jpg`)
        const optimized = await compressImageForUpload(r.file)
        await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
        const imageUrl = await getDownloadURL(pathRef)
        await updateDoc(docRef, { imageUrl })
      }

      onClose()
    } catch {
      setErr('No se pudo completar la carga. Revisá conexión y reglas de Storage/Firestore.')
      setProgress(null)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-hidden rounded-t-[14px] bg-white shadow-xl sm:max-h-[90vh] sm:rounded-[14px]">
        <div className="max-h-[92vh] overflow-y-auto p-5 sm:max-h-[90vh]">
          <h2 className="ios-headline">Carga masiva · Expert</h2>
          <p className="ios-footnote mt-1.5 text-mc-600">
            Elegí varias fotos de la galería. Para cada una indicá nombre y precio (y stock si hace falta). Las fotos se
            comprimen al subir para ahorrar espacio y datos.
          </p>

          {!firebaseStorageConfigured && (
            <p className="mt-3 rounded-[10px] border border-ios-orange/30 bg-ios-orange/10 px-3 py-2.5 text-[13px] leading-snug text-mc-800">
              Falta configurar <strong>Firebase Storage</strong> en el proyecto (.env y consola); sin eso no se pueden
              guardar las imágenes.
            </p>
          )}

          <div className="mt-4">
            <label className="ios-footnote font-medium text-mc-700">Agregar fotos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              className="mt-1.5 w-full text-[15px] text-mc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-mc-100 file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-ios-blue"
              onChange={(e) => {
                onPickFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {rows.length > 0 && (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <p className="ios-footnote font-medium text-mc-700">
                Revisá cada artículo ({rows.length} {rows.length === 1 ? 'foto' : 'fotos'})
              </p>
              <ul className="space-y-4">
                {rows.map((r, idx) => (
                  <li
                    key={r.key}
                    className="rounded-[12px] border border-mc-200/90 bg-mc-50/60 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex gap-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[10px] bg-mc-100">
                        <img src={r.previewUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="ios-footnote text-mc-500">Foto {idx + 1}</p>
                        <input
                          className="mc-input py-2.5 text-[15px]"
                          placeholder="Nombre"
                          value={r.nombre}
                          onChange={(e) => patchRow(r.key, { nombre: e.target.value })}
                          disabled={busy}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            className="mc-input py-2.5 text-[15px]"
                            placeholder="Precio COP"
                            inputMode="numeric"
                            value={r.precio}
                            onChange={(e) => onPrecioChange(r.key, e.target.value)}
                            disabled={busy}
                            autoComplete="off"
                          />
                          <input
                            className="mc-input py-2.5 text-[15px]"
                            placeholder="Stock"
                            inputMode="numeric"
                            value={r.stock}
                            onChange={(e) => patchRow(r.key, { stock: e.target.value })}
                            disabled={busy}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-2 w-full rounded-lg py-2 text-[13px] font-semibold text-ios-red"
                      disabled={busy}
                      onClick={() => removeRow(r.key)}
                    >
                      Quitar esta foto
                    </button>
                  </li>
                ))}
              </ul>

              {progress && (
                <p className="ios-subhead text-ios-blue" aria-live="polite">
                  {progress}
                </p>
              )}
              {err && <p className="ios-subhead text-ios-red">{err}</p>}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <button type="button" className="mc-btn-secondary w-full sm:flex-1" disabled={busy} onClick={onClose}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="mc-btn-primary w-full sm:flex-1"
                  disabled={busy || rows.length === 0 || !firebaseStorageConfigured}
                >
                  {busy ? 'Subiendo…' : `Crear ${rows.length} artículo${rows.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </form>
          )}

          {rows.length === 0 && err && <p className="ios-subhead mt-4 text-ios-red">{err}</p>}
        </div>
      </div>
    </div>
  )
}
