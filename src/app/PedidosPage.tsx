import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
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
import { mcOrdenesCatalogoCollection, mcPedidosCollection } from '@/lib/mcCollections'
import type { McOrdenCatalogo, McOrdenCatalogoEstado, McPedido } from '@/types/mc'

const ESTADOS_ORDEN: { value: McOrdenCatalogoEstado; label: string }[] = [
  { value: 'pagado', label: 'Pagado' },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'listo_envio', label: 'Listo para envío' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
]

export function PedidosPage() {
  const { profile } = useMcAuth()
  const [ventas, setVentas] = useState<(McOrdenCatalogo & { id: string })[]>([])
  const [manual, setManual] = useState<(McPedido & { id: string })[]>([])
  const [nota, setNota] = useState('')
  const [cliente, setCliente] = useState('')
  const [total, setTotal] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

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
    } finally {
      setBusy(false)
    }
  }

  async function borrarManual(id: string) {
    if (!profile?.tenantId || !window.confirm('¿Borrar este pedido manual?')) return
    await deleteDoc(doc(getDb(), mcPedidosCollection(profile.tenantId), id))
  }

  async function setEstadoOrden(id: string, estado: McOrdenCatalogoEstado) {
    if (!profile?.tenantId) return
    await updateDoc(doc(getDb(), mcOrdenesCatalogoCollection(profile.tenantId), id), {
      estado,
      updatedAt: Date.now(),
    })
  }

  async function setTracking(id: string, trackingNumber: string) {
    if (!profile?.tenantId) return
    const trimmed = trackingNumber.trim()
    await updateDoc(doc(getDb(), mcOrdenesCatalogoCollection(profile.tenantId), id), {
      ...(trimmed ? { trackingNumber: trimmed } : { trackingNumber: deleteField() }),
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

  return (
    <div className="mc-shell space-y-6">
      <div>
        <h1 className="ios-large-title">Ventas</h1>
        <p className="ios-subhead mt-1.5">
          <strong className="font-semibold text-mc-900">Ventas del catálogo</strong> son compras con pago simulado desde la web.
          Los <strong className="font-semibold text-mc-900">pedidos manuales</strong> siguen siendo anotaciones rápidas (mostrador, WhatsApp) y alimentan el resumen de ventas del inicio.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="ios-headline">Ventas del catálogo</h2>
        {ventas.length === 0 ? (
          <p className="ios-footnote">Aún no hay compras registradas desde el checkout público.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ventas.map((o) => (
              <li key={o.id} className="mc-card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="ios-headline text-[15px]">
                      {new Date(o.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <p className="mt-1 font-semibold text-mc-900">{formatCop(o.totalCop)}</p>
                    {(o.clienteNombre || o.clienteTelefono || o.clienteEmail) && (
                      <p className="ios-subhead mt-1">
                        {[o.clienteNombre, o.clienteTelefono, o.clienteEmail].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {o.notaCliente && <p className="ios-subhead mt-1 italic">{o.notaCliente}</p>}
                  </div>
                </div>
                <ul className="space-y-1 border-t border-mc-200/80 pt-2 text-[13px] text-mc-700">
                  {o.lineas.map((ln) => (
                    <li key={`${o.id}-${ln.productId}`} className="flex justify-between gap-2">
                      <span>
                        {ln.nombre} × {ln.cantidad}
                      </span>
                      <span className="shrink-0">{formatCop(ln.precioUnitarioCop * ln.cantidad)}</span>
                    </li>
                  ))}
                </ul>
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Estado</label>
                  <select
                    className="mc-input py-2.5 text-[15px]"
                    value={o.estado}
                    onChange={(e) => void setEstadoOrden(o.id, e.target.value as McOrdenCatalogoEstado)}
                  >
                    {ESTADOS_ORDEN.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Guía de rastreo</label>
                  <input
                    className="mc-input"
                    placeholder="Número de guía"
                    defaultValue={o.trackingNumber ?? ''}
                    key={`${o.id}-${o.updatedAt}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v !== (o.trackingNumber ?? '')) void setTracking(o.id, v)
                    }}
                  />
                </div>
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Foto de la guía (opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 block w-full text-[13px] text-mc-700"
                    disabled={uploadingId === o.id}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) void onGuiaFile(o.id, f)
                    }}
                  />
                  {o.trackingImageUrl && (
                    <a
                      href={o.trackingImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-[13px] font-medium text-[var(--cat-accent)]"
                    >
                      Ver imagen subida
                    </a>
                  )}
                  {!firebaseStorageConfigured && (
                    <p className="ios-footnote mt-1 text-ios-orange">
                      Configurá Storage en .env para subir fotos de guía.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="ios-headline">Pedidos manuales</h2>
        <form onSubmit={agregarManual} className="mc-card space-y-4">
          <div>
            <label className="ios-footnote font-medium text-mc-700">Cliente (opcional)</label>
            <input className="mc-input" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Qué pidió</label>
            <textarea
              className="mc-input min-h-[88px] resize-y"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. 3 remeras rojas talla M"
              required
            />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Total COP (opcional)</label>
            <input className="mc-input" inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} />
          </div>
          <button type="submit" disabled={busy} className="mc-btn-primary w-full">
            {busy ? 'Guardando…' : 'Guardar pedido manual'}
          </button>
        </form>

        <ul className="flex flex-col gap-3">
          {manual.map((r) => (
            <li key={r.id} className="mc-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="ios-headline text-[15px]">
                    {new Date(r.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                  {r.clienteHint && <p className="ios-subhead">{r.clienteHint}</p>}
                  <p className="ios-subhead mt-1 text-mc-900">{r.nota}</p>
                  {r.totalCop != null && r.totalCop > 0 && (
                    <p className="mt-1 font-semibold text-mc-900">{formatCop(r.totalCop)}</p>
                  )}
                  <span className="mt-2 inline-block rounded-full bg-mc-100 px-2.5 py-1 text-[12px] font-medium capitalize text-mc-700">
                    {r.estado.replace('_', ' ')}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-[13px] font-semibold text-ios-red"
                  onClick={() => void borrarManual(r.id)}
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
