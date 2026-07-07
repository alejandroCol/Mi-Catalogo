import { useRef, useState, useSyncExternalStore } from 'react'
import { useMcAuth } from '@/auth/McAuthContext'
import { PosIcon } from '@/pos/components/PosIcon'
import {
  POS_BRIDGE_INSTALLER_FILENAME,
  POS_BRIDGE_INSTALLER_VERSION,
  resolvePosBridgeInstallerUrl,
  triggerPosBridgeDownload,
} from '@/pos/lib/posBridgeInstaller'
import {
  getPosBridgeMonitorState,
  startPosBridgeMonitoring,
  subscribePosBridgeMonitor,
} from '@/pos/lib/posBridgeMonitor'
import type { McPosSedeConfig } from '@/types/mc'

type Props = {
  className?: string
  compact?: boolean
  config?: McPosSedeConfig
}

export function PosBridgeDownloadButton({ className = '', compact, config }: Props) {
  const { tenant } = useMcAuth()
  const url = resolvePosBridgeInstallerUrl(tenant?.posBridgeInstallerUrl)
  const bridgeUrl = config?.urlBridge?.trim() || undefined
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const { reachable, starting } = useSyncExternalStore(
    subscribePosBridgeMonitor,
    getPosBridgeMonitorState,
    () => ({ monitoring: false, starting: false, reachable: false }),
  )

  const handleStart = () => {
    startPosBridgeMonitoring(bridgeUrl)
    setOpen(false)
  }

  const handleDownload = () => {
    void triggerPosBridgeDownload(url, POS_BRIDGE_INSTALLER_FILENAME)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`mc-pos-bridge-menu ${className}`}>
      <button
        type="button"
        className={`mc-landing-btn-secondary text-sm mc-pos-bridge-download ${open ? 'mc-pos-bridge-menu__trigger--open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        title={`Puente POS v${POS_BRIDGE_INSTALLER_VERSION}`}
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => {
          if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false)
        }}
      >
        <PosIcon name="bridge" size={16} />
        {compact ? 'Puente POS' : 'Puente POS'}
        <PosIcon name="chevron-down" size={14} className="mc-pos-bridge-menu__chevron" />
      </button>
      {open && (
        <div className="mc-pos-bridge-menu__panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="mc-pos-bridge-menu__item"
            disabled={starting || reachable}
            onClick={handleStart}
          >
            <PosIcon name={reachable ? 'printer' : 'bridge'} size={16} />
            {starting ? 'Conectando…' : reachable ? 'Puente activo' : 'Iniciar puente'}
          </button>
          <button type="button" role="menuitem" className="mc-pos-bridge-menu__item" onClick={handleDownload}>
            <PosIcon name="download" size={16} />
            {compact ? 'Descargar instalador' : 'Descargar puente POS'}
          </button>
        </div>
      )}
    </div>
  )
}
