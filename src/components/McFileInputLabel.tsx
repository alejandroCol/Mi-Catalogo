import type { ReactNode } from 'react'
import clsx from 'clsx'

type Props = {
  accept?: string
  multiple?: boolean
  disabled?: boolean
  className?: string
  children: ReactNode
  onFiles: (files: FileList) => void
}

/** Label + file input anidado (mismo patrón que KybPdfUploadField). Más fiable que htmlFor + input hermano. */
export function McFileInputLabel({
  accept = 'image/*',
  multiple,
  disabled = false,
  className,
  children,
  onFiles,
}: Props) {
  return (
    <label
      className={clsx(disabled && 'pointer-events-none', className)}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const files = e.target.files
          if (files?.length) onFiles(files)
          e.target.value = ''
        }}
      />
      {children}
    </label>
  )
}
