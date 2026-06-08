import { useLocation } from 'react-router-dom'

export type ConfigSubpageNavState = {
  returnTo?: string
  returnLabel?: string
}

export const CONFIG_SUBPAGE_DEFAULT_RETURN = '/app/cuenta'
export const CONFIG_SUBPAGE_DEFAULT_LABEL = '← Configuraciones'

export function configSubpageNavState(returnTo: string, returnLabel: string): ConfigSubpageNavState {
  return { returnTo, returnLabel }
}

export const DASHBOARD_RETURN_NAV = configSubpageNavState('/app', '← Inicio')

export const PERSONALIZAR_SUBPAGE_NAV = configSubpageNavState('/app/personalizar', '← Personalizar tienda')

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

  return { returnTo, returnLabel, navState, fromOutsideConfig }
}
