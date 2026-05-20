import { useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  isSeasonBannerActive,
  resolveSeasonBanner,
  seasonBannerDismissStorageKey,
} from '@/lib/seasonBanner'
import type { McTenant } from '@/types/mc'

type Props = {
  tenant: McTenant
  slug: string
  /** Vista previa en panel (siempre visible, sin sessionStorage). */
  preview?: boolean
  className?: string
}

export function SeasonBannerSplash({ tenant, slug, preview = false, className }: Props) {
  const content = resolveSeasonBanner(tenant)
  const active = preview || isSeasonBannerActive(tenant)
  const [visible, setVisible] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!active || !content) {
      setVisible(false)
      return
    }
    if (preview) {
      setVisible(true)
      const t = window.setTimeout(() => setEntered(true), 40)
      return () => clearTimeout(t)
    }
    const key = seasonBannerDismissStorageKey(slug, content.revision)
    if (sessionStorage.getItem(key) === '1') {
      setVisible(false)
      return
    }
    setVisible(true)
    const t = window.setTimeout(() => setEntered(true), 50)
    return () => clearTimeout(t)
  }, [active, content, preview, slug])

  useEffect(() => {
    if (!visible || preview) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible, preview])

  function dismiss() {
    if (!content) return
    if (!preview) {
      sessionStorage.setItem(seasonBannerDismissStorageKey(slug, content.revision), '1')
    }
    setEntered(false)
    window.setTimeout(() => setVisible(false), preview ? 0 : 320)
  }

  if (!active || !content || !visible) return null

  const storeName = tenant.nombreTienda?.trim()

  return (
    <div
      className={clsx(
        'mc-season-splash',
        entered && 'mc-season-splash--in',
        preview && 'mc-season-splash--preview',
        className,
      )}
      role="dialog"
      aria-modal={!preview}
      aria-label={content.headline}
    >
      <button
        type="button"
        className="mc-season-splash__backdrop"
        aria-label="Cerrar anuncio"
        onClick={() => dismiss()}
      />

      <div className="mc-season-splash__frame">
        <div className="mc-season-splash__media" aria-hidden>
          {content.imageUrl ? (
            <img
              src={content.imageUrl}
              alt=""
              className="mc-season-splash__img"
              decoding="async"
            />
          ) : (
            <div className="mc-season-splash__img-placeholder" />
          )}
          <div className="mc-season-splash__scrim" />
          <div className="mc-season-splash__grain" aria-hidden />
        </div>

        <div className="mc-season-splash__content">
          <p className="mc-season-splash__eyebrow">{content.eyebrow}</p>
          <h2 className="mc-season-splash__headline">{content.headline}</h2>
          <p className="mc-season-splash__sub">{content.subheadline}</p>
          {storeName && content.headline !== storeName ? (
            <p className="mc-season-splash__store">{storeName}</p>
          ) : null}
        </div>

        <div className="mc-season-splash__footer">
          <button type="button" className="mc-season-splash__cta" onClick={() => dismiss()}>
            {content.ctaLabel}
          </button>
          <button type="button" className="mc-season-splash__skip" onClick={() => dismiss()}>
            Entrar sin ver
          </button>
        </div>

        {!preview ? (
          <button
            type="button"
            className="mc-season-splash__close"
            onClick={() => dismiss()}
            aria-label="Cerrar"
          >
            <span aria-hidden>×</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}