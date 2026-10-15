import type { ModelOption, Settings } from '../src/types.ts'

/**
 * A thin client for any OpenAI-compatible chat server: oMLX on :8000 by
 * default, LM Studio on :1234 with a token. Streams text or asks for a JSON
 * schema; strips a model's <think> blocks either way.
 */

export class LlmError extends Error {}

export interface ChatInput {
  system: string
  user: string
  maxTokens: number
  temperature: number
  signal?: AbortSignal
}

export interface JsonSchemaSpec {
  name: string
  schema: Record<string, unknown>
}

function headers(settings: Settings): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (settings.apiKey) h.Authorization = `Bearer ${settings.apiKey}`
  return h
}

async function post(settings: Settings, body: Record<string, unknown>, fetchImpl: typeof fetch, signal?: AbortSignal): Promise<Response> {
  let res: Response
  try {
    res = await fetchImpl(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: headers(settings),
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new LlmError(`Cannot reach the model server at ${settings.baseUrl} (${(err as Error).message}). Is oMLX running?`)
  }
  if (!res.ok) {
    let detail = ''
    try {
      const j = (await res.json()) as { error?: { message?: string } | string; detail?: string }
      detail = typeof j.error === 'string' ? j.error : j.error?.message ?? j.detail ?? ''
    } catch { /* non-JSON body */ }
    throw new LlmError(`The model server answered ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  return res
}

function baseBody(settings: Settings, input: ChatInput): Record<string, unknown> {
  return {
    model: settings.model,
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ],
    max_tokens: input.maxTokens,
    temperature: input.temperature,
    chat_template_kwargs: { enable_thinking: settings.thinking },
  }
}

/** Drop <think>…</think> blocks, including one still open at the end of a stream. */
export function stripThinking(text: string): string {
  const closed = text.replace(/<think>[\s\S]*?<\/think>/g, '')
  const open = closed.indexOf('<think>')
  return (open >= 0 ? closed.slice(0, open) : closed).replace(/^\s+/, '')
}

export async function chatJson<T>(settings: Settings, input: ChatInput, schema: JsonSchemaSpec, fetchImpl: typeof fetch): Promise<{ data: T; model: string }> {
  const body = {
    ...baseBody(settings, input),
    response_format: { type: 'json_schema', json_schema: { name: schema.name, schema: schema.schema, strict: true } },
  }
  const res = await post(settings, body, fetchImpl, input.signal)
  const json = (await res.json()) as { model?: string; choices?: { message?: { content?: string | null } }[] }
  const text = stripThinking(json.choices?.[0]?.message?.content ?? '')
  const start = text.search(/[[{]/)
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
  if (start < 0 || end <= start) throw new LlmError('The model did not return JSON.')
  try {
    return { data: JSON.parse(text.slice(start, end + 1)) as T, model: json.model ?? settings.model }
  } catch {
    throw new LlmError('The model returned JSON that could not be parsed. Try again.')
  }
}

/**
 * Stream a completion; `onDelta` gets each visible piece of text (thinking
 * removed). Resolves with the full visible text.
 */
export async function chatStream(
  settings: Settings,
  input: ChatInput,
  onDelta: (text: string) => void,
  fetchImpl: typeof fetch,
): Promise<{ text: string; model: string }> {
  const res = await post(settings, { ...baseBody(settings, input), stream: true }, fetchImpl, input.signal)
  if (!res.body) throw new LlmError('The model server sent no body.')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let raw = ''
  let shown = 0 // how much of stripThinking(raw) has been emitted
  let model = settings.model
  const emit = (): void => {
    const visible = stripThinking(raw)
    // Hold back a partial "<think" tag so it is never shown and then retracted.
    const safeEnd = visible.lastIndexOf('<') >= Math.max(0, visible.length - 8) ? visible.lastIndexOf('<') : visible.length
    if (safeEnd > shown) {
      onDelta(visible.slice(shown, safeEnd))
      shown = safeEnd
    }
  }
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const j = JSON.parse(payload) as { model?: string; choices?: { delta?: { content?: string | null } }[] }
        if (j.model) model = j.model
        const piece = j.choices?.[0]?.delta?.content
        if (piece) {
          raw += piece
          emit()
        }
      } catch { /* a keepalive or partial line */ }
    }
  }
  const text = stripThinking(raw)
  if (text.length > shown) onDelta(text.slice(shown))
  return { text, model }
}

export async function listModels(settings: Settings, fetchImpl: typeof fetch): Promise<ModelOption[]> {
  let res: Response
  try {
    res = await fetchImpl(`${settings.baseUrl}/models`, { headers: headers(settings), signal: AbortSignal.timeout(5000) })
  } catch (err) {
    throw new LlmError(`Cannot reach ${settings.baseUrl} (${(err as Error).message})`)
  }
  if (!res.ok) throw new LlmError(`The model server answered ${res.status} for /models`)
  const json = (await res.json()) as { data?: { id?: string }[] }
  return (json.data ?? []).filter((m) => typeof m.id === 'string').map((m) => ({ id: m.id! }))
}
