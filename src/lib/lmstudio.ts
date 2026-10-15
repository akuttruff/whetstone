import { loadSettings, type LMSettings } from './settings';

export class LMStudioError extends Error {}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LMModel {
  id: string;
}

const BASE = '/api/lmstudio';

async function request<T>(path: string, init: RequestInit, settings: LMSettings): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(settings.token ? { Authorization: `Bearer ${settings.token}` } : {}),
      },
    });
  } catch {
    throw new LMStudioError(
      "Can't reach LM Studio via the dev proxy. Is its local server running on port 1234, and is the app running with `npm run dev`?",
    );
  }
  if (!res.ok) {
    let message = `LM Studio returned HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body?.error?.message) message = body.error.message;
    } catch {
      // non-JSON error body
    }
    throw new LMStudioError(message);
  }
  return (await res.json()) as T;
}

export function listModels(token?: string): Promise<LMModel[]> {
  const settings = token !== undefined ? { ...loadSettings(), token: token.trim() } : loadSettings();
  return request<{ data: LMModel[] }>('/v1/models', { method: 'GET' }, settings).then(
    (r) => r.data,
  );
}

export function chat(
  messages: ChatMessage[],
  opts: { temperature?: number; settings?: LMSettings } = {},
): Promise<string> {
  const settings = opts.settings ?? loadSettings();
  return request<{ choices: { message: { content: string | null } }[] }>(
    '/v1/chat/completions',
    {
      method: 'POST',
      body: JSON.stringify({
        model: settings.model,
        messages,
        temperature: opts.temperature ?? 0.3,
      }),
    },
    settings,
  ).then((r) => r.choices[0]?.message?.content ?? '');
}

/** Extract the first JSON object/array from a model reply that may be wrapped in prose or code fences. */
export function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```/g, '').trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start === -1 || end <= start) {
    throw new LMStudioError('The model response did not contain a JSON object.');
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    throw new LMStudioError('Could not parse the model response as JSON — try again.');
  }
}
