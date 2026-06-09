import { useLocation, type NavigateFunction } from 'react-router-dom'

export type ConfigSubpageNavState = {
  returnTo?: string
  returnLabel?: string
  /** Id de elemento al volver (p. ej. sección «Publicar tienda» en inicio). */
  scrollTo?: string
  /** Flujo iniciado desde «Publicar mi tienda» en la home. */
  publishFlow?: boolean
}

export const CONFIG_SUBPAGE_DEFAULT_RETURN = '/app/cuenta'
export const CONFIG_SUBPAGE_DEFAULT_LABEL = '← Configuraciones'

export function configSubpageNavState(returnTo: string, returnLabel: string): ConfigSubpageNavState {
  return { returnTo, returnLabel }
}

export const DASHBOARD_RETURN_NAV = configSubpageNavState('/app', '← Inicio')

/** Retorno al botón «Publicar mi tienda» en la home tras completar un requisito. */
export const PUBLISH_FROM_HOME_NAV: ConfigSubpageNavState = {
  returnTo: '/app',
  returnLabel: '← Inicio',
  scrollTo: 'publicar-tienda',
  publishFlow: true,
}

export function isPublishFromHomeNav(state: ConfigSubpageNavState | null | undefined): boolean {
  return state?.publishFlow === true
}

export function navigateConfigReturn(
  navigate: NavigateFunction,
  navState: ConfigSubpageNavState,
  opts?: { replace?: boolean },
): void {
  const to = navState.returnTo ?? '/app'
  navigate(to, { state: navState, replace: opts?.replace })
}

export const PERSONALIZAR_SUBPAGE_NAV = configSubpageNavState('/app/personalizar', '← Personalizar tienda')

/** Retorno al abrir solicitud OnePay desde distintas pantallas. */
export const PAGOS_PASARELA_RETURN_FROM_SELECCION = configSubpageNavState(
  '/app/cuenta/checkout-ventas/seleccion',
  '← Seleccionar método de pago',
)

export const PAGOS_PASARELA_RETURN_FROM_CHECKOUT_VENTAS = configSubpageNavState(
  '/app/cuenta/checkout-ventas',
  '← Método de pago',
)

export const PAGOS_PASARELA_RETURN_FROM_CUENTA = configSubpageNavState(
  CONFIG_SUBPAGE_DEFAULT_RETURN,
  CONFIG_SUBPAGE_DEFAULT_LABEL,
)

export const PAGOS_PASARELA_RETURN_FROM_INICIO = configSubpageNavState('/app', '← Inicio')

export const PAGOS_PASARELA_RETURN_FROM_ONEPAY_RESUMEN = configSubpageNavState(
  '/app/pagos-pasarela/onepay',
  '← Dinero en pasarela',
)

/** Texto del enlace «atrás» sin el prefijo «←». */
export function configSubpageBackText(label: string): string {
  return label.replace(/^←\s*/, '')
}

export function useConfigSubpageNav(
  fallbackTo = CONFIG_SUBPAGE_DEFAULT_RETURN,
  fallbackLabel = CONFIG_SUBPAGE_DEFAULT_LABEL,
) {
  const location = useLocation()
  const state = (location.state ?? null) as ConfigSubpageNavState | null
  const returnTo = state?.returnTo ?? fallbackTo
  const returnLabel = state?.returnLabel ?? fallbackLabel
  const navState: ConfigSubpageNavState = { returnTo, returnLabel }
  const fromOutsideConfig = returnTo !== CONFIG_SUBPAGE_DEFAULT_RETURN
  const publishFromHome = isPublishFromHomeNav(state)

  return { returnTo, returnLabel, navState, fromOutsideConfig, publishFromHome }
}
