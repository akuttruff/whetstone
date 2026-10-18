import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.ts'
import type { ChatMessage, Language, Problem, RunResult, Track } from '../types.ts'

export type ChatContext =
  | { problem: Problem; answer: string; run: RunResult | null; language: Language }
  | { primer: { track: Track; topic: string } }
  | { about: true; problem: Problem; language: Language }

export interface ChatState {
  messages: ChatMessage[]
  /** The reply being streamed, before it is saved. */
  pending: string
  streaming: boolean
  error: string | null
}

const EMPTY: ChatState = { messages: [], pending: '', streaming: false, error: null }

export const primerThreadId = (track: Track, topic: string): string => `primer:${track}:${topic}`
/** Any question about a problem, kept apart from its review thread; takes the work key (id, or id@language). Mirrors server/prompts.ts. */
export const aboutThreadId = (key: string): string => `about:${key}`

/**
 * A conversation thread shared across devices: under a problem's review
 * (id = problem id), about the problem itself (id = about:<problem id>)
 * or on a primer (id = primer:<track>:<topic>). `context` is read when a
 * question is sent, so it always carries the current draft.
 */
export default function useChat(id: string, context: ChatContext) {
  const [state, setState] = useState<ChatState>(EMPTY)
  const abort = useRef<AbortController | null>(null)
  const latest = useRef(context)
  latest.current = context

  useEffect(() => {
    abort.current?.abort()
    abort.current = null
    setState(EMPTY)
    let cancelled = false
    void api.chat(id).then((messages) => { if (!cancelled) setState((s) => ({ ...s, messages })) }).catch(() => {})
    return () => { cancelled = true }
  }, [id])

  const ask = useCallback((message: string): void => {
    const text = message.trim()
    if (!text || abort.current) return
    const ac = new AbortController()
    abort.current = ac
    setState((s) => ({ ...s, pending: '', streaming: true, error: null }))
    void api
      .ask(id, { ...latest.current, message: text }, (e) => {
        if (ac.signal.aborted) return
        if (e.type === 'user' && typeof e.message === 'object') {
          const m = e.message
          setState((s) => ({ ...s, messages: [...s.messages, m] }))
        } else if (e.type === 'delta') setState((s) => ({ ...s, pending: s.pending + (e.text ?? '') }))
        else if (e.type === 'done' && typeof e.message === 'object') {
          const m = e.message
          setState((s) => ({ ...s, messages: [...s.messages, m], pending: '', streaming: false }))
        } else if (e.type === 'error') setState((s) => ({ ...s, error: typeof e.message === 'string' ? e.message : 'failed', streaming: false }))
      }, ac.signal)
      .catch((err: Error) => { if (!ac.signal.aborted) setState((s) => ({ ...s, error: err.message, streaming: false })) })
      .finally(() => {
        if (abort.current === ac) abort.current = null
        setState((s) => ({ ...s, streaming: false }))
      })
  }, [id])

  const stop = useCallback((): void => {
    abort.current?.abort()
    abort.current = null
    setState((s) => ({ ...s, streaming: false, pending: '' }))
  }, [])

  const clear = useCallback(async (): Promise<void> => {
    stop()
    await api.clearChat(id).catch(() => {})
    setState(EMPTY)
  }, [id, stop])

  useEffect(() => () => abort.current?.abort(), [])

  return { ...state, ask, stop, clear }
}
