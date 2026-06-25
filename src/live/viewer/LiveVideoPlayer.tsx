import { useEffect, useRef, useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import {
  isDemoLivePlaybackUrl,
  LIVE_MUX_ERROR_RETRY_MS,
  LIVE_MUX_SIGNAL_DELAY_MS,
  parseMuxPlaybackId,
  shouldMountLivePlayer,
} from '@/live/lib/muxPlayback'

type Props = {
  playbackUrl: string
  posterUrl?: string
  isLive: boolean
  /** Señal conectada en Mux. Evita montar el player antes de que RTMP llegue. */
  streamActive?: boolean
  isEnded?: boolean
  className?: string
  /** Botón «Activar sonido» para espectadores (autoplay del navegador exige mute inicial). */
  allowAudioUnlock?: boolean
}

function LivePlayerPlaceholder({
  className,
  title,
  subtitle,
}: {
  className: string
  title: string
  subtitle: string
}) {
  return (
    <div
      className={`mc-live-video-placeholder flex items-center justify-center bg-[#0a0a0a] ${className}`}
    >
      <div className="px-6 text-center">
        <div className="mc-live-pulse-dot mx-auto mb-3" />
        <p className="text-sm font-medium text-white/90">{title}</p>
        <p className="mt-1 text-xs text-white/50">{subtitle}</p>
      </div>
    </div>
  )
}

export function LiveVideoPlayer({
  playbackUrl,
  posterUrl,
  isLive,
  streamActive = false,
  isEnded = false,
  className = '',
  allowAudioUnlock = false,
}: Props) {
  const playerRef = useRef<HTMLDivElement>(null)
  const delayGenRef = useRef(0)
  const [signalReady, setSignalReady] = useState(false)
  const [waitingSignal, setWaitingSignal] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [playerEpoch, setPlayerEpoch] = useState(0)

  const wantsPlayer = shouldMountLivePlayer({
    playbackUrl,
    isLive,
    streamActive,
    isEnded,
  })

  const isDemo = isDemoLivePlaybackUrl(playbackUrl)
  const needsSignalDelay = wantsPlayer && isLive && !isEnded && !isDemo

  useEffect(() => {
    if (!needsSignalDelay) {
      setSignalReady(!needsSignalDelay && wantsPlayer)
      setWaitingSignal(false)
      return
    }

    const gen = ++delayGenRef.current
    setSignalReady(false)
    setWaitingSignal(true)

    const timerId = window.setTimeout(() => {
      if (delayGenRef.current !== gen) return
      setSignalReady(true)
      setWaitingSignal(false)
    }, LIVE_MUX_SIGNAL_DELAY_MS)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [needsSignalDelay, wantsPlayer, streamActive, playbackUrl])

  useEffect(() => {
    if (!streamActive) setAudioUnlocked(false)
  }, [streamActive, playbackUrl])

  const mountPlayer = wantsPlayer && (!needsSignalDelay || signalReady)
  const playbackId = parseMuxPlaybackId(playbackUrl)
  const showMutedLive = mountPlayer && isLive && !isEnded && !audioUnlocked
  const playerMuted = isLive && !isEnded && (!allowAudioUnlock || !audioUnlocked)

  useEffect(() => {
    if (!mountPlayer) return
    const el = playerRef.current?.querySelector('mux-player') as HTMLElement & {
      play?: () => Promise<void>
      muted?: boolean
    }
    if (el?.play) {
      void el.play().catch(() => {})
    }
    if (el && !playerMuted) {
      el.muted = false
    }
  }, [playbackUrl, mountPlayer, playerMuted, playerEpoch, audioUnlocked])

  useEffect(() => {
    if (!mountPlayer) return
    const el = playerRef.current?.querySelector('mux-player')
    if (!el) return

    function onMediaError() {
      if (isDemo || isEnded) return
      const gen = ++delayGenRef.current
      setSignalReady(false)
      setWaitingSignal(true)
      window.setTimeout(() => {
        if (delayGenRef.current !== gen) return
        setSignalReady(true)
        setWaitingSignal(false)
        setPlayerEpoch((n) => n + 1)
      }, LIVE_MUX_ERROR_RETRY_MS)
    }

    el.addEventListener('error', onMediaError)
    return () => el.removeEventListener('error', onMediaError)
  }, [mountPlayer, isDemo, isEnded, playerEpoch])

  function unlockAudio() {
    setAudioUnlocked(true)
    const el = playerRef.current?.querySelector('mux-player') as HTMLMediaElement | null
    if (el) {
      el.muted = false
      void el.play().catch(() => {})
    }
  }

  if (!mountPlayer) {
    const connecting = isLive && !isEnded && (waitingSignal || streamActive) && !isDemo
    const idle = isLive && !isEnded && !streamActive && !isDemo
    return (
      <LivePlayerPlaceholder
        className={className}
        title={
          connecting
            ? 'Conectando señal de video…'
            : idle
              ? 'Esperando señal del host…'
              : 'Esperando transmisión…'
        }
        subtitle={
          connecting
            ? 'El video aparece en unos segundos'
            : idle
              ? 'El video aparece cuando conectás OBS, Larix o la cámara del navegador'
              : 'El host conectará pronto'
        }
      />
    )
  }

  return (
    <div ref={playerRef} className={`mc-live-video-wrap relative ${className}`}>
      <MuxPlayer
        key={`${playbackId ?? playbackUrl}-${playerEpoch}`}
        streamType={isLive && !isEnded ? 'live' : 'on-demand'}
        {...(playbackId ? { playbackId } : { src: playbackUrl })}
        poster={posterUrl}
        autoPlay
        muted={playerMuted}
        playsInline
        accentColor="#c5a367"
        primaryColor="#ffffff"
        secondaryColor="rgba(255,255,255,0.7)"
        className="h-full w-full [--media-object-fit:cover]"
      />
      {allowAudioUnlock && showMutedLive && (
        <button
          type="button"
          onClick={unlockAudio}
          className="pointer-events-auto absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md"
        >
          Activar sonido
        </button>
      )}
    </div>
  )
}
