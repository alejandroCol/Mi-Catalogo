import { formatCop } from '@/lib/formatCop'
import { PosCatalogSyncBadge } from '@/pos/components/PosCatalogSyncBadge'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { useDemoPos } from '@/vendedor/demo-pos/DemoPosContext'

export function DemoPosAdminInventarioPage() {
  const { productos, stock, sedes } = useDemoPos()
  const sede = sedes[0]

  return (
    <div className="mc-pos-page mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PosPageHeader
        icon="inventario"
        eyebrow="Inventario"
        title="Productos y stock"
        subtitle={`${sede?.nombre ?? 'Sede'} · ${productos.length} artículos`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {sedes.map((s) => (
          <span
            key={s.id}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700"
          >
            {s.codigo} — {s.nombre}
          </span>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {productos.map((p) => {
          const qty = stock.find((s) => s.productoId === p.id && s.sedeId === sede?.id)?.cantidad ?? 0
          return (
            <article
              key={p.id}
              className="rounded-xl border border-neutral-200/70 bg-white p-4 shadow-sm transition hover:border-neutral-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight text-neutral-900">{p.nombre}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">{p.codigo}</p>
                  <p className="mt-2 text-base font-semibold text-neutral-900">{formatCop(p.precioCop)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tracking-tight text-neutral-900">{qty}</p>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-neutral-500">unidades</p>
                </div>
              </div>
              {p.publicadoEnCatalogo ? (
                <div className="mt-3">
                  <PosCatalogSyncBadge />
                </div>
              ) : (
                <p className="mt-3 text-xs text-amber-800">Pendiente publicar en catálogo</p>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
