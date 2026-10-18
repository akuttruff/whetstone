import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.ts'
import type { Language, Problem, Review, RunResult } from '../types.ts'

export interface ReviewState {
  /** Text so far (streaming) or the saved review's text. */
  text: string
  streaming: boolean
  review: Review | null
  error: string | null
  startedAt: number | null
  history: Review[]
}

const EMPTY: ReviewState = { text: '', streaming: false, review: null, error: null, startedAt: null, history: [] }

/**
 * Model reviews for the current attempt: on demand, or automatically after
 * `autoDelayS` seconds without edits when `auto` is on. One review runs at a
 * time; an edit during a review queues one more once it finishes.
 */
export default function useReview(problem: Problem, key: string, language: Language, answer: string, blank: string, run: RunResult | null, auto: boolean, autoDelayS: number) {
  const [state, setState] = useState<ReviewState>(EMPTY)
  /** The answer the last review was of; `stale` compares it with the current one. */
  const [lastReviewed, setLastReviewed] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const reviewedAnswer = useRef<string | null>(null)
  const startRef = useRef<() => void>(() => {})
  const queued = useRef(false)
  const latest = useRef({ answer, run, problem, language })
  latest.current = { answer, run, problem, language }

  // Fresh state per problem, with its earlier reviews.
  useEffect(() => {
    abort.current?.abort()
    abort.current = null
    reviewedAnswer.current = null
    queued.current = false
    setLastReviewed(null)
    setState(EMPTY)
    let cancelled = false
    void api.reviews(key).then((history) => {
      if (cancelled) return
      const last = history[0] ?? null
      setState((s) => ({ ...s, history, review: last, text: last?.text ?? '' }))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [key])

  const start = useCallback((): void => {
    if (abort.current) {
      queued.current = true
      return
    }
    const { answer: a, run: r, problem: p, language: l } = latest.current
    const ac = new AbortController()
    abort.current = ac
    reviewedAnswer.current = a
    setLastReviewed(a)
    setState((s) => ({ ...s, text: '', streaming: true, error: null, review: null, startedAt: Date.now() }))
    void api
      .review({ problem: p, answer: a, run: r, language: l }, (e) => {
        if (ac.signal.aborted) return
        if (e.type === 'delta') setState((s) => ({ ...s, text: s.text + (e.text ?? '') }))
        else if (e.type === 'done' && e.review) {
          const review = e.review
          setState((s) => ({ ...s, text: review.text, review, streaming: false, history: [review, ...s.history].slice(0, 10) }))
        } else if (e.type === 'error') setState((s) => ({ ...s, error: e.message ?? 'review failed', streaming: false }))
      }, ac.signal)
      .catch((err: Error) => {
        if (ac.signal.aborted) return
        setState((s) => ({ ...s, error: err.message, streaming: false }))
      })
      .finally(() => {
        if (abort.current === ac) abort.current = null
        setState((s) => ({ ...s, streaming: false }))
        if (queued.current && !ac.signal.aborted) {
          queued.current = false
          if (latest.current.answer !== reviewedAnswer.current) startRef.current()
        }
      })
  }, [])
  startRef.current = start

  const cancel = useCallback((): void => {
    abort.current?.abort()
    abort.current = null
    queued.current = false
    setState((s) => ({ ...s, streaming: false }))
  }, [])

  // Auto mode: review after a quiet period, when there is something new to review.
  useEffect(() => {
    if (!auto) return
    const trimmed = answer.trim()
    if (!trimmed || answer === blank || answer === reviewedAnswer.current) return
    const t = setTimeout(start, Math.max(2, autoDelayS) * 1000)
    return () => clearTimeout(t)
  }, [auto, answer, blank, autoDelayS, start])

  useEffect(() => () => abort.current?.abort(), [])

  return { ...state, start, cancel, stale: lastReviewed !== null && lastReviewed !== answer }
}
