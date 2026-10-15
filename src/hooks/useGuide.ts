import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.ts'
import type { Guide, Problem, RunResult } from '../types.ts'

/**
 * The hint ladder for a problem: loaded from the server, written by the
 * model for the attempt as it stands, revealed one rung at a time.
 */
export default function useGuide(problem: Problem, answer: string, run: RunResult | null) {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [writing, setWriting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setGuide(null)
    setLoaded(false)
    setError(null)
    void api.guide(problem.id)
      .then(({ guide: g }) => { if (!cancelled) setGuide(g) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [problem.id])

  const write = useCallback(async (): Promise<void> => {
    setWriting(true)
    setError(null)
    try {
      const { guide: g } = await api.writeGuide(problem, answer, run)
      setGuide(g)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setWriting(false)
    }
  }, [problem, answer, run])

  const reveal = useCallback((n: number): void => {
    setGuide((g) => (g ? { ...g, revealed: Math.max(0, Math.min(g.steps.length, n)) } : g))
    void api.revealGuide(problem.id, n).catch(() => {})
  }, [problem.id])

  return { guide, loaded, writing, error, write, reveal }
}
