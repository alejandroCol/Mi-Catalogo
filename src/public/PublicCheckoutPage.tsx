import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection } from 'firebase/firestore'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { formatCop } from '@/lib/formatCop'
import { mcOrdenesCatalogoCollection } from '@/lib/mcCollections'
import type { McOrdenCatalogoLinea } from '@/types/mc'
import { usePublicTenant } from '@/public/usePublicTenant'

export function PublicCheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { tenantId, tenant, loading, error } = usePublicTenant(slug)
  const { lines, totalPiezas, clear } = useCatalogoSimpleCart()

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [nota, setNota] = useState('')
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const { lineasOrden, totalCop, preciosOk } = useMemo(() => {
    const lineas: McOrdenCatalogoLinea[] = lines.map((l) => ({
      productId: l.productId,
      nombre: l.titulo,
      cantidad: l.cantidad,
      precioUnitarioCop: Math.max(0, Math.round(l.precioUnitarioCop ?? 0)),
    }))
    const t = lineas.reduce((s, x) => s + x.precioUnitarioCop * x.cantidad, 0)
    const ok = lineas.every((x) => x.precioUnitarioCop > 0)
    return { lineasOrden: lineas, totalCop: t, preciosOk: ok }
  }, [lines])

  async function pagarSimulado(e: React.FormEvent) {
    e.preventDefault()
    setErrMsg(null)
    if (!slug || !tenantId || !firebaseConfigured) {
      setErrMsg('No se puede completar la compra ahora.')
      return
    }
    if (lines.length === 0 || totalPiezas === 0) {
      setErrMsg('Tu carrito está vacío.')
      return
    }
    if (!preciosOk || totalCop <= 0) {
      setErrMsg('Todos los productos deben tener precio para comprar en línea.')
      return
    }
    const now = Date.now()
    setBusy(true)
    try {
      const db = getDb()
      const base: Record<string, unknown> = {
        createdAt: now,
        updatedAt: now,
        estado: 'pagado',
        lineas: lineasOrden,
        totalCop,
        pagoSimulado: true,
      }
      if (nombre.trim()) base.clienteNombre = nombre.trim()
      if (telefono.trim()) base.clienteTelefono = telefono.trim()
      if (email.trim()) base.clienteEmail = email.trim()
      if (nota.trim()) base.notaCliente = nota.trim()

      await addDoc(collection(db, mcOrdenesCatalogoCollection(tenantId)), base)
      clear()
      navigate(`/c/${slug}`, { replace: true })
    } catch {
      setErrMsg('No se pudo registrar la venta. Intentá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  if (!slug) return null

  if (loading) {
    return (
      <div className="mc-public-catalog-inset py-10 text-center text-sm mc-pc-muted">Cargando…</div>
    )
  }

  if (error || !tenantId || !tenant) {
    return (
      <div className="mc-public-catalog-inset py-10 text-center text-sm mc-pc-muted">
        {error ?? 'Catálogo no disponible.'}
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="mc-public-catalog-inset space-y-4 py-8">
        <p className="text-sm mc-pc-text">No hay productos en el carrito.</p>
        <Link to={`/c/${slug}`} className="inline-block text-sm font-semibold text-emerald-700">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="mc-public-catalog-inset max-w-lg space-y-6 py-6">
      <div>
        <Link to={`/c/${slug}`} className="text-sm font-medium text-emerald-700">
          ← Catálogo
        </Link>
        <h1 className="mc-pc-display mt-3 text-xl font-bold mc-pc-text">Checkout</h1>
        <p className="mt-1 text-sm mc-pc-muted">
          Pago simulado: cuando integremos la pasarela real, este paso usará tu tarjeta de verdad.
        </p>
      </div>

      <ul className="space-y-2 rounded-xl border mc-pc-border mc-pc-line-softer p-3 text-sm">
        {lines.map((l) => (
          <li key={l.productId} className="flex justify-between gap-2">
            <span className="mc-pc-text">
              {l.titulo} × {l.cantidad}
            </span>
            <span className="shrink-0 font-medium mc-pc-text">
              {l.precioUnitarioCop != null && l.precioUnitarioCop > 0
                ? formatCop(l.precioUnitarioCop * l.cantidad)
                : '—'}
            </span>
          </li>
        ))}
        <li className="flex justify-between border-t mc-pc-border pt-2 font-semibold mc-pc-text">
          <span>Total</span>
          <span>{totalCop > 0 ? formatCop(totalCop) : '—'}</span>
        </li>
      </ul>

      {!preciosOk && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Hay ítems sin precio. Volvé al catálogo o pedí por WhatsApp si la tienda aún no cargó precios.
        </p>
      )}

      <form onSubmit={(e) => void pagarSimulado(e)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mc-pc-muted">Nombre</label>
          <input
            className="mt-1 w-full rounded-xl border mc-pc-border bg-white/80 px-3 py-2.5 text-sm mc-pc-text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mc-pc-muted">Teléfono</label>
          <input
            className="mt-1 w-full rounded-xl border mc-pc-border bg-white/80 px-3 py-2.5 text-sm mc-pc-text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mc-pc-muted">Correo (opcional)</label>
          <input
            className="mt-1 w-full rounded-xl border mc-pc-border bg-white/80 px-3 py-2.5 text-sm mc-pc-text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mc-pc-muted">Nota para la tienda (opcional)</label>
          <textarea
            className="mt-1 min-h-[72px] w-full resize-y rounded-xl border mc-pc-border bg-white/80 px-3 py-2.5 text-sm mc-pc-text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-dashed mc-pc-border bg-black/[0.02] p-4">
          <p className="text-xs font-medium uppercase tracking-wide mc-pc-muted">Tarjeta (demo)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-lg border mc-pc-border px-3 py-2 text-sm"
              placeholder="Número"
              disabled
              value="4242 4242 4242 4242"
              readOnly
            />
            <input className="rounded-lg border mc-pc-border px-3 py-2 text-sm" placeholder="MM/AA" disabled readOnly />
          </div>
          <p className="mt-2 text-[11px] mc-pc-muted">Los datos no se envían a ningún servidor de pago todavía.</p>
        </div>

        {errMsg && <p className="text-sm text-red-600">{errMsg}</p>}

        <button
          type="submit"
          disabled={busy || !preciosOk || totalCop <= 0}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Procesando…' : 'Confirmar pago simulado'}
        </button>
      </form>
    </div>
  )
}
