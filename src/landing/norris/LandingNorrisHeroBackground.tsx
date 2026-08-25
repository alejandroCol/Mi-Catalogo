import clsx from 'clsx'

function Cloud({ className }: { className: string }) {
  return (
    <div className={clsx('mc-norris-hero-bg__cloud', className)}>
      <span className="mc-norris-hero-bg__puff mc-norris-hero-bg__puff--a" />
      <span className="mc-norris-hero-bg__puff mc-norris-hero-bg__puff--b" />
      <span className="mc-norris-hero-bg__puff mc-norris-hero-bg__puff--c" />
      <span className="mc-norris-hero-bg__puff mc-norris-hero-bg__puff--d" />
    </div>
  )
}

export function LandingNorrisHeroBackground() {
  return (
    <div className="mc-norris-hero-bg" aria-hidden>
      <div className="mc-norris-hero-bg__sky" />
      <div className="mc-norris-hero-bg__glow mc-norris-hero-bg__glow--left" />
      <div className="mc-norris-hero-bg__glow mc-norris-hero-bg__glow--right" />
      <Cloud className="mc-norris-hero-bg__cloud--1" />
      <Cloud className="mc-norris-hero-bg__cloud--2" />
      <Cloud className="mc-norris-hero-bg__cloud--3" />
      <Cloud className="mc-norris-hero-bg__cloud--4" />
      <Cloud className="mc-norris-hero-bg__cloud--5" />
    </div>
  )
}
