import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'

/** Barra fija de registro en móvil — glass dorado estilo iOS. */
export function LandingMobileDock() {
  return (
    <div className="mc-landing-mobile-dock" aria-hidden={false}>
      <p className="mc-landing-mobile-dock__hint">Tu tienda en minutos</p>
      <LandingRegisterButton variant="primary" fullWidth className="mc-landing-mobile-dock__btn" />
    </div>
  )
}
