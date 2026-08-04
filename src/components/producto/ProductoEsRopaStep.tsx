import clsx from 'clsx'

export type ProductoFormTipo = 'general' | 'ropa' | 'zapatos'

type Props = {
  onSelect: (tipo: ProductoFormTipo) => void
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

function IconShoe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 16.5c0-1.5 1-2.5 2.5-2.5h10c1.5 0 2.5 1 2.5 2.5v1.5H4.5v-1.5Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 14V9.5c0-1.5 1-2.5 2.5-2.5h5C16 7 17 8 17 9.5V14M9 14V11M12 14V10M15 14V11"
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

const OPCIONES: {
  tipo: ProductoFormTipo
  titulo: string
  descripcion: string
  Icon: typeof IconBox
}[] = [
  {
    tipo: 'general',
    titulo: 'Producto general',
    descripcion: 'Sin tallas ni colores obligatorios',
    Icon: IconBox,
  },
  {
    tipo: 'ropa',
    titulo: 'Ropa',
    descripcion: 'Tallas XS–XL y colores o telas',
    Icon: IconShirt,
  },
  {
    tipo: 'zapatos',
    titulo: 'Zapatos',
    descripcion: 'Tallas numéricas y colores',
    Icon: IconShoe,
  },
]

export function ProductoEsRopaStep({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-t-2xl border border-neutral-200/50 bg-neutral-50 p-6 sm:rounded-2xl sm:p-8">
        <div className="mb-4 text-center sm:mb-5">
          <h2 className="ios-headline text-[20px] sm:text-[22px]">¿Qué tipo de producto es?</h2>
          <p className="ios-footnote mt-1.5 text-mc-600">
            Elegí la opción que mejor describe tu artículo. Podés definir stock por talla y color.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OPCIONES.map(({ tipo, titulo, descripcion, Icon }) => (
            <button
              key={tipo}
              type="button"
              onClick={() => onSelect(tipo)}
              className={clsx(
                'group flex min-h-[132px] flex-col items-center justify-center gap-2.5 rounded-2xl border-2 p-4 text-center transition active:scale-[0.98]',
                'border-neutral-300/90 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-mc-900/40 hover:shadow-md',
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-mc-800 transition group-hover:bg-mc-900 group-hover:text-white">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-[15px] font-semibold text-mc-900">{titulo}</span>
              <span className="text-[11px] leading-snug text-mc-500">{descripcion}</span>
            </button>
          ))}
        </div>

        <button type="button" className="mc-btn-secondary mt-4 w-full" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
