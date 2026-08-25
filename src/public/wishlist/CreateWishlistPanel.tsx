import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import type { McWishlistItem } from '@/types/mc'
import { COLOMBIA_DEPARTAMENTOS, formatoDepartamentoEtiqueta } from '@/lib/colombiaGeo'
import { MunicipioCombobox } from '@/public/MunicipioCombobox'
import { usePublicStore } from '@/public/PublicStoreContext'
import { firebaseConfigured } from '@/lib/firebase'
import {
  buildWishlistManagePath,
  buildWishlistManageUrl,
  buildWishlistPublicUrl,
  getOrCreateWishlistSessionToken,
  getStoredWishlistId,
  setStoredWishlistId,
  upsertCatalogWishlist,
  wishlistCallableErrorMessage,
} from '@/lib/wishlist'
import { canUseWebShare, shareSafe } from '@/lib/webShare'

type Step = 'vos' | 'envio' | 'listo'

type Props = {
  /** Ítems iniciales (carrito o favoritos). */
  items: McWishlistItem[]
  onClose?: () => void
  /** Compacto para el drawer del carrito. */
  embedded?: boolean
  /** Tras crear/actualizar (para refrescar el seguimiento en Favoritos). */
  onCreated?: (wishlistId: string) => void
}

function itemKey(i: McWishlistItem): string {
  return `${i.productId}::${i.varianteId || ''}::${i.tallaId || ''}`
}

export function CreateWishlistPanel({ items: initialItems, onClose, embedded, onCreated }: Props) {
  const { slug, to } = usePublicStore()
  const [step, setStep] = useState<Step>('vos')
  const [creadorNombre, setCreadorNombre] = useState('')
  const [tituloOverride, setTituloOverride] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [showExtra, setShowExtra] = useState(false)
  const [telefono, setTelefono] = useState('')
  const [envioDepartamento, setEnvioDepartamento] = useState('')
  const [envioCiudad, setEnvioCiudad] = useState('')
  const [ciudadManual, setCiudadManual] = useState(false)
  const [envioDireccion, setEnvioDireccion] = useState('')
  const [envioReferencia, setEnvioReferencia] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(initialItems.map(itemKey)),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [manageUrl, setManageUrl] = useState<string | null>(null)
  const [wishlistId, setWishlistId] = useState<string | null>(() =>
    slug ? getStoredWishlistId(slug) : null,
  )
  const [copied, setCopied] = useState<'friends' | 'admin' | null>(null)
  const [sessionTokenUsed, setSessionTokenUsed] = useState<string | null>(null)

  const tituloAuto = useMemo(() => {
    const n = creadorNombre.trim()
    return n ? `Regalos para ${n}` : 'Mi lista de regalos'
  }, [creadorNombre])

  const titulo = tituloOverride.trim() || tituloAuto

  const selectedItems = useMemo(
    () => initialItems.filter((i) => selectedKeys.has(itemKey(i))),
    [initialItems, selectedKeys],
  )

  const stepIndex = step === 'vos' ? 0 : step === 'envio' ? 1 : 2

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function goEnvio() {
    setError(null)
    if (!creadorNombre.trim()) {
      setError('¿Cómo te llamás?')
      return
    }
    if (selectedItems.length === 0) {
      setError('Dejá al menos un producto en la lista.')
      return
    }
    setStep('envio')
  }

  async function crear() {
    setError(null)
    if (!slug || !firebaseConfigured) {
      setError('No se puede crear la lista ahora.')
      return
    }
    if (!creadorNombre.trim()) {
      setError('Indicá tu nombre.')
      setStep('vos')
      return
    }
    if (!envioDepartamento.trim() || !envioCiudad.trim() || !envioDireccion.trim()) {
      setError('Completá dónde querés recibir los regalos.')
      return
    }
    if (selectedItems.length === 0) {
      setError('Elegí al menos un producto.')
      setStep('vos')
      return
    }

    setBusy(true)
    try {
      const sessionToken = getOrCreateWishlistSessionToken(slug)
      const existingId = wishlistId || getStoredWishlistId(slug) || undefined
      const res = await upsertCatalogWishlist({
        slug,
        sessionToken,
        wishlistId: existingId,
        titulo,
        mensaje: mensaje.trim() || undefined,
        creadorNombre: creadorNombre.trim(),
        destinatarioNombre: creadorNombre.trim(),
        destinatarioTelefono: telefono.trim() || undefined,
        envioDepartamento: envioDepartamento.trim(),
        envioCiudad: envioCiudad.trim(),
        envioDireccion: envioDireccion.trim(),
        envioReferencia: envioReferencia.trim() || undefined,
        items: selectedItems,
      })
      setStoredWishlistId(slug, res.wishlistId)
      setWishlistId(res.wishlistId)
      setSessionTokenUsed(sessionToken)
      setShareUrl(buildWishlistPublicUrl(slug, res.wishlistId))
      setManageUrl(buildWishlistManageUrl(slug, res.wishlistId, sessionToken))
      setStep('listo')
      onCreated?.(res.wishlistId)
    } catch (e) {
      setError(wishlistCallableErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function compartir() {
    if (!shareUrl) return
    const shared = await shareSafe({
      title: titulo,
      text: `${creadorNombre.trim() || 'Alguien'} armó una lista de regalos. Elegí uno y lo enviamos a su casa.`,
      url: shareUrl,
    })
    if (!shared && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied('friends')
      window.setTimeout(() => setCopied(null), 2000)
    }
  }

  async function copiarLink(kind: 'friends' | 'admin') {
    const url = kind === 'friends' ? shareUrl : manageUrl
    if (!url || !navigator.clipboard?.writeText) return
    await navigator.clipboard.writeText(url)
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 2000)
  }

  const fieldClass =
    'mt-1.5 w-full rounded-xl border border-[color-mix(in_srgb,var(--cat-muted)_20%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_55%,var(--cat-surface)_45%)] px-3.5 py-3 text-sm text-[var(--cat-text)] outline-none transition focus:border-[color-mix(in_srgb,var(--cat-accent)_45%,transparent)] focus:bg-[var(--cat-surface)]'

  const shellClass = embedded
    ? 'space-y-4'
    : 'rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_16%,transparent)] bg-[var(--cat-surface)] px-4 py-5 sm:px-5'

  const itemsStrip = (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {initialItems.map((item) => {
        const key = itemKey(item)
        const on = selectedKeys.has(key)
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggleKey(key)}
            className={clsx(
              'relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition',
              on
                ? 'border-[var(--cat-accent)] opacity-100'
                : 'border-transparent opacity-40 grayscale',
            )}
            aria-pressed={on}
            title={on ? 'Quitar de la lista' : 'Incluir en la lista'}
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center bg-[color-mix(in_srgb,var(--cat-muted)_12%,transparent)] text-[9px] mc-pc-muted">
                ·
              </span>
            )}
            {on ? (
              <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--cat-accent)] text-[10px] font-bold text-[var(--cat-accent-text)]">
                ✓
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )

  if (step === 'listo' && shareUrl && wishlistId) {
    const adminPath =
      sessionTokenUsed != null
        ? buildWishlistManagePath(wishlistId, sessionTokenUsed)
        : `/lista/${wishlistId}/gestionar`
    return (
      <div className={shellClass}>
        <div className="mc-reg-step-animate space-y-4 text-left">
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_18%,transparent)] text-[var(--cat-accent)]">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <h2 className="mc-pc-display mt-3 text-xl font-semibold tracking-tight text-[var(--cat-text)]">
              ¡Lista lista!
            </h2>
          </div>

          <div className="rounded-2xl bg-[color-mix(in_srgb,var(--cat-accent)_8%,var(--cat-surface)_92%)] px-3.5 py-3.5">
            <p className="text-[12px] font-semibold text-[var(--cat-text)]">Para tus amigos</p>
            <p className="mt-0.5 text-[12px] text-[var(--cat-muted)]">Ellos compran el regalo con este link.</p>
            <button
              type="button"
              onClick={() => void compartir()}
              className="mc-pc-btn mt-3 w-full bg-[var(--cat-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)]"
            >
              {canUseWebShare() ? 'Compartir con amigos' : copied === 'friends' ? 'Copiado' : 'Copiar link amigos'}
            </button>
            {canUseWebShare() ? (
              <button
                type="button"
                onClick={() => void copiarLink('friends')}
                className="mt-2 w-full text-center text-[12px] font-medium text-[var(--cat-muted)] underline"
              >
                {copied === 'friends' ? 'Copiado' : 'Solo copiar'}
              </button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--cat-muted)_28%,transparent)] px-3.5 py-3.5">
            <p className="text-[12px] font-semibold text-[var(--cat-text)]">Para vos (administrar)</p>
            <p className="mt-0.5 text-[12px] text-[var(--cat-muted)]">
              Guardalo o mandátelo al celular. No se lo pases a tus amigos.
            </p>
            <button
              type="button"
              onClick={() => void copiarLink('admin')}
              className="mc-pc-btn mt-3 w-full border border-[color-mix(in_srgb,var(--cat-muted)_24%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-text)]"
            >
              {copied === 'admin' ? 'Link de admin copiado' : 'Copiar link de administrar'}
            </button>
            <Link
              to={to(adminPath)}
              onClick={onClose}
              className="mc-pc-btn mt-2 flex w-full justify-center px-4 py-2 text-sm font-medium text-[var(--cat-muted)]"
            >
              Abrir panel de administrar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      {!embedded ? (
        <>
          <h2 className="text-base font-semibold text-[var(--cat-text)]">Lista para regalar</h2>
          <p className="mt-1 text-sm text-[var(--cat-muted)]">
            Tus amigos eligen, pagan, y llega a tu dirección.
          </p>
        </>
      ) : (
        <p className="text-[13px] leading-relaxed text-[var(--cat-muted)]">
          Armá tu lista en 2 pasos. Tus amigos pagan el regalo y llega a vos.
        </p>
      )}

      <div className="flex items-center gap-2 pt-1" aria-hidden>
        {(['vos', 'envio'] as const).map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <span
              className={clsx(
                'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition',
                stepIndex >= i
                  ? 'bg-[var(--cat-accent)] text-[var(--cat-accent-text)]'
                  : 'bg-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] text-[var(--cat-muted)]',
              )}
            >
              {i + 1}
            </span>
            <span
              className={clsx(
                'text-[11px] font-medium',
                stepIndex >= i ? 'text-[var(--cat-text)]' : 'text-[var(--cat-muted)]',
              )}
            >
              {s === 'vos' ? 'Vos' : 'Envío'}
            </span>
            {i === 0 ? (
              <span className="mx-1 h-px flex-1 bg-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)]" />
            ) : null}
          </div>
        ))}
      </div>

      {initialItems.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
            En la lista · {selectedItems.length}/{initialItems.length}
          </p>
          {itemsStrip}
        </div>
      ) : null}

      {step === 'vos' ? (
        <div key="vos" className="mc-reg-step-animate space-y-3">
          <label className="block">
            <span className="text-[12px] font-medium text-[var(--cat-text)]">Tu nombre</span>
            <input
              className={clsx(fieldClass, 'text-base font-medium')}
              value={creadorNombre}
              onChange={(e) => setCreadorNombre(e.target.value)}
              maxLength={80}
              placeholder="Ana"
              autoComplete="name"
              autoFocus={embedded}
            />
          </label>
          <div className="rounded-xl bg-[color-mix(in_srgb,var(--cat-accent)_8%,var(--cat-surface)_92%)] px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
              Así se verá
            </p>
            <p className="mc-pc-display mt-1 text-lg font-semibold tracking-tight text-[var(--cat-text)]">
              {titulo}
            </p>
          </div>
          <button
            type="button"
            className="text-[12px] font-medium text-[var(--cat-muted)] underline underline-offset-2"
            onClick={() => setShowExtra((v) => !v)}
          >
            {showExtra ? 'Ocultar opciones' : 'Personalizar título o mensaje'}
          </button>
          {showExtra ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-[12px] font-medium text-[var(--cat-text)]">Título</span>
                <input
                  className={fieldClass}
                  value={tituloOverride}
                  onChange={(e) => setTituloOverride(e.target.value)}
                  maxLength={80}
                  placeholder={tituloAuto}
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-[var(--cat-text)]">Mensaje</span>
                <textarea
                  className={fieldClass}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  maxLength={400}
                  rows={2}
                  placeholder="Si querés regalarme algo…"
                />
              </label>
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={goEnvio}
            className="mc-pc-btn w-full bg-[var(--cat-accent)] px-4 py-3 text-sm font-semibold text-[var(--cat-accent-text)]"
          >
            Continuar
          </button>
        </div>
      ) : (
        <div key="envio" className="mc-reg-step-animate space-y-3">
          <p className="text-[13px] font-medium text-[var(--cat-text)]">
            ¿Dónde llegan los regalos?
          </p>
          <label className="block">
            <span className="text-[12px] font-medium text-[var(--cat-muted)]">Departamento</span>
            <select
              className={fieldClass}
              value={envioDepartamento}
              onChange={(e) => {
                setEnvioDepartamento(e.target.value)
                setEnvioCiudad('')
                setCiudadManual(false)
              }}
            >
              <option value="">Seleccioná…</option>
              {COLOMBIA_DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {formatoDepartamentoEtiqueta(d)}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-[12px] font-medium text-[var(--cat-muted)]">Ciudad</span>
            {ciudadManual || !envioDepartamento ? (
              <input
                className={fieldClass}
                value={envioCiudad}
                onChange={(e) => setEnvioCiudad(e.target.value)}
                placeholder="Ciudad"
              />
            ) : (
              <MunicipioCombobox
                departamento={envioDepartamento}
                value={envioCiudad}
                onChange={setEnvioCiudad}
                inputClassName={fieldClass}
                placeholder="Buscá tu municipio…"
              />
            )}
            {envioDepartamento && !ciudadManual ? (
              <button
                type="button"
                className="mt-1.5 text-[11px] font-medium text-[var(--cat-muted)] underline"
                onClick={() => setCiudadManual(true)}
              >
                Escribir manualmente
              </button>
            ) : null}
          </div>
          <label className="block">
            <span className="text-[12px] font-medium text-[var(--cat-muted)]">Dirección</span>
            <textarea
              className={fieldClass}
              value={envioDireccion}
              onChange={(e) => setEnvioDireccion(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Calle, número, barrio…"
            />
          </label>
          <button
            type="button"
            className="text-[12px] font-medium text-[var(--cat-muted)] underline underline-offset-2"
            onClick={() => setShowExtra((v) => !v)}
          >
            {showExtra ? 'Menos detalle' : 'Teléfono o referencia'}
          </button>
          {showExtra ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-[12px] font-medium text-[var(--cat-muted)]">Teléfono</span>
                <input
                  className={fieldClass}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  maxLength={40}
                  placeholder="300 123 4567"
                  inputMode="tel"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-[var(--cat-muted)]">Referencia</span>
                <input
                  className={fieldClass}
                  value={envioReferencia}
                  onChange={(e) => setEnvioReferencia(e.target.value)}
                  maxLength={300}
                  placeholder="Apto, portería…"
                />
              </label>
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setStep('vos')
              }}
              className="mc-pc-btn flex-1 border border-[color-mix(in_srgb,var(--cat-muted)_24%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--cat-text)]"
            >
              Atrás
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void crear()}
              className="mc-pc-btn flex-[1.4] bg-[var(--cat-accent)] px-4 py-3 text-sm font-semibold text-[var(--cat-accent-text)] disabled:opacity-40"
            >
              {busy ? 'Creando…' : 'Crear y compartir'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
