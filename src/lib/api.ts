import type { Direction, ModelOption, Problem, Progress, PublicSettings, Review, RunResult, Settings } from '../types.ts'

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch { /* no body */ }
    throw new ApiError(message, res.status)
  }
  return (await res.json()) as T
}

const enc = encodeURIComponent

export interface ReviewEvent {
  type: 'delta' | 'done' | 'error'
  text?: string
  review?: Review
  message?: string
}

export const api = {
  settings: () => request<PublicSettings>('/api/settings'),
  saveSettings: (patch: Partial<Settings>) => request<PublicSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(patch) }),
  models: () => request<{ models: ModelOption[]; error: string | null }>('/api/models'),

  generated: () => request<Problem[]>('/api/problems'),
  deleteProblem: (id: string) => request<{ ok: true }>(`/api/problems/${enc(id)}`, { method: 'DELETE' }),

  draft: (id: string) => request<{ draft: { text: string; updatedAt: string } | null }>(`/api/drafts/${enc(id)}`),
  saveDraft: (id: string, text: string) => request<{ draft: { text: string; updatedAt: string } }>(`/api/drafts/${enc(id)}`, { method: 'PUT', body: JSON.stringify({ text }) }),
  deleteDraft: (id: string) => request<{ ok: true }>(`/api/drafts/${enc(id)}`, { method: 'DELETE' }),

  reviews: (id: string) => request<Review[]>(`/api/reviews?problem=${enc(id)}`),
  progress: () => request<Progress>('/api/progress'),

  run: (code: string, tests: unknown[]) => request<RunResult>('/api/run', { method: 'POST', body: JSON.stringify({ code, tests }) }),

  variant: (problem: Problem, direction: Direction) =>
    request<{ problem: Problem; verified: { passed: number; total: number } | null }>('/api/variants', {
      method: 'POST',
      body: JSON.stringify({ problem, direction }),
    }),

  /** Stream a review; resolves once the server has sent done or error, or the signal aborts. */
  async review(
    body: { problem: Problem; answer: string; run: RunResult | null },
    onEvent: (e: ReviewEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const res = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
    if (!res.ok || !res.body) {
      let message = `HTTP ${res.status}`
      try { message = ((await res.json()) as { error?: string }).error ?? message } catch { /* no body */ }
      throw new ApiError(message, res.status)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let at: number
      while ((at = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, at)
        buffer = buffer.slice(at + 2)
        const line = frame.split('\n').find((l) => l.startsWith('data:'))
        if (!line) continue
        try { onEvent(JSON.parse(line.slice(5)) as ReviewEvent) } catch { /* partial */ }
      }
    }
  },
}
