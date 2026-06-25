import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import type { McProducto } from '@/types/mc'

type Props = {
  products: McProducto[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  loading?: boolean
}

export function LiveProductPicker({ products, selectedIds, onChange, loading }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = products.filter((p) => p.activo && p.enCatalogo && !p.esBorrador)
    if (!q) return list
    return list.filter((p) => p.nombre.toLowerCase().includes(q))
  }, [products, search])

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else if (selectedIds.length < 24) {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar producto…"
        className="w-full rounded-xl border border-[var(--cat-muted)]/25 bg-[var(--cat-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--cat-accent)]/40"
      />

      {loading ? (
        <p className="text-sm text-[var(--cat-muted)]">Cargando productos…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--cat-muted)]">No hay productos en catálogo.</p>
      ) : (
        <ul className="max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto overscroll-contain pr-1">
          {filtered.map((p) => {
            const selected = selectedIds.includes(p.id)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition',
                    selected
                      ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_8%,transparent)]'
                      : 'border-[var(--cat-muted)]/20 bg-[var(--cat-surface)] hover:border-[var(--cat-muted)]/35',
                  )}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--cat-muted)]/10">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.nombre}</p>
                    <p className="text-xs text-[var(--cat-muted)]">{formatCop(p.precioCop)}</p>
                  </div>
                  <span
                    className={clsx(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                      selected
                        ? 'border-[var(--cat-accent)] bg-[var(--cat-accent)] text-[var(--cat-accent-text)]'
                        : 'border-[var(--cat-muted)]/30 text-transparent',
                    )}
                  >
                    ✓
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-xs text-[var(--cat-muted)]">
        {selectedIds.length} de 24 productos seleccionados
      </p>
    </div>
  )
}
