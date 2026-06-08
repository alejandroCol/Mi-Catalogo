import type { ConfigMenuItem } from '@/app/configuraciones/types'

const PLAN_UPGRADE_PATH = '/app/plan'

/** Destino del tile: página de la función o upgrade Expert. */
export function resolveConfigTileHref(item: ConfigMenuItem, hasExpertAccess: boolean): string {
  if (item.expert && !item.expertGateOnSave && !hasExpertAccess) return PLAN_UPGRADE_PATH
  return item.to
}
