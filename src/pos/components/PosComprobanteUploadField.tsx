import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { McFileInputLabel } from '@/components/McFileInputLabel'
import { firebaseStorageConfigured } from '@/lib/firebase'

type Props = {
  file: File | null
  disabled?: boolean
  onFileChange: (file: File | null) => void
}

function ClipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PosComprobanteUploadField({ file, disabled = false, onFileChange }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const canPick = firebaseStorageConfigured && !disabled

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function onPick(files: FileList) {
    const picked = files[0]
    if (!picked) return
    onFileChange(picked)
  }

  return (
    <div className="mc-pos-comprobante-upload">
      <span className="mc-pos-comprobante-upload__label">Comprobante (opcional)</span>

      {file ? (
        <div className="mc-pos-comprobante-upload__done">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="mc-pos-comprobante-upload__thumb" />
          ) : (
            <span className="mc-pos-comprobante-upload__icon mc-pos-comprobante-upload__icon--ok">
              <CheckIcon />
            </span>
          )}
          <div className="mc-pos-comprobante-upload__info">
            <p className="mc-pos-comprobante-upload__name">{file.name}</p>
            <p className="mc-pos-comprobante-upload__hint">Listo para adjuntar al movimiento</p>
          </div>
          <div className="mc-pos-comprobante-upload__actions">
            <McFileInputLabel
              accept="image/*,application/pdf,.pdf"
              disabled={!canPick}
              className={clsx('mc-pos-comprobante-upload__btn', !canPick && 'opacity-50 pointer-events-none')}
              onFiles={onPick}
            >
              Cambiar
            </McFileInputLabel>
            <button
              type="button"
              className="mc-pos-comprobante-upload__btn mc-pos-comprobante-upload__btn--ghost"
              disabled={disabled}
              onClick={() => onFileChange(null)}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <McFileInputLabel
          accept="image/*,application/pdf,.pdf"
          disabled={!canPick}
          className={clsx(
            'mc-pos-comprobante-upload__pick',
            canPick ? 'mc-pos-comprobante-upload__pick--active' : 'mc-pos-comprobante-upload__pick--disabled',
          )}
          onFiles={onPick}
        >
          <span className="mc-pos-comprobante-upload__icon">
            <ClipIcon />
          </span>
          <span className="mc-pos-comprobante-upload__pick-title">Añadir comprobante</span>
          <span className="mc-pos-comprobante-upload__pick-hint">Foto o PDF · máx. 8 MB</span>
        </McFileInputLabel>
      )}

      {!firebaseStorageConfigured && (
        <p className="mc-pos-comprobante-upload__warn">
          La subida de comprobantes requiere Firebase Storage configurado.
        </p>
      )}
    </div>
  )
}
