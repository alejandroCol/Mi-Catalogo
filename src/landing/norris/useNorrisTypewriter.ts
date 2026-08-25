import { useEffect, useState } from 'react'

type Options = {
  typeMs?: number
  deleteMs?: number
  pauseMs?: number
  enabled?: boolean
}

export function useNorrisTypewriter(phrases: readonly string[], options: Options = {}) {
  const { typeMs = 42, deleteMs = 26, pauseMs = 2600, enabled = true } = options
  const [text, setText] = useState(phrases[0] ?? '')

  useEffect(() => {
    if (!phrases.length || !enabled) {
      setText(phrases[0] ?? '')
      return
    }

    let phraseIndex = 0
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms)
      })

    const run = async () => {
      while (!cancelled) {
        const phrase = phrases[phraseIndex] ?? ''

        for (let i = 1; i <= phrase.length && !cancelled; i++) {
          setText(phrase.slice(0, i))
          await sleep(typeMs)
        }

        await sleep(pauseMs)

        for (let i = phrase.length - 1; i >= 0 && !cancelled; i--) {
          setText(phrase.slice(0, i))
          await sleep(deleteMs)
        }

        await sleep(320)
        phraseIndex = (phraseIndex + 1) % phrases.length
      }
    }

    void run()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [phrases, typeMs, deleteMs, pauseMs, enabled])

  return text
}
