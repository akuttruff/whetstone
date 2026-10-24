import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ProblemScreen from './ProblemScreen.tsx'
import { BUILTIN_PROBLEMS } from '../data/index.ts'
import type { PublicSettings, RunResult } from '../types.ts'

const settings: PublicSettings = { baseUrl: 'http://x/v1', model: 'm', preferredModel: '', autoFeedback: false, autoDelayS: 8, thinking: false, showTechniques: false, language: 'typescript', hasApiKey: false }
const passed: RunResult = { ok: true, passed: 1, total: 1, results: [], output: '', ms: 1 }

describe('ProblemScreen', () => {
  it('drops a run that finishes after the language changed', async () => {
    let finish: (r: RunResult) => void = () => {}
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.startsWith('/api/run')) return new Promise<Response>((resolve) => { finish = (r) => resolve(Response.json(r)) })
      if (u.startsWith('/api/drafts/')) return Response.json({ draft: null })
      if (u.startsWith('/api/reviews') || u.startsWith('/api/chat/')) return Response.json([])
      if (u.startsWith('/api/guides/')) return Response.json({ guide: null })
      return Response.json({ error: 'unexpected ' + u }, { status: 500 })
    }))
    const problem = BUILTIN_PROBLEMS.find((p) => p.id === 'two-sum')!
    const noop = (): void => {}
    const props = { problem, wide: true, onBack: noop, onAutoChange: noop, onVariant: noop, onPorted: noop, onReviewed: noop, onPrimer: noop }
    const user = userEvent.setup()
    const { rerender } = render(<ProblemScreen {...props} settings={settings} />)
    await user.click(screen.getByRole('button', { name: /Run/ }))
    rerender(<ProblemScreen {...props} settings={{ ...settings, language: 'ruby' }} />)
    await act(async () => { finish(passed) })
    expect(screen.queryByText(/tests passed/)).not.toBeInTheDocument()
  })
})
