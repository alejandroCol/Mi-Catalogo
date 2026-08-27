import { norrisSplitSections } from '@/landing/norris/norrisContent'
import { useNorrisSectionProgress } from '@/landing/norris/useNorrisSectionProgress'

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

export function NorrisSplitBlock({
  lineA,
  lineB,
  body,
  invert,
}: {
  lineA: string
  lineB: string
  body: string
  invert?: boolean
}) {
  const { ref, progress } = useNorrisSectionProgress()
  const eased = smoothstep(progress)
  const drift = Math.sin(eased * Math.PI) * 48
  const lineAOffset = -drift
  const lineBOffset = drift
  const bodyOpacity = Math.min(1, Math.max(0, (eased - 0.15) * 1.4))
  const bodyY = (1 - bodyOpacity) * 24
  const scale = 0.96 + eased * 0.04

  return (
    <section
      ref={ref}
      className={
        invert ? 'mc-norris-stage mc-norris-stage--split mc-norris-stage--invert' : 'mc-norris-stage mc-norris-stage--split'
      }
    >
      <div
        className="mc-norris-stage__sticky mc-norris-split"
        style={{ transform: `scale(${scale})` }}
      >
        <h2 className="mc-norris-split__lines">
          <span
            className="mc-norris-split__line mc-norris-split__line--a"
            style={{ transform: `translate3d(${lineAOffset}px, 0, 0)` }}
          >
            {lineA}
          </span>
          <span
            className="mc-norris-split__line mc-norris-split__line--b"
            style={{ transform: `translate3d(${lineBOffset}px, 0, 0)` }}
          >
            {lineB}
          </span>
        </h2>
        <p
          className="mc-norris-split__body"
          style={{
            opacity: bodyOpacity,
            transform: `translate3d(0, ${bodyY}px, 0)`,
          }}
        >
          {body}
        </p>
      </div>
    </section>
  )
}

type SplitSectionsProps = {
  skipIds?: string[]
}

export function LandingNorrisSplitSections({ skipIds = [] }: SplitSectionsProps) {
  const skip = new Set(skipIds)

  return (
    <>
      {norrisSplitSections
        .filter((section) => !skip.has(section.id))
        .map((section, i) => (
          <NorrisSplitBlock
            key={section.id}
            lineA={section.lineA}
            lineB={section.lineB}
            body={section.body}
            invert={i % 2 === 1}
          />
        ))}
    </>
  )
}
