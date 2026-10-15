import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApi } from './api.ts'
import { BUILTIN_PROBLEMS } from '../src/data/index.ts'

// The setup file stubs fetch per test; these tests talk to a real local server.
const realFetch = globalThis.fetch
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whetstone-api-'))
let base = ''
let server: http.Server

/** A fake model server: streams a fixed review for chat, lists one model. */
const sse = (chunks: string[]): Response => {
  const body = new ReadableStream({
    start(c) {
      for (const text of chunks) c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ model: 'fake', choices: [{ delta: { content: text } }] })}\n\n`))
      c.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
      c.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}
const fakeFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const u = String(url)
  if (u.endsWith('/models')) return Response.json({ data: [{ id: 'fake' }] })
  const body = JSON.parse(String(init?.body)) as { stream?: boolean; response_format?: unknown }
  if (body.stream) return sse(['<think>hmm</think>Nice ', 'try.\n', 'VERDICT: {"score": 7, "correct": false, "focus": "edge cases"}'])
  // A variant request: a tiny knowledge problem.
  return Response.json({ model: 'fake', choices: [{ message: { content: JSON.stringify({ title: 'Smaller question', question: ['why?'], keyPoints: ['a', 'b'], followUps: [] }) } }] })
})

beforeAll(async () => {
  const { middleware } = createApi({ dir, fetchImpl: fakeFetch as unknown as typeof fetch })
  server = http.createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end() }))
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const addr = server.address() as { port: number }
  base = `http://127.0.0.1:${addr.port}`
})
afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()))
  fs.rmSync(dir, { recursive: true, force: true })
})

const post = (p: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> =>
  realFetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

describe('api', () => {
  it('refuses cross-origin writes', async () => {
    const res = await post('/api/drafts/x', { text: 'a' }, { Origin: 'http://evil.example' })
    expect(res.status).toBe(403)
  })

  it('lists models through the model server', async () => {
    expect(await (await realFetch(base + '/api/models')).json()).toEqual({ models: [{ id: 'fake' }], error: null })
  })

  it('runs code', async () => {
    const r = await (await post('/api/run', { code: 'export const f = () => 1', tests: [{ call: 'f()', expected: 1 }] })).json()
    expect(r.ok).toBe(true)
  })

  it('streams a review, strips thinking, saves it, and updates progress', async () => {
    const problem = BUILTIN_PROBLEMS.find((p) => p.id === 'two-sum')!
    const res = await post('/api/review', { problem, answer: 'code', run: null })
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    const text = await res.text()
    const events = text.split('\n\n').filter(Boolean).map((f) => JSON.parse(f.slice(5)))
    const deltas = events.filter((e) => e.type === 'delta').map((e) => e.text).join('')
    expect(deltas).not.toContain('<think>')
    expect(deltas).toContain('Nice try.')
    const done = events.find((e) => e.type === 'done')
    expect(done.review).toMatchObject({ problemId: 'two-sum', score: 7, correct: false, focus: 'edge cases', text: 'Nice try.', model: 'fake' })
    const progress = await (await realFetch(base + '/api/progress')).json()
    expect(progress.latest['two-sum']).toBe(7)
    const reviews = await (await realFetch(base + '/api/reviews?problem=two-sum')).json()
    expect(reviews).toHaveLength(1)
  })

  it('creates and deletes a variant', async () => {
    const parent = BUILTIN_PROBLEMS.find((p) => p.track === 'knowledge')!
    const res = await post('/api/variants', { problem: parent, direction: 'easier' })
    expect(res.status).toBe(201)
    const { problem, verified } = await res.json()
    expect(problem).toMatchObject({ title: 'Smaller question', track: 'knowledge', parentId: parent.id, source: 'generated' })
    expect(verified).toBeNull()
    expect(await (await realFetch(base + '/api/problems')).json()).toHaveLength(1)
    await realFetch(`${base}/api/problems/${problem.id}`, { method: 'DELETE' })
    expect(await (await realFetch(base + '/api/problems')).json()).toHaveLength(0)
  })

  it('validates', async () => {
    expect((await post('/api/review', { problem: 'nope', answer: '' })).status).toBe(400)
    expect((await post('/api/run', { tests: [] })).status).toBe(400)
    expect((await realFetch(base + '/api/nothing')).status).toBe(404)
  })
})
