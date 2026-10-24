import { beforeEach, describe, expect, it } from 'vitest'
import { LlmError, chatJson, chatStream, clearModelCache, resolveModel } from './llm.ts'
import { DEFAULT_SETTINGS } from '../src/types.ts'

const input = { system: 's', user: 'u', maxTokens: 10, temperature: 0 }

/** A model server that sends one piece of a reply and then nothing more. */
const stalls = (async () => new Response(new ReadableStream({
  start(c) { c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] })}\n\n`)) },
}), { status: 200 })) as unknown as typeof fetch

describe('chatStream', () => {
  it('gives up on a stream that goes quiet', async () => {
    const seen: string[] = []
    const err = await chatStream(DEFAULT_SETTINGS, { ...input, idleMs: 100 }, (d) => seen.push(d), stalls).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(LlmError)
    expect((err as Error).message).toMatch(/sent nothing/)
    expect(seen.join('')).toBe('Hel')
  })

  it('stops on the caller’s signal, as an abort rather than a model error', async () => {
    const ac = new AbortController()
    const p = chatStream(DEFAULT_SETTINGS, { ...input, idleMs: 10_000, signal: ac.signal }, () => ac.abort(), stalls)
    const err = await p.catch((e: unknown) => e)
    expect(err).not.toBeInstanceOf(LlmError)
    expect((err as Error).name).toBe('AbortError')
  })
})

describe('resolveModel', () => {
  const lm = { ...DEFAULT_SETTINGS, baseUrl: 'http://lm:1234/v1', apiKey: 'tok', model: 'big', preferredModel: 'small' }
  const calls: { url: string; auth: string | null; body?: Record<string, unknown> }[] = []
  /** LM Studio, faked: its native model list (or `status` for it) plus a chat endpoint that echoes the model asked for. */
  const server = (models: unknown[], status = 200) => (async (url: string, init?: RequestInit) => {
    const auth = new Headers(init?.headers).get('Authorization')
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined
    calls.push({ url, auth, body })
    if (url.endsWith('/api/v1/models')) return status === 200 ? Response.json({ models }) : new Response('no', { status })
    if (url.endsWith('/chat/completions')) return Response.json({ model: body?.model, choices: [{ message: { content: '{"ok":true}' } }] })
    return new Response('?', { status: 404 })
  }) as unknown as typeof fetch
  const loaded = [{ key: 'small', loaded_instances: [{ id: 'small' }] }, { key: 'big', loaded_instances: [] }]

  beforeEach(() => { clearModelCache(); calls.length = 0 })

  it('uses the preferred model while LM Studio has it loaded, asking with the same token', async () => {
    expect(await resolveModel(lm, server(loaded))).toBe('small')
    expect(calls[0]).toMatchObject({ url: 'http://lm:1234/api/v1/models', auth: 'Bearer tok' })
  })

  it('matches a loaded instance id as well as the key', async () => {
    expect(await resolveModel(lm, server([{ key: 'org/small-gguf', loaded_instances: [{ id: 'small' }] }]))).toBe('small')
  })

  it('keeps settings.model when the preferred one is not loaded', async () => {
    expect(await resolveModel(lm, server([{ key: 'small', loaded_instances: [] }]))).toBe('big')
    clearModelCache()
    expect(await resolveModel(lm, server([]))).toBe('big')
  })

  it('keeps settings.model when the native endpoint 404s or the server is down', async () => {
    expect(await resolveModel(lm, server(loaded, 404))).toBe('big')
    clearModelCache()
    const down = (async () => { throw new TypeError('fetch failed') }) as unknown as typeof fetch
    expect(await resolveModel(lm, down)).toBe('big')
  })

  it('asks nothing when no preferred model is set', async () => {
    expect(await resolveModel({ ...lm, preferredModel: '' }, server(loaded))).toBe('big')
    expect(calls).toHaveLength(0)
  })

  it('caches the answer for a while', async () => {
    const f = server(loaded)
    await resolveModel(lm, f)
    await resolveModel(lm, f)
    expect(calls.filter((c) => c.url.endsWith('/api/v1/models'))).toHaveLength(1)
  })

  it('sends the preferred model on a chat call and reports it', async () => {
    const { model } = await chatJson(lm, input, { name: 'x', schema: {} }, server(loaded))
    expect(calls.find((c) => c.url.endsWith('/chat/completions'))?.body?.model).toBe('small')
    expect(model).toBe('small')
  })

  it('sends settings.model on a chat call when the preferred one is not loaded', async () => {
    const { model } = await chatJson(lm, input, { name: 'x', schema: {} }, server([], 404))
    expect(calls.find((c) => c.url.endsWith('/chat/completions'))?.body?.model).toBe('big')
    expect(model).toBe('big')
  })
})
