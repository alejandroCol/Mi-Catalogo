import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  ANNOUNCEMENT_BAR_DEFAULTS,
  ANNOUNCEMENT_BAR_LIMITS,
  ANNOUNCEMENT_BAR_SPACING_OPTIONS,
  ANNOUNCEMENT_BAR_THEME_OPTIONS,
  announcementBarVisible,
  buildAnnouncementBarForSave,
  isAnnouncementBarSpacing,
  isAnnouncementBarTheme,
  resolveAnnouncementBar,
} from '@/lib/announcementBar'
import { CatalogAnnouncementBar } from '@/public/CatalogAnnouncementBar'
import type { McAnnouncementBarSpacing, McAnnouncementBarTheme, McTenant } from '@/types/mc'

function previewTenant(
  base: McTenant,
  draft: {
    enabled: boolean
    text1: string
    text2: string
    theme: McAnnouncementBarTheme
    spacing: McAnnouncementBarSpacing
  },
): McTenant {
  const announcementBar = buildAnnouncementBarForSave(draft.enabled, {
    text1: draft.text1,
    text2: draft.text2,
    theme: draft.theme,
    spacing: draft.spacing,
  })
  return {
    ...base,
    ...(announcementBar ? { announcementBar } : { announcementBar: undefined }),
  }
}

export function CuentaAnnouncementBarPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel } = useConfigSubpageNav()
  const { showSaveSuccess } = useSaveSuccess()

  const [enabled, setEnabled] = useState(false)
  const [text1, setText1] = useState('')
  const [text2, setText2] = useState('')
  const [theme, setTheme] = useState<McAnnouncementBarTheme>(ANNOUNCEMENT_BAR_DEFAULTS.theme)
  const [spacing, setSpacing] = useState<McAnnouncementBarSpacing>(ANNOUNCEMENT_BAR_DEFAULTS.spacing)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!tenant) return
    const bar = tenant.announcementBar
    setEnabled(!!bar?.enabled)
    if (bar?.texts?.length) {
      setText1(bar.texts[0] ?? '')
      setText2(bar.texts[1] ?? '')
    } else {
      setText1(bar?.text ?? '')
      setText2('')
    }
    setTheme(isAnnouncementBarTheme(bar?.theme) ? bar.theme : ANNOUNCEMENT_BAR_DEFAULTS.theme)
    setSpacing(
      isAnnouncementBarSpacing(bar?.spacing) ? bar.spacing : ANNOUNCEMENT_BAR_DEFAULTS.spacing,
    )
  }, [tenant?.id, tenant?.announcementBar])

  const draftTenant = useMemo(() => {
    if (!tenant) return null
    return previewTenant(tenant, { enabled, text1, text2, theme, spacing })
  }, [tenant, enabled, text1, text2, theme, spacing])

  const resolvedPreview = draftTenant ? resolveAnnouncementBar(draftTenant) : null
  const willShow = draftTenant ? announcementBarVisible(draftTenant) : false

  async function guardar() {
    if (!effectiveTenantId || !tenant) return
    setBusy(true)
    setErr(null)

    const announcementBar = buildAnnouncementBarForSave(enabled, {
      text1,
      text2,
      theme,
      spacing,
    })
    if (enabled && !announcementBar) {
      setErr('Para mostrar la barra, escribí al menos el texto 1.')
      setBusy(false)
      return
    }

    try {
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        announcementBar: announcementBar ?? deleteField(),
      })
      showSaveSuccess({ message: 'La barra de anuncio se actualizó.' })
    } catch {
      setErr('No se pudo guardar. Revisá tu conexión.')
    } finally {
      setBusy(false)
    }
  }

  if (!tenant) {
    return (
      <ConfiguracionesSubpageLayout title="Barra de anuncio" backTo={returnTo} backLabel={returnLabel}>
        <p className="ios-footnote text-[var(--cat-muted)]">Cargando…</p>
      </ConfiguracionesSubpageLayout>
    )
  }

  return (
    <ConfiguracionesSubpageLayout title="Barra de anuncio" backTo={returnTo} backLabel={returnLabel}>
      <div className="mc-card space-y-5">
        <div>
          <h2 className="ios-headline text-[var(--cat-text)]">Barra de anuncio</h2>
          <p className="ios-footnote mt-1.5 max-w-xl leading-relaxed text-[var(--cat-muted)]">
            Una franja delgada arriba de tu tienda para promociones cortas. Podés usar hasta 2 textos
            que se alternan al desplazarse.
          </p>
        </div>

        <McToggleSwitch
          id="mc-announcement-bar-enabled"
          checked={enabled}
          disabled={busy}
          onChange={setEnabled}
          label="Mostrar barra de anuncio"
          description="Aparece arriba del nombre de tu tienda en el catálogo público."
        />

        {enabled ? (
          <div className="space-y-5 rounded-xl border border-neutral-200/60 bg-neutral-50/40 p-4 sm:p-5">
            <div>
              <label
                htmlFor="mc-announcement-bar-text-1"
                className="ios-footnote font-medium text-[var(--cat-text)] opacity-80"
              >
                Texto 1
              </label>
              <input
                id="mc-announcement-bar-text-1"
                className="mc-input mt-1.5"
                value={text1}
                maxLength={ANNOUNCEMENT_BAR_LIMITS.text}
                disabled={busy}
                placeholder={ANNOUNCEMENT_BAR_DEFAULTS.text}
                onChange={(e) => setText1(e.target.value)}
              />
              <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
                {text1.length}/{ANNOUNCEMENT_BAR_LIMITS.text} · Obligatorio para mostrar la barra
              </p>
            </div>

            <div>
              <label
                htmlFor="mc-announcement-bar-text-2"
                className="ios-footnote font-medium text-[var(--cat-text)] opacity-80"
              >
                Texto 2 <span className="font-normal opacity-70">(opcional)</span>
              </label>
              <input
                id="mc-announcement-bar-text-2"
                className="mc-input mt-1.5"
                value={text2}
                maxLength={ANNOUNCEMENT_BAR_LIMITS.text}
                disabled={busy}
                placeholder={ANNOUNCEMENT_BAR_DEFAULTS.text2}
                onChange={(e) => setText2(e.target.value)}
              />
              <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
                {text2.length}/{ANNOUNCEMENT_BAR_LIMITS.text} · Se alterna con el texto 1 en el
                desplazamiento
              </p>
            </div>

            <div>
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Color</p>
              <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
                El color del texto se ajusta solo para que se lea bien.
              </p>
              <div
                className="mt-2.5 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Color de la barra"
              >
                {ANNOUNCEMENT_BAR_THEME_OPTIONS.map((option) => {
                  const selected = theme === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={busy}
                      onClick={() => setTheme(option.id)}
                      className={clsx(
                        'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                        selected
                          ? 'border-[var(--cat-text)] bg-white shadow-sm'
                          : 'border-neutral-200/80 bg-white/70 hover:border-neutral-300',
                      )}
                    >
                      <span
                        className={clsx(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                          option.id === 'black'
                            ? 'border-neutral-800 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-900',
                        )}
                        aria-hidden
                      >
                        Aa
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-[var(--cat-text)]">
                          {option.title}
                        </span>
                        <span className="ios-footnote block text-[var(--cat-muted)]">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Distancia entre textos
              </p>
              <div
                className="mt-2.5 grid grid-cols-3 gap-2"
                role="radiogroup"
                aria-label="Distancia entre textos"
              >
                {ANNOUNCEMENT_BAR_SPACING_OPTIONS.map((option) => {
                  const selected = spacing === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={busy}
                      onClick={() => setSpacing(option.id)}
                      className={clsx(
                        'rounded-xl border px-2.5 py-2.5 text-center transition',
                        selected
                          ? 'border-[var(--cat-text)] bg-white shadow-sm'
                          : 'border-neutral-200/80 bg-white/70 hover:border-neutral-300',
                      )}
                    >
                      <span className="block text-[14px] font-medium text-[var(--cat-text)]">
                        {option.title}
                      </span>
                      <span className="ios-footnote mt-0.5 block text-[var(--cat-muted)]">
                        {option.description}
                      </span>
                    </button>
                  )
                })}
              </div>
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

      {willShow && resolvedPreview ? (
        <section className="mc-card mt-6 overflow-hidden p-0">
          <div className="border-b border-neutral-200/60 px-4 py-3 sm:px-5">
            <p className="ios-footnote font-medium text-[var(--cat-text)]">Vista previa en tu tienda</p>
          </div>
          <div className="bg-[var(--cat-bg)]">
            <CatalogAnnouncementBar bar={resolvedPreview} preview />
            <div className="mc-pc-elev-header border-b border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] bg-[var(--cat-surface)]">
              <div className="flex h-12 items-center px-4">
                <span className="text-[14px] font-semibold tracking-tight text-[var(--cat-text)]">
                  {tenant.nombreTienda || 'Tu tienda'}
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </ConfiguracionesSubpageLayout>
  )
}
