import clsx from 'clsx'

type Props = {
  onSelect: (esRopa: boolean) => void
  onClose: () => void
}

function IconShirt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 3.5 9 6l3-2 3 2 2.5-2.5L21 7v4l-2 1.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7.5L3 11V7l3.5-3.5Z"
      />
    </svg>
  )
}

function IconBox({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 8-9-5-9 5v8l9 5 9-5V8Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.5 12 13l9-4.5M12 13v8.5" />
    </svg>
  )
}

export function ProductoEsRopaStep({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-2xl border border-neutral-200/50 bg-neutral-50 p-6 sm:rounded-2xl sm:p-8">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onSelect(false)}
            className={clsx(
              'group flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 text-center transition active:scale-[0.98]',
              'border-neutral-300/90 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-mc-900/40 hover:shadow-md',
            )}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-mc-800 transition group-hover:bg-mc-900 group-hover:text-white">
              <IconBox className="h-7 w-7" />
            </span>
            <span className="text-[15px] font-semibold text-mc-900">Producto general</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect(true)}
            className={clsx(
              'group flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 text-center transition active:scale-[0.98]',
              'border-neutral-300/90 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-mc-900/40 hover:shadow-md',
            )}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-mc-800 transition group-hover:bg-mc-900 group-hover:text-white">
              <IconShirt className="h-7 w-7" />
            </span>
            <span className="text-[15px] font-semibold text-mc-900">Ropa</span>
          </button>
        </div>

        <button type="button" className="mc-btn-secondary mt-4 w-full" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
