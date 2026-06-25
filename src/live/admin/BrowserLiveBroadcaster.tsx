import { useCallback, useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import clsx from 'clsx'
import {
  livePrepareBrowserBroadcast,
  liveStartBrowserBroadcastEgress,
} from '@/live/lib/liveApi'
import type { BrowserBroadcastRoomCredentials } from '@/live/lib/liveApi'
import { liveCallableErrorMessage } from '@/live/lib/liveCallableError'
import { liveEndSessionKeepalive } from '@/live/lib/liveHostDisconnect'
import {
  livePortraitCaptureOptions,
  livePortraitMediaConstraints,
} from '@/live/lib/livePortraitVideo'
import { getAuthApp } from '@/lib/firebase'

type Props = {
  sessionId: string
  disabled?: boolean
  onBeforeStart?: () => Promise<void>
  onBroadcastingChange?: (active: boolean) => void
  /** LiveKit se cayó sin «Detener cámara» (timeout en el estudio). */
  onHostDisconnected?: () => void
  onError?: (message: string) => void
}

export function BrowserLiveBroadcaster({
  sessionId,
  disabled,
  onBeforeStart,
  onBroadcastingChange,
  onHostDisconnected,
  onError,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const roomRef = useRef<Room | null>(null)
  const intentionalStopRef = useRef(false)
  const unmountingRef = useRef(false)
  const broadcastingRef = useRef(false)
  const idTokenRef = useRef<string | null>(null)
  const onBroadcastingChangeRef = useRef(onBroadcastingChange)
  const onHostDisconnectedRef = useRef(onHostDisconnected)
  const onBeforeStartRef = useRef(onBeforeStart)
  const onErrorRef = useRef(onError)
  const sessionIdRef = useRef(sessionId)

  onBroadcastingChangeRef.current = onBroadcastingChange
  onHostDisconnectedRef.current = onHostDisconnected
  onBeforeStartRef.current = onBeforeStart
  onErrorRef.current = onError
  sessionIdRef.current = sessionId

  const [previewReady, setPreviewReady] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const setBroadcastingState = useCallback((active: boolean) => {
    broadcastingRef.current = active
    setBroadcasting(active)
    onBroadcastingChangeRef.current?.(active)
  }, [])

  const stopRoom = useCallback(async () => {
    const room = roomRef.current
    roomRef.current = null
    if (room) {
      await room.localParticipant.setCameraEnabled(false)
      await room.localParticipant.setMicrophoneEnabled(false)
      room.disconnect()
    }
    setBroadcastingState(false)
  }, [setBroadcastingState])

  const stopRoomRef = useRef(stopRoom)
  stopRoomRef.current = stopRoom

  useEffect(() => {
    return () => {
      unmountingRef.current = true
      void stopRoomRef.current()
    }
  }, [])

  useEffect(() => {
    if (!broadcasting) return
    let cancelled = false
    async function refreshToken() {
      try {
        const token = await getAuthApp().currentUser?.getIdToken()
        if (!cancelled && token) idTokenRef.current = token
      } catch {
        /* ignore */
      }
    }
    void refreshToken()
    const intervalId = window.setInterval(() => void refreshToken(), 4 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [broadcasting])

  useEffect(() => {
    function onPageHide() {
      if (!broadcastingRef.current || intentionalStopRef.current) return
      const token = idTokenRef.current
      if (token) liveEndSessionKeepalive(sessionIdRef.current, token, 'tab_close')
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [])

  function stopPreviewStream() {
    const stream = videoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach((t) => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setPreviewReady(false)
  }

  async function ensurePreview(mode: 'user' | 'environment' = facingMode) {
    if (previewReady || broadcasting) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia(livePortraitMediaConstraints(mode))
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPreviewReady(true)
    } catch {
      onErrorRef.current?.('No pudimos acceder a la cámara. Revisá los permisos del navegador.')
    }
  }

  async function connectRoom(creds: BrowserBroadcastRoomCredentials) {
    stopPreviewStream()

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: livePortraitCaptureOptions(facingMode),
    })
    roomRef.current = room

    room.on(RoomEvent.Disconnected, () => {
      const wasBroadcasting = broadcastingRef.current
      setBroadcastingState(false)
      if (intentionalStopRef.current) {
        intentionalStopRef.current = false
        return
      }
      if (unmountingRef.current) return
      if (wasBroadcasting) onHostDisconnectedRef.current?.()
    })

    await room.connect(creds.livekitUrl, creds.token)
    await room.localParticipant.setCameraEnabled(true, livePortraitCaptureOptions(facingMode))
    await room.localParticipant.setMicrophoneEnabled(true)

    const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
    const localTrack = camPub?.track
    if (localTrack && videoRef.current) {
      localTrack.attach(videoRef.current)
    }

    await liveStartBrowserBroadcastEgress(sessionIdRef.current)

    setBroadcastingState(true)
  }

  async function handleStartBroadcast() {
    if (busy || disabled || broadcasting) return
    setBusy(true)
    try {
      await ensurePreview()
      if (onBeforeStartRef.current) await onBeforeStartRef.current()
      const creds = await livePrepareBrowserBroadcast(sessionIdRef.current)
      await connectRoom(creds)
    } catch (e) {
      onErrorRef.current?.(liveCallableErrorMessage(e))
      intentionalStopRef.current = true
      await stopRoom()
      intentionalStopRef.current = false
      stopPreviewStream()
    } finally {
      setBusy(false)
    }
  }

  async function handleStopBroadcast() {
    setBusy(true)
    try {
      intentionalStopRef.current = true
      await stopRoom()
      stopPreviewStream()
    } finally {
      setBusy(false)
    }
  }

  async function toggleCamera() {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    if (broadcasting && roomRef.current) {
      await roomRef.current.localParticipant.setCameraEnabled(
        true,
        livePortraitCaptureOptions(next),
      )
    } else if (previewReady) {
      stopPreviewStream()
      await ensurePreview(next)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[9/16] max-h-[360px] w-full overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={clsx(
            'h-full w-full object-cover transition',
            facingMode === 'user' && (previewReady || broadcasting) && 'scale-x-[-1]',
            !previewReady && !broadcasting && 'opacity-40',
          )}
        />
        {!previewReady && !broadcasting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-white/80">Vista previa de tu cámara</p>
            <button
              type="button"
              onClick={() => void ensurePreview()}
              className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md"
            >
              Activar cámara
            </button>
          </div>
        )}
        {broadcasting && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            <span className="mc-live-badge-dot h-1.5 w-1.5 rounded-full bg-white" />
            Transmitiendo
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!broadcasting ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void handleStartBroadcast()}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            <span className="mc-live-pulse-dot scale-75 bg-white" />
            {busy ? 'Conectando…' : 'Transmitir desde cámara'}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleStopBroadcast()}
            className="flex-1 rounded-2xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-800"
          >
            Detener cámara
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleCamera()}
          className="rounded-2xl border border-[var(--cat-muted)]/25 px-4 py-3 text-xs font-semibold text-[var(--cat-text)]"
        >
          Voltear cámara
        </button>
      </div>

      <p className="text-xs leading-relaxed text-[var(--cat-muted)]">
        Usá Chrome o Safari en el celular en vertical. Mantené la pantalla encendida mientras transmitís.
        Si cerrás esta pestaña, el live se termina automáticamente.
      </p>
    </div>
  )
}
