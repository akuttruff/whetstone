import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

/** The server, faked: no generated problems, default settings, nothing reviewed. */
function stubServer(): void {
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    const method = init?.method ?? 'GET'
    if (u.startsWith('/api/settings')) return Response.json({ baseUrl: 'http://x/v1', model: 'm', autoFeedback: false, autoDelayS: 8, thinking: false, showTechniques: true, hasApiKey: false })
    if (u.startsWith('/api/problems')) return Response.json([])
    if (u.startsWith('/api/progress')) return Response.json({ patterns: [], latest: { 'two-sum': 9 } })
    if (u.startsWith('/api/drafts/') && method === 'GET') return Response.json({ draft: null })
    if (u.startsWith('/api/drafts/')) return Response.json({ draft: { text: '', updatedAt: '' } })
    if (u.startsWith('/api/reviews')) return Response.json([])
    if (u.startsWith('/api/guides/')) return Response.json({ guide: null })
    if (u.startsWith('/api/chat/')) return Response.json([])
    return Response.json({ error: 'unexpected ' + u }, { status: 500 })
  }))
}

describe('App', () => {
  it('lists the coding track, switches tracks, and opens a problem', async () => {
    stubServer()
    const user = userEvent.setup()
    const { container } = render(<App />)
    expect(await screen.findByRole('heading', { name: 'Whetstone' })).toBeInTheDocument()
    expect(screen.getByText('Two Sum')).toBeInTheDocument()
    await vi.waitFor(() => expect(container.querySelector('.prow .score')?.textContent).toBe('9')) // the latest score chip

    await user.click(screen.getByRole('tab', { name: /Design/ }))
    expect(screen.getByText('Short URL Service')).toBeInTheDocument()

    await user.click(screen.getByText('Short URL Service'))
    expect(await screen.findByRole('heading', { name: 'Short URL Service' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Notes' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Notes' }))
    expect(await screen.findByPlaceholderText(/Requirements/)).toBeInTheDocument()
  })

  it('opens a topic primer from the list and from a problem, and starts practising from it', async () => {
    stubServer()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Whetstone' })
    await user.click(screen.getAllByRole('button', { name: /Primer/ })[0]!)
    expect(await screen.findByRole('heading', { name: /Arrays & Hashing/ })).toBeInTheDocument()
    expect(screen.getByText('How to recognise it')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start practising' }))
    expect(await screen.findByRole('heading', { name: 'Two Sum' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Read the Arrays & Hashing primer first/ }))
    expect(await screen.findByText('Say it out loud')).toBeInTheDocument()
  })
})
