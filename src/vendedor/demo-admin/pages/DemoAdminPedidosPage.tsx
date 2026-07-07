import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCop } from '@/lib/formatCop'
import { formatoDepartamentoEtiqueta } from '@/lib/colombiaGeo'
import { IconChevronRight } from '@/icons/McIcons'
import type { McOrdenCatalogo } from '@/types/mc'
import { useDemoAdmin } from '@/vendedor/demo-admin/DemoAdminContext'
import { demoOrdenEstadoLabels as estadoLabels } from '@/vendedor/demo-admin/demoAdminMockData'
import { demoAdminPath } from '@/vendedor/demo-admin/demoAdminPaths'

function previewCliente(o: McOrdenCatalogo) {
  const p = [o.clienteNombre, o.clienteTelefono, o.clienteEmail].filter(Boolean).join(' · ')
  return p || null
}

function previewLineas(o: McOrdenCatalogo) {
  const n = o.lineas.length
  if (n === 0) return 'Sin ítems'
  const bits = o.lineas.slice(0, 2).map((l) => `${l.nombre} ×${l.cantidad}`)
  return n > 2 ? `${bits.join(' · ')}… (+${n - 2})` : bits.join(' · ')
}

const ESTADO_TONE: Record<string, string> = {
  esperando_pago: 'border-amber-200/70 bg-amber-50/80 text-amber-900',
  pagado: 'border-emerald-200/70 bg-emerald-50/80 text-emerald-800',
  en_preparacion: 'border-sky-200/70 bg-sky-50/80 text-sky-900',
  listo_envio: 'border-indigo-200/70 bg-indigo-50/80 text-indigo-900',
  enviado: 'border-violet-200/70 bg-violet-50/80 text-violet-900',
  entregado: 'border-neutral-200/70 bg-neutral-50/80 text-neutral-700',
  cancelado: 'border-red-200/70 bg-red-50/80 text-red-800',
}

export function DemoAdminPedidosPage() {
  const { demo, ventas, manualPedidos } = useDemoAdmin()
  const [expandedVentaId, setExpandedVentaId] = useState<string | null>(ventas[0]?.id ?? null)
  const listShell = 'overflow-hidden rounded-md border border-neutral-200/50 bg-[var(--cat-surface)]'

  return (
    <div className="mc-shell space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="ios-large-title">Ventas</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            to={demoAdminPath(demo.id, 'reportes')}
            className="mc-btn-secondary inline-flex items-center justify-center px-4 py-2.5 text-[14px] font-medium no-underline"
          >
            Reportes
          </Link>
          <span className="mc-btn-secondary inline-flex cursor-default items-center justify-center px-4 py-2.5 text-[14px] font-medium opacity-80">
            Ver mi saldo
          </span>
        </div>
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">Catálogo</h2>
          <span className="text-[11px] tabular-nums text-neutral-400">{ventas.length}</span>
        </div>
        <div className={listShell}>
          <ul className="divide-y divide-neutral-200/50">
            {ventas.map((o) => {
              const open = expandedVentaId === o.id
              const clienteTxt = previewCliente(o)
              return (
                <li key={o.id}>
                  <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2 sm:py-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                        aria-expanded={open}
                        aria-label={open ? 'Contraer detalle' : 'Ver detalle'}
                        onClick={() => setExpandedVentaId(open ? null : o.id)}
                      >
                        <IconChevronRight
                          size={18}
                          className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          {o.numeroReferencia ? (
                            <span className="font-mono text-[11px] font-medium text-neutral-600">
                              {o.numeroReferencia}
                            </span>
                          ) : null}
                          <time className="text-[12px] tabular-nums text-neutral-500">
                            {new Date(o.createdAt).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                          <span className="text-[14px] font-medium tabular-nums text-neutral-900">
                            {formatCop(o.totalCop)}
                          </span>
                        </div>
                        <p className="truncate text-[12px] leading-snug text-neutral-600">{previewLineas(o)}</p>
                        {clienteTxt && (
                          <p className="truncate text-[11px] leading-snug text-neutral-500">{clienteTxt}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`ml-7 inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:ml-0 ${ESTADO_TONE[o.estado] ?? ESTADO_TONE.pagado}`}
                    >
                      {estadoLabels[o.estado]}
                    </span>
                  </div>
                  {open && (
                    <div className="border-t border-neutral-200/40 bg-neutral-50/40 px-3 py-3 pl-10 sm:pl-11">
                      <table className="w-full text-left text-[12px] text-neutral-700">
                        <tbody>
                          {o.lineas.map((ln) => (
                            <tr key={`${o.id}-${ln.productId}`} className="border-b border-neutral-200/30 last:border-0">
                              <td className="py-1.5 pr-2 font-medium text-neutral-800">
                                {ln.nombre} <span className="font-normal text-neutral-500">×{ln.cantidad}</span>
                              </td>
                              <td className="py-1.5 text-right tabular-nums text-neutral-600">
                                {formatCop(ln.precioUnitarioCop * ln.cantidad)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(o.clienteTipoDocumento || o.clienteDocumentoNumero) && (
                        <div className="mt-2 border-t border-neutral-200/40 pt-2 text-[12px] leading-relaxed text-neutral-700">
                          <p className="font-medium text-neutral-800">Documento</p>
                          <p className="tabular-nums">
                            {[o.clienteTipoDocumento, o.clienteDocumentoNumero].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      )}
                      {(o.envioCiudad || o.envioDireccion) && (
                        <div className="mt-2 border-t border-neutral-200/40 pt-2 text-[12px] leading-relaxed text-neutral-700">
                          <p className="font-medium text-neutral-800">Envío</p>
                          {o.envioCiudad ? <p>{o.envioCiudad}</p> : null}
                          {o.envioDepartamento ? (
                            <p className="text-neutral-600">{formatoDepartamentoEtiqueta(o.envioDepartamento)}</p>
                          ) : null}
                          {o.envioDireccion ? <p className="mt-1 whitespace-pre-wrap">{o.envioDireccion}</p> : null}
                        </div>
                      )}
                      {(o.subtotalCop != null ||
                        (o.envioCop != null && o.envioCop > 0) ||
                        (o.descuentoCop != null && o.descuentoCop > 0) ||
                        o.cuponCodigo) && (
                        <div className="mt-2 border-t border-neutral-200/40 pt-2 text-[12px] text-neutral-700">
                          <p className="font-medium text-neutral-800">Totales</p>
                          <ul className="mt-1 space-y-0.5 tabular-nums">
                            {o.subtotalCop != null && o.subtotalCop > 0 && (
                              <li className="flex justify-between gap-2">
                                <span>Subtotal</span>
                                <span>{formatCop(o.subtotalCop)}</span>
                              </li>
                            )}
                            {o.envioCop != null && o.envioCop > 0 && (
                              <li className="flex justify-between gap-2">
                                <span>Envío</span>
                                <span>{formatCop(o.envioCop)}</span>
                              </li>
                            )}
                            {o.descuentoCop != null && o.descuentoCop > 0 && (
                              <li className="flex justify-between gap-2 text-emerald-800">
                                <span>Descuento{o.cuponCodigo ? ` (${o.cuponCodigo})` : ''}</span>
                                <span>−{formatCop(o.descuentoCop)}</span>
                              </li>
                            )}
                            <li className="flex justify-between gap-2 font-medium text-neutral-900">
                              <span>Total</span>
                              <span>{formatCop(o.totalCop)}</span>
                            </li>
                          </ul>
                        </div>
                      )}
                      {o.trackingNumber ? (
                        <div className="mt-3 border-t border-neutral-200/40 pt-3">
                          <p className="text-[12px] font-medium text-neutral-800">Guía de rastreo</p>
                          <p className="mt-1 font-mono text-[13px] tabular-nums text-neutral-700">{o.trackingNumber}</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">Pedidos manuales</h2>
            <span className="text-[11px] tabular-nums text-neutral-400">{manualPedidos.length}</span>
          </div>
          <span className="mc-btn-secondary cursor-default py-2 text-[13px] opacity-80">Nuevo pedido manual</span>
        </div>
        <div className={listShell}>
          <ul className="divide-y divide-neutral-200/50">
            {manualPedidos.map((r) => (
              <li key={r.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <time className="text-[12px] tabular-nums text-neutral-500">
                        {new Date(r.createdAt).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                      {r.totalCop != null && r.totalCop > 0 && (
                        <span className="text-[13px] font-medium tabular-nums text-neutral-900">
                          {formatCop(r.totalCop)}
                        </span>
                      )}
                      <span className="border border-neutral-200/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                        {r.estado.replace('_', ' ')}
                      </span>
                    </div>
                    {r.clienteHint && <p className="truncate text-[12px] text-neutral-500">{r.clienteHint}</p>}
                    <p className="line-clamp-2 text-[13px] leading-snug text-neutral-800">{r.nota}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
