import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { liveSendChat } from '@/live/lib/liveApi'
import type { McLiveChatMessage } from '@/types/mc'

type Props = {
  messages: McLiveChatMessage[]
  slug: string
  sessionId: string
  displayName: string
  enabled: boolean
  onDisplayNameChange?: (name: string) => void
}

export function LiveChatPanel({
  messages,
  slug,
  sessionId,
  displayName,
  enabled,
  onDisplayNameChange,
}: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || !enabled || sending) return
    setSending(true)
    setError(null)
    try {
      await liveSendChat(slug, sessionId, displayName, trimmed)
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar')
    } finally {
      setSending(false)
    }
  }

  const recent = messages.slice(-12)

  return (
    <div className="mc-live-chat pointer-events-none flex flex-col">
      <div
        ref={scrollRef}
        className="mc-live-chat-messages pointer-events-none flex max-h-[7.5rem] flex-col justify-end gap-1 overflow-hidden px-3 pb-1"
        aria-live="polite"
      >
        {recent.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              'mc-live-chat-bubble max-w-[92%] self-start rounded-2xl px-3 py-1.5 text-[12px] leading-snug backdrop-blur-md',
              msg.type === 'purchase'
                ? 'bg-[#c5a367]/25 text-amber-50'
                : 'bg-black/40 text-white/90',
            )}
          >
            {msg.type === 'purchase' ? (
              <span>
                <strong className="font-semibold">{msg.displayName}</strong> {msg.text}
              </span>
            ) : (
              <span>
                <strong className="font-semibold text-white">{msg.displayName}</strong>{' '}
                <span className="text-white/85">{msg.text}</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {enabled && (
        <form
          onSubmit={handleSend}
          className="pointer-events-auto mx-3 mb-2 flex items-center gap-2 rounded-full border border-white/15 bg-black/50 p-1 pl-3 backdrop-blur-xl"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe un mensaje…"
            maxLength={280}
            className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/40 outline-none"
            aria-label="Mensaje del chat"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-40"
            aria-label="Enviar"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L17 12l-10.8 1.4-2.8 7.2z" />
            </svg>
          </button>
        </form>
      )}

      {error && (
        <p className="pointer-events-auto mx-3 mb-1 text-center text-[11px] text-red-300">{error}</p>
      )}

      {onDisplayNameChange && enabled && (
        <input
          type="hidden"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          aria-hidden
        />
      )}
    </div>
  )
}
