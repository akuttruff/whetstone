import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.ts'

const SAVE_DELAY_MS = 600

/**
 * The text being worked on for a problem (code, notes or an answer), loaded
 * from and saved to the server so the phone and the desktop share it.
 */
export default function useDraft(problemId: string, initial: string) {
  const [text, setTextState] = useState(initial)
  const [loaded, setLoaded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<string | null>(null)

  const flush = useCallback((): void => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (pending.current !== null) {
      const t = pending.current
      pending.current = null
      void api.saveDraft(problemId, t).catch(() => {})
    }
  }, [problemId])

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    void api
      .draft(problemId)
      .then(({ draft }) => { if (!cancelled) setTextState(draft?.text ?? initial) })
      .catch(() => { if (!cancelled) setTextState(initial) })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => {
      cancelled = true
      flush()
    }
  }, [problemId, initial, flush])

  const setText = useCallback((next: string): void => {
    setTextState(next)
    pending.current = next
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }, [flush])

  const reset = useCallback((): void => {
    setTextState(initial)
    pending.current = null
    if (timer.current) clearTimeout(timer.current)
    void api.deleteDraft(problemId).catch(() => {})
  }, [problemId, initial])

  return { text, setText, reset, loaded }
}
