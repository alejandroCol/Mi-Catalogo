import {
  announcementBarAriaLabel,
  type ResolvedAnnouncementBar,
} from '@/lib/announcementBar'

type Props = {
  bar: ResolvedAnnouncementBar
  /** Vista previa en panel de configuración: sin animación infinita. */
  preview?: boolean
}

/** Réplicas del bloque de textos para llenar el ancho del marquee. */
const MARQUEE_COPIES = 4

function AnnouncementSegment({ text }: { text: string }) {
  return (
    <span className="mc-announcement-bar__segment">
      <span className="mc-announcement-bar__text">{text}</span>
      <span className="mc-announcement-bar__dot" aria-hidden>
        ·
      </span>
    </span>
  )
}

function AnnouncementCycle({ texts }: { texts: string[] }) {
  return (
    <>
      {texts.map((text, i) => (
        <AnnouncementSegment key={`${i}-${text}`} text={text} />
      ))}
    </>
  )
}

export function CatalogAnnouncementBar({ bar, preview = false }: Props) {
  const label = announcementBarAriaLabel(bar)

  if (preview) {
    return (
      <div
        className="mc-announcement-bar"
        role="region"
        aria-label="Anuncio de la tienda"
        data-preview="true"
        data-theme={bar.theme}
        data-spacing={bar.spacing}
      >
        <div className="mc-announcement-bar__track">
          <AnnouncementCycle texts={bar.texts} />
          <AnnouncementCycle texts={bar.texts} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="mc-announcement-bar"
      role="region"
      aria-label="Anuncio de la tienda"
      data-theme={bar.theme}
      data-spacing={bar.spacing}
    >
      <p className="sr-only">{label}</p>
      <div className="mc-announcement-bar__track" aria-hidden>
        <div className="mc-announcement-bar__group">
          {Array.from({ length: MARQUEE_COPIES }, (_, i) => (
            <AnnouncementCycle key={`a-${i}`} texts={bar.texts} />
          ))}
        </div>
        <div className="mc-announcement-bar__group">
          {Array.from({ length: MARQUEE_COPIES }, (_, i) => (
            <AnnouncementCycle key={`b-${i}`} texts={bar.texts} />
          ))}
        </div>
      </div>
    </div>
  )
}
