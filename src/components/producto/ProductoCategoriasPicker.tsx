import clsx from 'clsx'
import { Link } from 'react-router-dom'
import type { McCategoria } from '@/types/mc'

type Props = {
  categorias: (McCategoria & { id: string })[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function ProductoCategoriasPicker({ categorias, selectedIds, onChange, disabled }: Props) {
  const activas = categorias.filter((c) => c.activa)

  function toggle(id: string) {
    if (disabled) return
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  if (categorias.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300/80 bg-white/60 px-4 py-4 text-center">
        <p className="text-[13px] leading-relaxed text-mc-600">
          Todavía no tenés categorías.
        </p>
        <Link
          to="/app/inventario/categorias"
          className="mt-2 inline-block text-[13px] font-semibold text-[var(--cat-text)] underline underline-offset-2"
        >
          Crear categorías
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {activas.map((cat) => {
          const selected = selectedIds.includes(cat.id)
          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(cat.id)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition duration-200',
                selected
                  ? 'bg-mc-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                  : 'border border-neutral-200/80 bg-white text-mc-800 hover:border-neutral-300',
                disabled && 'pointer-events-none opacity-60',
              )}
            >
              {cat.nombre}
              {selected ? (
                <span className="text-[11px] opacity-80" aria-hidden>
                  ✓
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {categorias.some((c) => !c.activa) && selectedIds.some((id) => categorias.find((c) => c.id === id && !c.activa)) ? (
        <p className="text-[12px] text-amber-800">
          Hay categorías inactivas asignadas; no se verán en el catálogo público.
        </p>
      ) : null}
      <p className="text-[12px] leading-relaxed text-mc-500">
        Elegí una o más categorías.{' '}
        <Link to="/app/inventario/categorias" className="font-medium text-mc-800 underline underline-offset-2">
          Gestionar
        </Link>
      </p>
    </div>
  )
}
