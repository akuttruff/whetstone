import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.ts'
import type { Guide, Language, Problem, RunResult } from '../types.ts'

/**
 * The hint ladder for a problem: loaded from the server, written by the
 * model for the attempt as it stands, revealed one rung at a time.
 */
export default function useGuide(problem: Problem, key: string, language: Language, answer: string, run: RunResult | null) {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [writing, setWriting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A different attempt starts empty (adjusted during render); the effect then fetches its ladder.
  const [shownKey, setShownKey] = useState(key)
  if (shownKey !== key) {
    setShownKey(key)
    setGuide(null)
    setLoaded(false)
    setError(null)
  }
  useEffect(() => {
    let cancelled = false
    void api.guide(key)
      .then(({ guide: g }) => { if (!cancelled) setGuide(g) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [key])

  const write = useCallback(async (): Promise<void> => {
    setWriting(true)
    setError(null)
    try {
      const { guide: g } = await api.writeGuide(key, problem, answer, run, language)
      setGuide(g)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setWriting(false)
    }
  }, [key, problem, answer, run, language])

  const reveal = useCallback((n: number): void => {
    setGuide((g) => (g ? { ...g, revealed: Math.max(0, Math.min(g.steps.length, n)) } : g))
    void api.revealGuide(key, n).catch(() => {})
  }, [key])

  return { guide, loaded, writing, error, write, reveal }
}
