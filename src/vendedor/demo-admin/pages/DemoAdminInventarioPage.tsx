import { formatCop } from '@/lib/formatCop'
import { productoPrecioVentaDesde, productoTieneDescuento } from '@/lib/productoDescuento'
import { productoStockEfectivo } from '@/lib/productoVariantes'
import { isProductNovedad } from '@/lib/catalogNovedad'
import { categoriaEtiquetaProducto } from '@/lib/catalogCategorias'
import { IconPlus } from '@/icons/McIcons'
import { useDemoAdmin } from '@/vendedor/demo-admin/DemoAdminContext'

export function DemoAdminInventarioPage() {
  const { products, categorias, tenant } = useDemoAdmin()
  const productMax = 200

  const categoriaLabel = (id: string) => categoriaEtiquetaProducto(id, categorias)

  return (
    <div className="mc-shell">
      <h1 className="ios-large-title">Inventario</h1>
      <p className="ios-subhead mt-2 max-w-2xl leading-relaxed">
        {products.length} de {productMax} productos.
      </p>

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-stretch">
        <button
          type="button"
          disabled
          className="mc-btn-primary inline-flex w-full cursor-default items-center justify-center gap-2 px-5 py-3.5 text-[16px] opacity-90 sm:min-w-[220px] sm:flex-1"
        >
          <IconPlus size={20} className="text-[var(--cat-accent-text)]" />
          Agregar producto
        </button>
        <button
          type="button"
          disabled
          className="mc-btn-secondary inline-flex w-full cursor-default items-center justify-center px-5 py-3 text-[15px] opacity-80 sm:w-auto"
        >
          Carga masiva de fotos
        </button>
      </div>

      <ul className="mt-8 space-y-4">
        {products.map((p) => (
          <li key={p.id} className="mc-card flex gap-4 py-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-200/40 bg-neutral-100">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-400">Sin foto</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="ios-headline">{p.nombre}</p>
              </div>
              <p className="ios-subhead tabular-nums">
                {productoTieneDescuento(p) ? (
                  <>
                    <span className="font-semibold text-red-700">{formatCop(productoPrecioVentaDesde(p))}</span>
                    <span className="ml-1.5 text-neutral-500 line-through">{formatCop(p.precioCop)}</span>
                    <span className="ml-1.5 inline-block rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      Oferta
                    </span>
                  </>
                ) : (
                  formatCop(p.precioCop)
                )}
                {' · '}stock {productoStockEfectivo(p)}
                {isProductNovedad(p) && (
                  <span className="ml-2 inline-block border border-neutral-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                    Novedad
                  </span>
                )}
                {(p.categoriaIds ?? []).length > 0 && (
                  <span className="ml-2 inline-flex flex-wrap gap-1">
                    {(p.categoriaIds ?? []).map((cid) => {
                      const nom = categoriaLabel(cid)
                      if (!nom) return null
                      return (
                        <span
                          key={cid}
                          className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700"
                        >
                          {nom}
                        </span>
                      )
                    })}
                  </span>
                )}
              </p>
              {p.descripcion ? (
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[var(--cat-muted)]">{p.descripcion}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {['Editar', p.enCatalogo ? 'En catálogo' : 'Oculto', p.activo ? 'Activo' : 'Pausado'].map((label) => (
                  <span
                    key={label}
                    className="rounded-md border border-neutral-200/70 bg-neutral-50/80 px-3 py-1.5 text-[13px] font-medium text-[var(--cat-text)]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center text-[12px] leading-relaxed text-[var(--cat-muted)]">
        Inventario de ejemplo para {tenant.nombreTienda}. En la tienda real el comerciante gestiona sus productos.
      </p>
    </div>
  )
}
