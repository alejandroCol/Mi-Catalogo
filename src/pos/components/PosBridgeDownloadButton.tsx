import { useMcAuth } from '@/auth/McAuthContext'
import { PosIcon } from '@/pos/components/PosIcon'
import {
  POS_BRIDGE_INSTALLER_FILENAME,
  POS_BRIDGE_INSTALLER_VERSION,
  resolvePosBridgeInstallerUrl,
  triggerPosBridgeDownload,
} from '@/pos/lib/posBridgeInstaller'

type Props = {
  className?: string
  compact?: boolean
}

export function PosBridgeDownloadButton({ className = '', compact }: Props) {
  const { tenant } = useMcAuth()
  const url = resolvePosBridgeInstallerUrl(tenant?.posBridgeInstallerUrl)

  return (
    <button
      type="button"
      className={`mc-landing-btn-secondary text-sm mc-pos-bridge-download ${className}`}
      onClick={() => void triggerPosBridgeDownload(url, POS_BRIDGE_INSTALLER_FILENAME)}
      title={`Instalador puente POS v${POS_BRIDGE_INSTALLER_VERSION}`}
    >
      <PosIcon name="bridge" size={16} />
      {compact ? 'Puente POS' : 'Descargar puente POS'}
    </button>
  )
}
