import { PosIcon } from '@/pos/components/PosIcon'

export function PosCatalogSyncBadge() {
  return (
    <span className="mc-pos-catalog-sync-badge" role="status">
      <span className="mc-pos-catalog-sync-badge__icon">
        <PosIcon name="sync" size={14} />
      </span>
      <span>Sincronizado con catálogo</span>
      <span className="mc-pos-catalog-sync-badge__check">
        <PosIcon name="check" size={12} />
      </span>
    </span>
  )
}
