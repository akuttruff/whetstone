import { describe, expect, it } from 'vitest'
import { LlmError, chatStream } from './llm.ts'
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
