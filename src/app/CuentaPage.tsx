import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { signOut, updateProfile } from 'firebase/auth'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getAuthApp, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { billingPlanOf } from '@/lib/catalogTheme'
import { isSubscriptionActive } from '@/lib/subscription'
import {
  catalogoVendedorGate,
  explicitCheckoutVentasModo,
  isCatalogoVendedorListo,
} from '@/lib/checkoutVentasModo'
import { IconClipboard } from '@/icons/McIcons'
import {
  WA_COUNTRY_PREFIXES,
  combineWaDigits,
  DEFAULT_WA_PREFIX,
  splitStoredWaDigits,
} from '@/lib/waPhonePrefixes'
import type { McPlatformSettings } from '@/types/mc'
import { CheckoutEnvioRequiredModal } from '@/app/CheckoutEnvioRequiredModal'
import { CheckoutVentasModoOptions } from '@/app/CheckoutVentasModoOptions'
import {
  CheckoutVentasRequiredModal,
  MC_CHECKOUT_VENTAS_ANCHOR,
  MC_CHECKOUT_WHATSAPP_ANCHOR,
} from '@/app/CheckoutVentasRequiredModal'

export function CuentaPage() {
  const { profile, tenant, firebaseUser } = useMcAuth()
  const nav = useNavigate()
  const location = useLocation()
  const [waPrefix, setWaPrefix] = useState(DEFAULT_WA_PREFIX)
  const [waLocal, setWaLocal] = useState('')
  const [waEditorOpen, setWaEditorOpen] = useState(false)
  const [intro, setIntro] = useState('')
  const [salesPeriod, setSalesPeriod] = useState<'week' | 'fortnight'>('week')
  const [checkoutVentasModo, setCheckoutVentasModo] = useState<
    'pasarela' | 'whatsapp' | 'pasarela_micatalogo' | null
  >(null)
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [ownerDisplayName, setOwnerDisplayName] = useState('')
  const [copiedCatalogo, setCopiedCatalogo] = useState(false)
  const [ventasRequiredModalOpen, setVentasRequiredModalOpen] = useState(false)
  const [envioRequiredModalOpen, setEnvioRequiredModalOpen] = useState(false)

  const [politicasCambios, setPoliticasCambios] = useState('')

  useEffect(() => {
    if (!firebaseConfigured) return
    let cancelled = false
    void (async () => {
      try {
        const ps = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
        if (cancelled) return
        setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
      } catch {
        if (!cancelled) setPlatformSettings({})
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!tenant) return
    const { prefix, local } = splitStoredWaDigits(tenant.whatsappNumero ?? '')
    setWaPrefix(prefix || DEFAULT_WA_PREFIX)
    setWaLocal(local)
    setIntro(tenant.mensajeIntro ?? '')
    setSalesPeriod(tenant.salesSummaryPeriod === 'fortnight' ? 'fortnight' : 'week')
    setCheckoutVentasModo(explicitCheckoutVentasModo(tenant))
    setPoliticasCambios(tenant.politicasCambios ?? '')
    setOwnerDisplayName(profile?.displayName?.trim() ?? '')
  }, [tenant, profile?.displayName])

  useEffect(() => {
    if (!tenant) return
    const hash = location.hash
    const anchorId =
      hash === `#${MC_CHECKOUT_VENTAS_ANCHOR}`
        ? MC_CHECKOUT_VENTAS_ANCHOR
        : hash === `#${MC_CHECKOUT_WHATSAPP_ANCHOR}`
          ? MC_CHECKOUT_WHATSAPP_ANCHOR
          : null
    if (!anchorId) return
    const t = window.setTimeout(() => {
      document.getElementById(anchorId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      if (anchorId === MC_CHECKOUT_WHATSAPP_ANCHOR) setWaEditorOpen(true)
    }, 120)
    return () => clearTimeout(t)
  }, [tenant, location.hash])

  const catalogoUrlAbsolute = useMemo(() => {
    if (!tenant?.slug || typeof window === 'undefined') return ''
    return `${window.location.origin}/c/${tenant.slug}`
  }, [tenant?.slug])

  function solicitarAccesoCatalogo(): boolean {
    const gate = tenant ? catalogoVendedorGate(tenant, platformSettings) : 'ventas'
    if (gate === 'ventas') {
      setVentasRequiredModalOpen(true)
      return false
    }
    if (gate === 'envio') {
      setEnvioRequiredModalOpen(true)
      return false
    }
    return true
  }

  async function copiarUrlCatalogo() {
    if (!solicitarAccesoCatalogo()) return
    if (!catalogoUrlAbsolute || !navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(catalogoUrlAbsolute)
      setCopiedCatalogo(true)
      window.setTimeout(() => setCopiedCatalogo(false), 2200)
    } catch {
      setMsg('No se pudo copiar. Copiá manualmente desde la barra del navegador.')
    }
  }

  async function guardar() {
    if (!profile?.tenantId) return
    setBusy(true)
    setMsg(null)
    try {
      const digits = combineWaDigits(waPrefix, waLocal).replace(/\D/g, '')
      if (digits.length < 10 || digits.length > 15) {
        setMsg('Revisá el WhatsApp: código de país + número local (sin 0 inicial donde aplique).')
        setBusy(false)
        return
      }
      if (checkoutVentasModo === null) {
        setMsg('Elegí cómo cerrás ventas en «Checkout · cómo cerrás ventas» antes de guardar.')
        setBusy(false)
        return
      }
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), {
        whatsappNumero: digits,
        mensajeIntro: intro.trim() || '',
        salesSummaryPeriod: salesPeriod,
        checkoutVentasModo,
        politicasCambios: politicasCambios.trim() || '',
      })
      const dn = ownerDisplayName.trim()
      await updateDoc(doc(getDb(), MC.users, profile.uid), { displayName: dn })
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: dn })
      }
      setMsg('Guardado.')
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function salir() {
    if (!firebaseConfigured) return
    await signOut(getAuthApp())
    nav('/login', { replace: true })
  }

  const active = tenant ? isSubscriptionActive(tenant.subscriptionEndsAt) : false
  const plan = tenant ? billingPlanOf(tenant) : 'free'
  const pasarelaLista = tenant?.onepayPaymentsEnabled === true
  const pasarelaMicatalogoOk = platformSettings?.pasarelaMicatalogoActiva === true
  const catalogoListo = tenant ? isCatalogoVendedorListo(tenant, platformSettings) : false
  const cuponesCount = tenant?.cuponesCatalogo?.length ?? 0

  const waDigitsPreview = useMemo(
    () => combineWaDigits(waPrefix, waLocal).replace(/\D/g, ''),
    [waPrefix, waLocal],
  )
  const waDialLabel = useMemo(
    () => WA_COUNTRY_PREFIXES.find((p) => p.dial === waPrefix)?.label ?? `+${waPrefix}`,
    [waPrefix],
  )

  return (
    <div className="mc-shell space-y-8">
      <h1 className="ios-large-title">Cuenta</h1>

      {!active && (
        <p className="border border-neutral-200/60 bg-neutral-50/50 px-4 py-3 text-[13px] leading-relaxed text-[var(--cat-text)]">
          Membresía vencida. Contactá soporte o pedí extensión al súper admin.
        </p>
      )}

      {tenant && (
        <>
          {plan === 'free' ? (
            <Link
              to="/app/plan"
              className="mc-card flex flex-wrap items-center gap-3 transition duration-200 ease-in-out hover:opacity-[0.97]"
            >
              <span className="ios-footnote font-medium">Plan producto:</span>
              <span className="border border-neutral-200/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-mc-600">
                Free
              </span>
              <span className="w-full ios-footnote leading-relaxed text-[var(--cat-muted)]">
                Tocá para ver <strong className="font-medium text-[var(--cat-text)]">Expert</strong> (mensual o anual,
                pago simulado por ahora). Con Expert elegís plantillas y colores del catálogo.
              </span>
            </Link>
          ) : (
            <div className="mc-card flex flex-wrap items-center gap-3">
              <span className="ios-footnote font-medium">Plan producto:</span>
              <span className="border border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cat-text)]">
                Expert
              </span>
            </div>
          )}

          <div className="mc-card space-y-3">
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Tu nombre (opcional)</label>
              <input
                className="mc-input"
                value={ownerDisplayName}
                onChange={(e) => setOwnerDisplayName(e.target.value)}
                placeholder="Cómo te mostramos en el panel"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="mc-card space-y-5">
            <div className="flex flex-col gap-1">
              <p className="ios-subhead leading-relaxed">
                Tienda: <strong className="font-medium text-[var(--cat-text)]">{tenant.nombreTienda}</strong>
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Tu catálogo público</p>
                  <p className="mt-1 truncate font-mono text-[13px] text-[var(--cat-muted)]">
                    {catalogoUrlAbsolute || `/c/${tenant.slug}`}
                  </p>
                </div>
                <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-neutral-200/75 bg-[var(--cat-surface)] px-3 py-2.5 text-[14px] font-medium text-[var(--cat-text)] transition hover:bg-neutral-50/90 sm:flex-initial"
                    disabled={!catalogoUrlAbsolute}
                    onClick={() => void copiarUrlCatalogo()}
                    title={
                      catalogoListo
                        ? undefined
                        : 'Configurá método de pago y envío antes de compartir el catálogo'
                    }
                  >
                    <IconClipboard size={17} />
                    {copiedCatalogo ? 'Copiado' : 'Copiar URL para venta'}
                  </button>
                  <Link
                    to={`/c/${tenant.slug}`}
                    className="mc-btn-secondary inline-flex flex-1 items-center justify-center py-2.5 text-[14px] no-underline sm:flex-initial"
                    onClick={(e) => {
                      if (catalogoListo) return
                      e.preventDefault()
                      void solicitarAccesoCatalogo()
                    }}
                    title={
                      catalogoListo
                        ? undefined
                        : 'Configurá método de pago y envío antes de abrir el catálogo'
                    }
                  >
                    Abrir catálogo
                  </Link>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-200/50 pt-5">
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Portal de venta · estilo</p>
              <p className="ios-footnote mt-1 leading-relaxed text-[var(--cat-muted)]">
                Plantilla y colores del catálogo público. Con Expert los editás en una pantalla dedicada.
              </p>
              {plan === 'expert' ? (
                <Link
                  to="/app/cuenta/estilo"
                  className="mc-btn-primary mt-3 inline-flex w-full items-center justify-center py-3 text-[15px] no-underline"
                >
                  Configurar estilo
                </Link>
              ) : (
                <Link
                  to="/app/plan"
                  className="mc-btn-secondary mt-3 inline-flex w-full items-center justify-center py-3 text-[15px] no-underline"
                >
                  Ver planes para personalizar el catálogo
                </Link>
              )}
            </div>

            <div id={MC_CHECKOUT_WHATSAPP_ANCHOR} className="scroll-mt-6">
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                WhatsApp para pedidos
              </label>
              <div className="mt-1.5 rounded-md border border-neutral-200/60 bg-neutral-50/40 px-3 py-3 text-[15px] leading-relaxed">
                {waDigitsPreview.length >= 10 ? (
                  <p className="text-[var(--cat-text)]">
                    <span className="font-medium">{waDialLabel}</span>
                    <span className="text-[var(--cat-muted)]"> · </span>
                    <span>{waLocal.trim()}</span>
                  </p>
                ) : (
                  <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
                    Todavía no hay un número completo (igual que al crear la tienda: código de país y número local, sin 0 inicial
                    donde aplique).
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                className="mc-btn-secondary mt-3 inline-flex w-full items-center justify-center py-3 text-[15px]"
                onClick={() => setWaEditorOpen((v) => !v)}
              >
                {waEditorOpen ? 'Ocultar configuración' : 'Configurar WhatsApp'}
              </button>
              {waEditorOpen && (
                <div className="mt-3 flex gap-2">
                  <select
                    className="mc-input max-w-[42%] shrink-0 py-3 text-[14px]"
                    value={waPrefix}
                    disabled={busy}
                    onChange={(e) => setWaPrefix(e.target.value)}
                    aria-label="Código de país"
                  >
                    {WA_COUNTRY_PREFIXES.map((p) => (
                      <option key={p.dial} value={p.dial}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="mc-input min-w-0 flex-1"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="300 123 4567"
                    value={waLocal}
                    disabled={busy}
                    onChange={(e) => setWaLocal(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Mensaje intro pedido WhatsApp
              </label>
              <textarea className="mc-input min-h-[88px] resize-y" value={intro} onChange={(e) => setIntro(e.target.value)} />
            </div>
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Resumen de ventas en el inicio (2.º monto)
              </label>
              <select
                className="mc-input py-3"
                value={salesPeriod}
                disabled={busy}
                onChange={(e) => setSalesPeriod(e.target.value as 'week' | 'fortnight')}
              >
                <option value="week">Semana calendario (lunes a domingo)</option>
                <option value="fortnight">Quincena del mes (días 1–15 o 16 al fin)</option>
              </select>
              <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
                Se suman los <strong className="font-medium text-[var(--cat-text)]">Total COP</strong> de los pedidos en
                ese período.
              </p>
            </div>

            <div className="border-t border-neutral-200/50 pt-5">
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Checkout · envíos</p>
              <p className="ios-footnote mt-1 leading-relaxed text-[var(--cat-muted)]">
                Tarifas por ciudad y envío gratis por compra mínima.
              </p>
              <Link
                to="/app/cuenta/envio"
                className="mc-btn-primary mt-3 inline-flex w-full items-center justify-center py-3 text-[15px] no-underline"
              >
                Configurar envío
              </Link>
            </div>

            <div id={MC_CHECKOUT_VENTAS_ANCHOR} className="scroll-mt-6 border-t border-neutral-200/50 pt-5">
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Checkout · cómo cerrás ventas</p>
              <p className="ios-footnote mt-1 leading-relaxed text-[var(--cat-muted)]">
                Elegí una opción. La pasarela con tu cuenta OnePay requiere que el equipo la vincule a tu tienda. Podés usar
                también la pasarela de Mi Catálogo sin registrar comercio propio, si el equipo la tiene activa.
              </p>
              {checkoutVentasModo === null && (
                <p className="ios-footnote mt-2 font-medium text-amber-900">
                  Elegí una opción abajo para activar el catálogo público y el checkout.
                </p>
              )}
              <CheckoutVentasModoOptions
                value={checkoutVentasModo}
                disabled={busy}
                pasarelaLista={pasarelaLista}
                pasarelaMicatalogoOk={pasarelaMicatalogoOk}
                onSelect={(modo) => {
                  setCheckoutVentasModo(modo)
                  if (modo === 'pasarela') nav('/app/pagos-pasarela')
                }}
              />
              <Link
                to="/app/pagos-pasarela"
                className="mc-btn-secondary mt-3 inline-flex w-full items-center justify-center py-3 text-[15px] no-underline"
              >
                Configuración pasarela
              </Link>
            </div>

            <div className="border-t border-neutral-200/50 pt-5">
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Cupones de descuento</p>
              <p className="ios-footnote mt-1 leading-relaxed text-[var(--cat-muted)]">
                {cuponesCount > 0
                  ? `${cuponesCount} cupón(es) configurado(s).`
                  : 'Todavía no hay cupones en el checkout.'}
              </p>
              <Link
                to="/app/cuenta/cupones"
                className="mc-btn-secondary mt-3 inline-flex w-full items-center justify-center py-3 text-[15px] no-underline"
              >
                Configurar cupones
              </Link>
            </div>

            <div className="border-t border-neutral-200/50 pt-5">
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Catálogo público · políticas</p>
              <p className="ios-footnote mt-1.5 leading-relaxed text-[var(--cat-muted)]">
                Textos en la página <strong className="font-medium text-[var(--cat-text)]">Políticas</strong> del catálogo
                (/c/tu-url/politicas). Dejá en blanco lo que no quieras mostrar.
              </p>
              <div className="mt-3">
                <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                  Cambios y devoluciones
                </label>
                <textarea
                  className="mc-input mt-1 min-h-[72px] resize-y"
                  value={politicasCambios}
                  disabled={busy}
                  onChange={(e) => setPoliticasCambios(e.target.value)}
                  placeholder="Plazos, condiciones…"
                />
              </div>
            </div>

            {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
            <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
              Guardar cambios
            </button>
          </div>
        </>
      )}

      <button
        type="button"
        className="w-full border border-neutral-200/70 bg-[var(--cat-surface)] py-3.5 text-[15px] font-medium text-mc-900 transition duration-200 ease-in-out hover:bg-neutral-50/80"
        onClick={() => void salir()}
      >
        Cerrar sesión
      </button>
      <p className="text-center ios-footnote">{firebaseUser?.email}</p>

      <CheckoutVentasRequiredModal
        open={ventasRequiredModalOpen}
        onClose={() => setVentasRequiredModalOpen(false)}
        context="cuenta"
        tenant={tenant ?? null}
        tenantId={profile?.tenantId}
        platformSettings={platformSettings}
        onModoSelected={setCheckoutVentasModo}
      />
      <CheckoutEnvioRequiredModal
        open={envioRequiredModalOpen}
        onClose={() => setEnvioRequiredModalOpen(false)}
      />
    </div>
  )
}
