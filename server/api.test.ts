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
let lastVariantPrompt = ''
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
  if (body.stream) {
    const messages = (body as { messages: { role: string; content: string }[] }).messages
    const system = messages[0]!.content
    if (system.includes('follow-up questions') || system.includes('tutoring a candidate on the interview topic')) {
      return sse(['Use `for (const x of nums)`', ' like this.'])
    }
    return sse(['<think>hmm</think>Nice ', 'try.\n', 'VERDICT: {"score": 7, "correct": false, "focus": "edge cases"}'])
  }
  const schemaName = (body.response_format as { json_schema?: { name?: string } } | undefined)?.json_schema?.name
  if (schemaName === 'hint_ladder') {
    return Response.json({ model: 'fake', choices: [{ message: { content: JSON.stringify({ steps: [{ title: 'Restate', hint: 'What is asked?', tryThis: 'Say it aloud' }, { title: 'Pattern', hint: 'Think map', tryThis: 'Write one' }, { title: 'Plan', hint: 'Loop once', tryThis: 'Code it' }] }) } }] })
  }
  // A variant request: a tiny knowledge problem.
  lastVariantPrompt = (body as { messages: { content: string }[] }).messages.at(-1)!.content
  return Response.json({ model: 'fake', choices: [{ message: { content: JSON.stringify({ title: 'Smaller question', pattern: 'Consensus protocols', question: ['why?'], keyPoints: ['a', 'b'], followUps: [] }) } }] })
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
    // an easier variant ignores the pattern the model named; a harder one keeps it
    expect(problem.pattern).toBe(parent.pattern)
    expect(await (await realFetch(base + '/api/problems')).json()).toHaveLength(1)
    const harder = await (await post('/api/variants', { problem: parent, direction: 'harder' })).json()
    expect(harder.problem.pattern).toBe('Consensus protocols')
    expect(lastVariantPrompt).toMatch(/Set "pattern" to the core technique/)
    expect(lastVariantPrompt).toContain(parent.pattern)
    await realFetch(`${base}/api/problems/${harder.problem.id}`, { method: 'DELETE' })
    // A similar variant keeps the parent's difficulty; an unknown direction falls back to easier.
    const similar = await (await post('/api/variants', { problem: parent, direction: 'similar' })).json()
    expect(similar.problem).toMatchObject({ difficulty: parent.difficulty, parentId: parent.id })
    expect(similar.problem.id).toMatch(/-similar$/)
    const fallback = await (await post('/api/variants', { problem: parent, direction: 'sideways', request: 'make it about caching' })).json()
    expect(fallback.problem.id).toMatch(/-easier/)
    expect(fallback.problem.request).toBe('make it about caching')
    expect(lastVariantPrompt).toContain('The candidate also asked for this: "make it about caching"')
    expect((await post('/api/variants', { problem: parent, direction: 'similar', request: 'x'.repeat(601) })).status).toBe(400)
    expect((await post('/api/variants', { problem: parent, direction: 'similar', request: 7 })).status).toBe(400)
    // The third request was told about the two siblings that already existed on this pattern.
    expect(lastVariantPrompt).toContain('already exist on this pattern')
    expect(lastVariantPrompt).toContain('- Smaller question')
    for (const v of [similar.problem, fallback.problem]) await realFetch(`${base}/api/problems/${v.id}`, { method: 'DELETE' })
    await realFetch(`${base}/api/problems/${problem.id}`, { method: 'DELETE' })
    expect(await (await realFetch(base + '/api/problems')).json()).toHaveLength(0)
  })

  it('writes, reads and reveals a hint ladder', async () => {
    const problem = BUILTIN_PROBLEMS.find((p) => p.id === 'two-sum')!
    expect((await (await realFetch(base + '/api/guides/two-sum')).json()).guide).toBeNull()
    const res = await post('/api/guides/two-sum', { problem, answer: 'partial', run: null })
    expect(res.status).toBe(201)
    const { guide } = await res.json()
    expect(guide).toMatchObject({ problemId: 'two-sum', revealed: 0, model: 'fake' })
    expect(guide.steps).toHaveLength(3)
    const put = await realFetch(base + '/api/guides/two-sum', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revealed: 2 }) })
    expect((await put.json()).guide.revealed).toBe(2)
    expect((await (await realFetch(base + '/api/guides/two-sum')).json()).guide.revealed).toBe(2)
    expect((await post('/api/guides/other-id', { problem, answer: '' })).status).toBe(400)
  })

  it('streams a follow-up under the review and saves both turns', async () => {
    const problem = BUILTIN_PROBLEMS.find((p) => p.id === 'two-sum')!
    const res = await post('/api/chat/two-sum', { problem, answer: 'code', run: null, message: 'what syntax?' })
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    const events = (await res.text()).split('\n\n').filter(Boolean).map((f) => JSON.parse(f.slice(5)))
    expect(events[0]).toMatchObject({ type: 'user', message: { role: 'user', content: 'what syntax?' } })
    const done = events.find((e) => e.type === 'done')
    expect(done.message).toMatchObject({ role: 'assistant', content: 'Use `for (const x of nums)` like this.' })
    const thread = await (await realFetch(base + '/api/chat/two-sum')).json()
    expect(thread.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant'])
    // the next turn carries the history to the model
    fakeFetch.mockClear()
    await (await post('/api/chat/two-sum', { problem, answer: 'code', run: null, message: 'and why?' })).text()
    const sent = JSON.parse(String((fakeFetch.mock.calls[0] as unknown[])[1] && (fakeFetch.mock.calls[0] as [unknown, RequestInit])[1].body)) as { messages: { role: string; content: string }[] }
    expect(sent.messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user'])
    await realFetch(base + '/api/chat/two-sum', { method: 'DELETE' })
    expect(await (await realFetch(base + '/api/chat/two-sum')).json()).toEqual([])
  })

  it('runs an about-the-problem thread apart from the review thread', async () => {
    const problem = BUILTIN_PROBLEMS.find((p) => p.id === 'two-sum')!
    const id = encodeURIComponent('about:two-sum')
    fakeFetch.mockClear()
    const res = await post(`/api/chat/${id}`, { about: true, problem, message: 'Can nums be empty?' })
    expect(res.status).toBe(200)
    const events = (await res.text()).split('\n\n').filter(Boolean).map((f) => JSON.parse(f.slice(5)))
    expect(events.find((e) => e.type === 'done')).toBeTruthy()
    const sent = JSON.parse(String((fakeFetch.mock.calls[0] as [unknown, RequestInit])[1].body)) as { messages: { role: string; content: string }[] }
    expect(sent.messages[0]!.content).toMatch(/Do not hold back/)
    expect((await (await realFetch(base + `/api/chat/${id}`)).json()).length).toBe(2)
    // the review thread for the same problem is untouched
    expect(await (await realFetch(base + '/api/chat/two-sum')).json()).toEqual([])
    expect((await post('/api/chat/two-sum', { about: true, problem, message: 'x' })).status).toBe(400)
  })

  it('runs a primer thread with the primer as context', async () => {
    const id = encodeURIComponent('primer:coding:Arrays & Hashing')
    const res = await post(`/api/chat/${id}`, { primer: { track: 'coding', topic: 'Arrays & Hashing' }, message: 'example?' })
    expect(res.status).toBe(200)
    const events = (await res.text()).split('\n\n').filter(Boolean).map((f) => JSON.parse(f.slice(5)))
    expect(events.find((e) => e.type === 'done')).toBeTruthy()
    expect((await post(`/api/chat/${id}`, { primer: { track: 'coding', topic: 'Nope' }, message: 'x' })).status).toBe(400)
    expect((await post('/api/chat/wrong-id', { primer: { track: 'coding', topic: 'Arrays & Hashing' }, message: 'x' })).status).toBe(400)
  })

  it('validates', async () => {
    expect((await post('/api/review', { problem: 'nope', answer: '' })).status).toBe(400)
    expect((await post('/api/run', { tests: [] })).status).toBe(400)
    expect((await realFetch(base + '/api/nothing')).status).toBe(404)
  })
})
