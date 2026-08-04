import { useEffect, useMemo, useState } from 'react'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  STORE_ABOUT_DEFAULTS,
  STORE_ABOUT_LIMITS,
  buildStoreAboutForSave,
  buildStoreSocialFooterForSave,
  storeAboutVisible,
  storeSocialFooterVisible,
} from '@/lib/storeBrandFooter'
import { StoreBrandAboutSection } from '@/public/StoreBrandAboutSection'
import { StoreBrandSocialLinks } from '@/public/StoreBrandSocialLinks'
import type { McTenant } from '@/types/mc'

function previewTenant(
  base: McTenant,
  draft: {
    aboutEnabled: boolean
    aboutTitle: string
    aboutBody: string
    aboutExtraTitle: string
    aboutExtraBody: string
    socialEnabled: boolean
    socialWhatsapp: boolean
    socialInstagramUrl: string
    socialFacebookUrl: string
  },
): McTenant {
  const storeAbout = buildStoreAboutForSave(draft.aboutEnabled, {
    title: draft.aboutTitle,
    body: draft.aboutBody,
    extraTitle: draft.aboutExtraTitle,
    extraBody: draft.aboutExtraBody,
  })
  const storeSocialFooter = buildStoreSocialFooterForSave(draft.socialEnabled, {
    whatsapp: draft.socialWhatsapp,
    instagramUrl: draft.socialInstagramUrl,
    facebookUrl: draft.socialFacebookUrl,
  })
  return {
    ...base,
    ...(storeAbout ? { storeAbout } : {}),
    ...(storeSocialFooter ? { storeSocialFooter } : {}),
  }
}

export function CuentaSobreMarcaPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel } = useConfigSubpageNav()
  const { showSaveSuccess } = useSaveSuccess()

  const [aboutEnabled, setAboutEnabled] = useState(false)
  const [aboutTitle, setAboutTitle] = useState('')
  const [aboutBody, setAboutBody] = useState('')
  const [aboutExtraTitle, setAboutExtraTitle] = useState('')
  const [aboutExtraBody, setAboutExtraBody] = useState('')

  const [socialEnabled, setSocialEnabled] = useState(false)
  const [socialWhatsapp, setSocialWhatsapp] = useState(false)
  const [socialInstagramUrl, setSocialInstagramUrl] = useState('')
  const [socialFacebookUrl, setSocialFacebookUrl] = useState('')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!tenant) return
    const about = tenant.storeAbout
    setAboutEnabled(!!about?.enabled)
    setAboutTitle(about?.title ?? '')
    setAboutBody(about?.body ?? '')
    setAboutExtraTitle(about?.extraTitle ?? '')
    setAboutExtraBody(about?.extraBody ?? '')

    const social = tenant.storeSocialFooter
    setSocialEnabled(!!social?.enabled)
    setSocialWhatsapp(!!social?.whatsapp)
    setSocialInstagramUrl(social?.instagramUrl ?? '')
    setSocialFacebookUrl(social?.facebookUrl ?? '')
  }, [
    tenant?.id,
    tenant?.storeAbout,
    tenant?.storeSocialFooter,
  ])

  const draftTenant = useMemo(() => {
    if (!tenant) return null
    return previewTenant(tenant, {
      aboutEnabled,
      aboutTitle,
      aboutBody,
      aboutExtraTitle,
      aboutExtraBody,
      socialEnabled,
      socialWhatsapp,
      socialInstagramUrl,
      socialFacebookUrl,
    })
  }, [
    tenant,
    aboutEnabled,
    aboutTitle,
    aboutBody,
    aboutExtraTitle,
    aboutExtraBody,
    socialEnabled,
    socialWhatsapp,
    socialInstagramUrl,
    socialFacebookUrl,
  ])

  const hasWhatsappNumber = !!(tenant?.whatsappNumero?.replace(/\D/g, '').length)
  const aboutWillShow = draftTenant ? storeAboutVisible(draftTenant) : false
  const socialWillShow = draftTenant ? storeSocialFooterVisible(draftTenant) : false

  async function guardar() {
    if (!effectiveTenantId || !tenant) return
    setBusy(true)
    setErr(null)

    const storeAbout = buildStoreAboutForSave(aboutEnabled, {
      title: aboutTitle,
      body: aboutBody,
      extraTitle: aboutExtraTitle,
      extraBody: aboutExtraBody,
    })
    const storeSocialFooter = buildStoreSocialFooterForSave(socialEnabled, {
      whatsapp: socialWhatsapp,
      instagramUrl: socialInstagramUrl,
      facebookUrl: socialFacebookUrl,
    })

    if (aboutEnabled && !storeAbout) {
      setErr('Para mostrar «Sobre mi marca», escribí al menos el texto principal.')
      setBusy(false)
      return
    }
    if (socialEnabled && !storeSocialFooter) {
      setErr('Para mostrar redes, activá al menos WhatsApp, Instagram o Facebook.')
      setBusy(false)
      return
    }

    try {
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        storeAbout: storeAbout ?? deleteField(),
        storeSocialFooter: storeSocialFooter ?? deleteField(),
      })
      showSaveSuccess({ message: 'La sección de marca y redes se actualizó.' })
    } catch {
      setErr('No se pudo guardar. Revisá tu conexión.')
    } finally {
      setBusy(false)
    }
  }

  if (!tenant) {
    return (
      <ConfiguracionesSubpageLayout title="Sobre mi marca" backTo={returnTo} backLabel={returnLabel}>
        <p className="ios-footnote text-[var(--cat-muted)]">Cargando…</p>
      </ConfiguracionesSubpageLayout>
    )
  }

  return (
    <ConfiguracionesSubpageLayout title="Sobre mi marca" backTo={returnTo} backLabel={returnLabel}>
      <div className="mc-card space-y-5">
        <div>
          <h2 className="ios-headline text-[var(--cat-text)]">Sobre mi marca</h2>
          <p className="ios-footnote mt-1.5 max-w-xl leading-relaxed text-[var(--cat-muted)]">
            Contá la historia de tu marca, materiales, durabilidad o cuidados del producto. Aparece al final de tu
            catálogo, antes del pie de página.
          </p>
        </div>

        <McToggleSwitch
          id="mc-store-about-enabled"
          checked={aboutEnabled}
          disabled={busy}
          onChange={setAboutEnabled}
          label="Mostrar sección «Sobre mi marca»"
          description="Ideal para explicar qué hace especial tu producto o cómo cuidarlo."
        />

        {aboutEnabled ? (
          <div className="space-y-4 rounded-xl border border-neutral-200/60 bg-neutral-50/40 p-4 sm:p-5">
            <div>
              <label htmlFor="mc-store-about-title" className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Título
              </label>
              <input
                id="mc-store-about-title"
                className="mc-input mt-1.5"
                value={aboutTitle}
                maxLength={STORE_ABOUT_LIMITS.title}
                disabled={busy}
                placeholder={STORE_ABOUT_DEFAULTS.title}
                onChange={(e) => setAboutTitle(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="mc-store-about-body" className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Texto principal
              </label>
              <textarea
                id="mc-store-about-body"
                className="mc-input mt-1.5 min-h-[8rem] resize-y"
                value={aboutBody}
                maxLength={STORE_ABOUT_LIMITS.body}
                disabled={busy}
                placeholder="Ej.: Cada pieza está elaborada con materiales naturales…"
                onChange={(e) => setAboutBody(e.target.value)}
              />
              <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
                {aboutBody.length}/{STORE_ABOUT_LIMITS.body} caracteres
              </p>
            </div>

            <div className="border-t border-neutral-200/60 pt-4">
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Bloque adicional (opcional)
              </p>
              <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
                Un segundo párrafo separado, por ejemplo cuidados o recomendaciones.
              </p>
            </div>

            <div>
              <label
                htmlFor="mc-store-about-extra-title"
                className="ios-footnote font-medium text-[var(--cat-text)] opacity-80"
              >
                Título del bloque adicional
              </label>
              <input
                id="mc-store-about-extra-title"
                className="mc-input mt-1.5"
                value={aboutExtraTitle}
                maxLength={STORE_ABOUT_LIMITS.extraTitle}
                disabled={busy}
                placeholder="Ej.: Cuidados de la joya"
                onChange={(e) => setAboutExtraTitle(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="mc-store-about-extra-body"
                className="ios-footnote font-medium text-[var(--cat-text)] opacity-80"
              >
                Texto del bloque adicional
              </label>
              <textarea
                id="mc-store-about-extra-body"
                className="mc-input mt-1.5 min-h-[6rem] resize-y"
                value={aboutExtraBody}
                maxLength={STORE_ABOUT_LIMITS.extraBody}
                disabled={busy}
                placeholder="Ej.: Evitá exposición prolongada al sol, contacto con agua…"
                onChange={(e) => setAboutExtraBody(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mc-card mt-6 space-y-5">
        <div>
          <h2 className="ios-headline text-[var(--cat-text)]">Redes sociales</h2>
          <p className="ios-footnote mt-1.5 max-w-xl leading-relaxed text-[var(--cat-muted)]">
            Mostrá tus redes en el pie de página de la tienda para que tus clientes te sigan o escriban.
          </p>
        </div>

        <McToggleSwitch
          id="mc-store-social-enabled"
          checked={socialEnabled}
          disabled={busy}
          onChange={setSocialEnabled}
          label="Mostrar redes en el pie de página"
          description="Los íconos aparecen en el footer del catálogo."
        />

        {socialEnabled ? (
          <div className="space-y-4 rounded-xl border border-neutral-200/60 bg-neutral-50/40 p-4 sm:p-5">
            <McToggleSwitch
              id="mc-store-social-whatsapp"
              checked={socialWhatsapp}
              disabled={busy}
              onChange={setSocialWhatsapp}
              label="WhatsApp"
              description={
                hasWhatsappNumber
                  ? 'Usa el mismo número configurado en WhatsApp para pedidos.'
                  : 'Configurá tu número en Cuenta → WhatsApp para pedidos.'
              }
            />

            <div>
              <label
                htmlFor="mc-store-social-instagram"
                className="ios-footnote font-medium text-[var(--cat-text)] opacity-80"
              >
                Instagram
              </label>
              <input
                id="mc-store-social-instagram"
                className="mc-input mt-1.5"
                value={socialInstagramUrl}
                disabled={busy}
                placeholder="https://instagram.com/tu_marca"
                onChange={(e) => setSocialInstagramUrl(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="mc-store-social-facebook"
                className="ios-footnote font-medium text-[var(--cat-text)] opacity-80"
              >
                Facebook
              </label>
              <input
                id="mc-store-social-facebook"
                className="mc-input mt-1.5"
                value={socialFacebookUrl}
                disabled={busy}
                placeholder="https://facebook.com/tu_marca"
                onChange={(e) => setSocialFacebookUrl(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="mc-btn-primary px-5 py-2.5 text-[15px]"
          disabled={busy}
          onClick={() => void guardar()}
        >
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {err ? (
          <p className="text-[14px] text-red-800" aria-live="polite">
            {err}
          </p>
        ) : null}
      </div>

      {(aboutWillShow || socialWillShow) && draftTenant ? (
        <section className="mc-card mt-6 overflow-hidden p-0">
          <div className="border-b border-neutral-200/60 px-4 py-3 sm:px-5">
            <p className="ios-footnote font-medium text-[var(--cat-text)]">Vista previa en tu tienda</p>
          </div>
          <div className="bg-[var(--cat-bg)]">
            {aboutWillShow ? <StoreBrandAboutSection tenant={draftTenant} /> : null}
            {socialWillShow ? (
              <footer className="border-t mc-pc-border py-6">
                <div className="mc-public-catalog-inset flex flex-col items-center gap-4">
                  <StoreBrandSocialLinks tenant={draftTenant} />
                </div>
              </footer>
            ) : null}
          </div>
        </section>
      ) : null}
    </ConfiguracionesSubpageLayout>
  )
}
