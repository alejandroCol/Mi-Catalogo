import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useMcAuth } from '@/auth/McAuthContext'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { firebaseConfigured, firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { formatCop } from '@/lib/formatCop'
import { formatoDepartamentoEtiqueta } from '@/lib/colombiaGeo'
import { mcOrdenesCatalogoCollection, mcPedidosCollection } from '@/lib/mcCollections'
import { IconChevronRight } from '@/icons/McIcons'
import { ADMIN_SEGUIMIENTO_ESTADOS } from '@/lib/catalogOrderTracking'
import type { McOrdenCatalogo, McOrdenCatalogoEstado, McPedido } from '@/types/mc'

const ESTADOS_ORDEN: { value: McOrdenCatalogoEstado; label: string }[] = [
  { value: 'esperando_pago', label: 'Pago pendiente' },
  ...ADMIN_SEGUIMIENTO_ESTADOS,
  { value: 'cancelado', label: 'Cancelado' },
]

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

export function PedidosPage() {
  const { profile } = useMcAuth()
  const [ventas, setVentas] = useState<(McOrdenCatalogo & { id: string })[]>([])
  const [manual, setManual] = useState<(McPedido & { id: string })[]>([])
  const [nota, setNota] = useState('')
  const [cliente, setCliente] = useState('')
  const [total, setTotal] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [expandedVentaId, setExpandedVentaId] = useState<string | null>(null)
  const [manualFormOpen, setManualFormOpen] = useState(false)

  useEffect(() => {
    if (!firebaseConfigured || !profile?.tenantId) return
    const db = getDb()
    const tid = profile.tenantId
    const qVentas = query(collection(db, mcOrdenesCatalogoCollection(tid)), orderBy('createdAt', 'desc'))
    const qManual = query(collection(db, mcPedidosCollection(tid)), orderBy('createdAt', 'desc'))
    const u1 = onSnapshot(qVentas, (snap) => {
      setVentas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McOrdenCatalogo, 'id'>) })))
    })
    const u2 = onSnapshot(qManual, (snap) => {
      setManual(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPedido, 'id'>) })))
    })
    return () => {
      u1()
      u2()
    }
  }, [profile?.tenantId])

  async function agregarManual(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.tenantId || !nota.trim()) return
    setBusy(true)
    try {
      const db = getDb()
      const totalNum = total.replace(/\D/g, '') ? Number(total.replace(/\D/g, '')) : undefined
      await addDoc(collection(db, mcPedidosCollection(profile.tenantId)), {
        clienteHint: cliente.trim() || undefined,
        nota: nota.trim(),
        estado: 'nuevo',
        totalCop: Number.isFinite(totalNum) ? totalNum : undefined,
        createdAt: Date.now(),
      })
      setNota('')
      setCliente('')
      setTotal('')
      setManualFormOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function borrarManual(id: string) {
    if (!profile?.tenantId || !window.confirm('¿Borrar este pedido manual?')) return
    await deleteDoc(doc(getDb(), mcPedidosCollection(profile.tenantId), id))
  }

  async function setEstadoOrden(
    orden: McOrdenCatalogo & { id: string },
    estado: McOrdenCatalogoEstado,
  ) {
    if (!profile?.tenantId) return
    if (estado === 'enviado' && !orden.trackingImageUrl) {
      window.alert('Subí la imagen de la guía de rastreo antes de marcar el pedido como Despachado.')
      return
    }
    const now = Date.now()
    const patch: Record<string, unknown> = { estado, updatedAt: now }
    if (estado === 'pagado') patch.seguimientoCompraAt = orden.seguimientoCompraAt ?? now
    if (estado === 'en_preparacion') patch.seguimientoPreparacionAt = now
    if (estado === 'enviado') patch.seguimientoDespachoAt = now
    if (estado === 'entregado') patch.seguimientoEntregaAt = now
    await updateDoc(doc(getDb(), mcOrdenesCatalogoCollection(profile.tenantId), orden.id), patch)
  }

  async function setTrackingNumber(id: string, trackingNumber: string) {
    if (!profile?.tenantId) return
    await updateDoc(doc(getDb(), mcOrdenesCatalogoCollection(profile.tenantId), id), {
      trackingNumber: trackingNumber.trim() || undefined,
      updatedAt: Date.now(),
    })
  }

  async function onGuiaFile(id: string, file: File | null) {
    if (!file || !profile?.tenantId || !firebaseStorageConfigured) return
    setUploadingId(id)
    try {
      const light = await compressImageForUpload(file, { maxEdgePx: 900, jpegQuality: 0.65 })
      const storage = getStorageApp()
      const path = `mc_tenants/${profile.tenantId}/ordenes_catalogo/${id}_guia.jpg`
      const r = ref(storage, path)
      await uploadBytes(r, light, { contentType: 'image/jpeg' })
      const url = await getDownloadURL(r)
      await updateDoc(doc(getDb(), mcOrdenesCatalogoCollection(profile.tenantId), id), {
        trackingImageUrl: url,
        updatedAt: Date.now(),
      })
    } finally {
      setUploadingId(null)
    }
  }

  const listShell = 'overflow-hidden rounded-md border border-neutral-200/50 bg-[var(--cat-surface)]'

  return (
    <div className="mc-shell space-y-8">
      <div>
        <h1 className="ios-large-title">Ventas</h1>
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">Catálogo</h2>
          {ventas.length > 0 && (
            <span className="text-[11px] tabular-nums text-mc-400">{ventas.length}</span>
          )}
        </div>
        {ventas.length === 0 ? (
          <p className="py-4 text-[13px] leading-relaxed text-mc-500">Ninguna compra desde el checkout aún.</p>
        ) : (
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
                          className="shrink-0 rounded p-0.5 text-mc-400 transition hover:bg-neutral-100 hover:text-mc-700"
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
                              <span className="font-mono text-[11px] font-medium text-mc-600">
                                {o.numeroReferencia}
                              </span>
                            ) : null}
                            <time className="text-[12px] tabular-nums text-mc-500">
                              {new Date(o.createdAt).toLocaleString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </time>
                            <span className="text-[14px] font-medium tabular-nums text-mc-900">
                              {formatCop(o.totalCop)}
                            </span>
                          </div>
                          <p className="truncate text-[12px] leading-snug text-mc-600">{previewLineas(o)}</p>
                          {clienteTxt && (
                            <p className="truncate text-[11px] leading-snug text-mc-500">{clienteTxt}</p>
                          )}
                        </div>
                      </div>
                      <div
                        className="flex shrink-0 flex-wrap items-center gap-2 pl-7 sm:pl-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          className="mc-input max-w-[9.5rem] py-1.5 text-[12px]"
                          value={o.estado}
                          aria-label="Estado del pedido"
                          onChange={(e) => void setEstadoOrden(o, e.target.value as McOrdenCatalogoEstado)}
                        >
                          {ESTADOS_ORDEN.map((x) => (
                            <option key={x.value} value={x.value}>
                              {x.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5">
                          {o.trackingImageUrl ? (
                            <a
                              href={o.trackingImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-8 w-8 shrink-0 overflow-hidden rounded border border-neutral-200/60"
                              title="Ver guía"
                            >
                              <img src={o.trackingImageUrl} alt="" className="h-full w-full object-cover" />
                            </a>
                          ) : null}
                          <label
                            className={`inline-flex cursor-pointer items-center rounded border border-neutral-200/70 px-2 py-1 text-[11px] font-medium text-mc-700 transition hover:border-neutral-300 ${
                              uploadingId === o.id ? 'pointer-events-none opacity-50' : ''
                            }`}
                          >
                            {o.trackingImageUrl ? 'Cambiar' : 'Guía'}
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              disabled={uploadingId === o.id || !firebaseStorageConfigured}
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                e.target.value = ''
                                if (f) void onGuiaFile(o.id, f)
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    {open && (
                      <div className="border-t border-neutral-200/40 bg-neutral-50/40 px-3 py-3 pl-10 sm:pl-11">
                        <table className="w-full text-left text-[12px] text-mc-700">
                          <tbody>
                            {o.lineas.map((ln) => (
                              <tr key={`${o.id}-${ln.productId}`} className="border-b border-neutral-200/30 last:border-0">
                                <td className="py-1.5 pr-2 font-medium text-mc-800">
                                  {ln.nombre} <span className="font-normal text-mc-500">×{ln.cantidad}</span>
                                </td>
                                <td className="py-1.5 text-right tabular-nums text-mc-600">
                                  {formatCop(ln.precioUnitarioCop * ln.cantidad)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(o.clienteTipoDocumento || o.clienteDocumentoNumero) && (
                          <div className="mt-2 border-t border-neutral-200/40 pt-2 text-[12px] leading-relaxed text-mc-700">
                            <p className="font-medium text-mc-800">Documento</p>
                            <p className="tabular-nums">
                              {[o.clienteTipoDocumento, o.clienteDocumentoNumero].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        )}
                        {(o.envioCiudad || o.envioDireccion) && (
                          <div className="mt-2 border-t border-neutral-200/40 pt-2 text-[12px] leading-relaxed text-mc-700">
                            <p className="font-medium text-mc-800">Envío</p>
                            {o.envioCiudad ? <p>{o.envioCiudad}</p> : null}
                            {o.envioDepartamento ? (
                              <p className="text-mc-600">{formatoDepartamentoEtiqueta(o.envioDepartamento)}</p>
                            ) : null}
                            {o.envioDireccion ? <p className="mt-1 whitespace-pre-wrap">{o.envioDireccion}</p> : null}
                            {o.envioReferencia ? (
                              <p className="mt-1 text-mc-600">Ref.: {o.envioReferencia}</p>
                            ) : null}
                          </div>
                        )}
                        {(o.subtotalCop != null ||
                          (o.envioCop != null && o.envioCop > 0) ||
                          (o.descuentoCop != null && o.descuentoCop > 0) ||
                          o.cuponCodigo) && (
                          <div className="mt-2 border-t border-neutral-200/40 pt-2 text-[12px] text-mc-700">
                            <p className="font-medium text-mc-800">Totales</p>
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
                                  <span>
                                    Descuento{o.cuponCodigo ? ` (${o.cuponCodigo})` : ''}
                                  </span>
                                  <span>−{formatCop(o.descuentoCop)}</span>
                                </li>
                              )}
                              <li className="flex justify-between gap-2 font-medium text-mc-900">
                                <span>Total</span>
                                <span>{formatCop(o.totalCop)}</span>
                              </li>
                            </ul>
                          </div>
                        )}
                        {o.notaCliente ? (
                          <p className="mt-2 border-t border-neutral-200/40 pt-2 text-[12px] italic leading-relaxed text-mc-600">
                            {o.notaCliente}
                          </p>
                        ) : null}
                        <div className="mt-3 border-t border-neutral-200/40 pt-3">
                          <p className="text-[12px] font-medium text-mc-800">Guía de rastreo</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-mc-500">
                            Obligatoria al marcar «Despachado». El comprador la verá en el seguimiento.
                          </p>
                          <label className="mt-2 block text-[11px] font-medium text-mc-600">
                            Nº de guía (opcional)
                          </label>
                          <input
                            className="mc-input mt-1 py-2 text-[13px] font-mono"
                            defaultValue={o.trackingNumber ?? ''}
                            placeholder="Ej. 1234567890"
                            onBlur={(e) => {
                              const v = e.target.value.trim()
                              if (v !== (o.trackingNumber ?? '')) void setTrackingNumber(o.id, v)
                            }}
                          />
                        </div>
                        {!firebaseStorageConfigured && (
                          <p className="mt-2 text-[11px] leading-relaxed text-mc-500">
                            Storage no configurado: no podés subir la guía en imagen.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">Pedidos manuales</h2>
            {manual.length > 0 && (
              <span className="text-[11px] tabular-nums text-mc-400">{manual.length}</span>
            )}
          </div>
          <button
            type="button"
            className="mc-btn-secondary py-2 text-[13px]"
            onClick={() => setManualFormOpen((v) => !v)}
          >
            {manualFormOpen ? 'Cerrar formulario' : 'Nuevo pedido manual'}
          </button>
        </div>

        {manualFormOpen && (
          <form onSubmit={agregarManual} className="mc-card space-y-3 py-3">
            <div>
              <label className="ios-footnote font-medium text-mc-700">Cliente (opcional)</label>
              <input className="mc-input py-2.5 text-[15px]" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Qué pidió</label>
              <textarea
                className="mc-input min-h-[72px] resize-y text-[15px]"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej. 3 remeras rojas talla M"
                required
              />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Total COP (opcional)</label>
              <input
                className="mc-input py-2.5 text-[15px]"
                inputMode="numeric"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>
            <button type="submit" disabled={busy} className="mc-btn-primary w-full py-3 text-[15px]">
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        )}

        {manual.length > 0 && (
          <div className={listShell}>
            <ul className="divide-y divide-neutral-200/50">
              {manual.map((r) => (
                <li key={r.id} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <time className="text-[12px] tabular-nums text-mc-500">
                          {new Date(r.createdAt).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                        {r.totalCop != null && r.totalCop > 0 && (
                          <span className="text-[13px] font-medium tabular-nums text-mc-900">
                            {formatCop(r.totalCop)}
                          </span>
                        )}
                        <span className="border border-neutral-200/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mc-500">
                          {r.estado.replace('_', ' ')}
                        </span>
                      </div>
                      {r.clienteHint && (
                        <p className="truncate text-[12px] text-mc-500">{r.clienteHint}</p>
                      )}
                      <p className="line-clamp-2 text-[13px] leading-snug text-mc-800">{r.nota}</p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-[12px] font-medium text-mc-400 underline decoration-neutral-300 underline-offset-2 transition hover:text-mc-800"
                      onClick={() => void borrarManual(r.id)}
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
