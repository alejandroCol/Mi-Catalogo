import { useEffect, useRef, useState } from 'react'
import { CategoriaImagePicker } from '@/components/categoria/CategoriaImagePicker'

type Props = {
  open: boolean
  nombre: string
  busy: boolean
  error: string | null
  /** Si se define, se crea una subcategoría bajo esta categoría raíz. */
  parentNombre?: string | null
  onNombreChange: (value: string) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent, imageFile: File | null) => void
}

export function CrearCategoriaModal({
  open,
  nombre,
  busy,
  error,
  parentNombre,
  onNombreChange,
  onClose,
  onSubmit,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const esSub = !!parentNombre?.trim()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setImageFile(null)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open])

  function pickImage(file: File) {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setImageFile(file)
  }

  function clearImage() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setImageFile(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl border border-neutral-200/50 bg-neutral-50 p-5 sm:rounded-2xl">
        <h2 className="ios-headline">{esSub ? 'Nueva subcategoría' : 'Nueva categoría'}</h2>
        <p className="ios-footnote mt-1.5 text-mc-600">
          {esSub ? (
            <>
              Dentro de <span className="font-semibold text-mc-800">{parentNombre}</span>. Ej: Slim, Verano,
              Talle grande…
            </>
          ) : (
            'Ej: Pantalón, Sets, Shorts, Accesorios…'
          )}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(e, imageFile)
          }}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="ios-footnote font-medium text-mc-700">
              {esSub ? 'Nombre de la subcategoría' : 'Nombre'}
            </label>
            <input
              ref={inputRef}
              className="mc-input mt-1.5 bg-white"
              value={nombre}
              onChange={(e) => onNombreChange(e.target.value)}
              placeholder={esSub ? 'Ej: Slim fit' : 'Nombre de la categoría'}
              maxLength={48}
              disabled={busy}
              required
            />
          </div>

          <div>
            <p className="ios-footnote mb-2 font-medium text-mc-700">Foto (opcional)</p>
            <CategoriaImagePicker
              previewUrl={previewUrl}
              fallbackLetter={nombre.trim().charAt(0).toUpperCase() || undefined}
              disabled={busy}
              onPick={pickImage}
              onRemove={previewUrl ? clearImage : undefined}
            />
          </div>

          {error ? <p className="text-[13px] text-red-800">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <button type="button" className="mc-btn-secondary flex-1" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="mc-btn-primary flex-1" disabled={busy || !nombre.trim()}>
              {busy ? 'Creando…' : esSub ? 'Crear subcategoría' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
