import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { Store, ValidationError } from './store.ts'
import { LlmError, chatJson, chatStream, listModels } from './llm.ts'
import { CHAT_HISTORY, CHAT_MAX_TOKENS, GUIDE_MAX_TOKENS, REVIEW_MAX_TOKENS, chatPrompt, primerChatPrompt, VARIANT_MAX_TOKENS, guideFromModel, guidePrompt, parseVerdict, reviewPrompt, validateProblem, variantFromModel, variantPrompt } from './prompts.ts'
import { runTests } from './runner.ts'
import { TRACKS, isCode } from '../src/types.ts'
import { primerFor } from '../src/data/primers.ts'
import type { Direction, Problem, RunResult, TestCase } from '../src/types.ts'

type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void

export interface ApiOptions {
  dir?: string
  fetchImpl?: typeof fetch
  /** Where test runs get their scratch directories (defaults to <dir>/runs). */
  runDir?: string
}

function json(res: ServerResponse, code: number, body: unknown): void {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage, limit = 2_000_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer | string) => {
      body += chunk
      if (body.length > limit) {
        req.destroy()
        reject(new ValidationError('request too large'))
      }
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try { resolve(JSON.parse(body)) } catch { reject(new ValidationError('invalid JSON')) }
    })
    req.on('error', reject)
  })
}

/**
 * A state-changing request must come from this app's own page: the server
 * runs code and talks to the model, so a page you happened to visit on the
 * same network must not be able to drive it.
 */
function sameOrigin(req: IncomingMessage): boolean {
  const method = (req.method || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD') return true
  const origin = req.headers.origin
  if (!origin) return true // curl and scripts send none
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

const FALLBACK = { track: 'coding', topic: 'Generated', pattern: 'Generated', difficulty: 'medium' } as const

/** The problem a request is about, as sent by the client (built-in ones are not in the database). */
function problemFromBody(v: unknown): Problem {
  return validateProblem(v, FALLBACK)
}

export function createApi(options: ApiOptions = {}) {
  const store = new Store({ dir: options.dir })
  const fetchImpl = options.fetchImpl ?? fetch
  const runDir = options.runDir ?? path.join(options.dir ?? path.resolve(process.cwd(), '.data'), 'runs')

  const route = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url || '/', 'http://local')
    const p = url.pathname.replace(/\/+$/, '')
    const method = req.method || 'GET'
    let m: RegExpExecArray | null

    if (p === '/api/settings') {
      if (method === 'GET') return json(res, 200, store.getPublicSettings())
      if (method === 'PUT') return json(res, 200, store.setSettings(await readBody(req)))
    }

    if (p === '/api/models' && method === 'GET') {
      try {
        return json(res, 200, { models: await listModels(store.getSettings(), fetchImpl), error: null })
      } catch (err) {
        return json(res, 200, { models: [], error: (err as Error).message })
      }
    }

    if (p === '/api/problems' && method === 'GET') return json(res, 200, store.listProblems())
    if ((m = /^\/api\/problems\/([^/]+)$/.exec(p)) && method === 'DELETE') {
      store.deleteProblem(decodeURIComponent(m[1]!))
      return json(res, 200, { ok: true })
    }

    if ((m = /^\/api\/drafts\/([^/]+)$/.exec(p))) {
      const id = decodeURIComponent(m[1]!)
      if (method === 'GET') return json(res, 200, { draft: store.getDraft(id) })
      if (method === 'PUT') {
        const { text } = (await readBody(req)) as { text?: unknown }
        return json(res, 200, { draft: store.setDraft(id, text) })
      }
      if (method === 'DELETE') {
        store.deleteDraft(id)
        return json(res, 200, { ok: true })
      }
    }

    if (p === '/api/reviews' && method === 'GET') {
      const id = url.searchParams.get('problem') || ''
      if (!id) throw new ValidationError('problem is required')
      return json(res, 200, store.listReviews(id))
    }
    if (p === '/api/progress' && method === 'GET') return json(res, 200, store.progress())

    // Run a draft against the problem's tests. The client sends both: built-in
    // problems live in the bundle, not the database.
    if (p === '/api/run' && method === 'POST') {
      const body = (await readBody(req)) as { code?: unknown; tests?: unknown }
      const tests = Array.isArray(body.tests) ? (body.tests as TestCase[]).filter((t) => t && typeof t.call === 'string').slice(0, 20) : []
      if (typeof body.code !== 'string') throw new ValidationError('code is required')
      return json(res, 200, await runTests(body.code, tests, { dir: runDir }))
    }

    // A model review, streamed as server-sent events: {type:'delta'} pieces,
    // then {type:'done', review} once it is saved, or {type:'error'}.
    if (p === '/api/review' && method === 'POST') {
      const body = (await readBody(req)) as { problem?: unknown; answer?: unknown; run?: unknown }
      const problem = problemFromBody(body.problem)
      const answer = typeof body.answer === 'string' ? body.answer.slice(0, 60_000) : ''
      const run = body.run && typeof body.run === 'object' ? (body.run as RunResult) : null
      const settings = store.getSettings()
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' })
      const send = (event: unknown): void => { res.write(`data: ${JSON.stringify(event)}\n\n`) }
      const ac = new AbortController()
      req.on('close', () => ac.abort())
      try {
        const { system, user } = reviewPrompt(problem, answer, run)
        const { text, model } = await chatStream(
          settings,
          { system, user, maxTokens: REVIEW_MAX_TOKENS, temperature: 0.3, signal: ac.signal },
          (delta) => send({ type: 'delta', text: delta }),
          fetchImpl,
        )
        const verdict = parseVerdict(text)
        const review = store.addReview({
          problemId: problem.id, track: problem.track, topic: problem.topic, pattern: problem.pattern,
          score: verdict.score, correct: verdict.correct, focus: verdict.focus, text: verdict.text, model,
        })
        send({ type: 'done', review })
      } catch (err) {
        if (!ac.signal.aborted) send({ type: 'error', message: (err as Error).message })
      }
      res.end()
      return
    }

    // An easier or harder problem on the same pattern, written by the model
    // and, for code, checked: its own solution must pass the tests it wrote.
    if (p === '/api/variants' && method === 'POST') {
      const body = (await readBody(req)) as { problem?: unknown; direction?: unknown }
      const parent = problemFromBody(body.problem)
      const direction: Direction = body.direction === 'harder' ? 'harder' : 'easier'
      const settings = store.getSettings()
      const { system, user, schema } = variantPrompt(parent, direction)
      const { data } = await chatJson<unknown>(settings, { system, user, maxTokens: VARIANT_MAX_TOKENS, temperature: 0.7, signal: AbortSignal.timeout(600_000) }, schema, fetchImpl)
      let problem = variantFromModel(data, parent, direction, (id) => store.hasProblem(id))
      let verified: { passed: number; total: number } | null = null
      if (isCode(problem) && problem.tests.length > 0) {
        const run = await runTests(problem.solution, problem.tests, { dir: runDir })
        verified = { passed: run.passed, total: problem.tests.length }
        if (run.error) problem = { ...problem, tests: [] }
        else problem = { ...problem, tests: problem.tests.filter((_, i) => run.results[i]?.pass) }
      }
      return json(res, 201, { problem: store.addProblem(problem), verified })
    }

    // The follow-up conversation under a problem's review. POST streams the
    // answer as server-sent events, like /api/review, then saves both turns.
    if ((m = /^\/api\/chat\/([^/]+)$/.exec(p))) {
      const id = decodeURIComponent(m[1]!)
      if (method === 'GET') return json(res, 200, store.listChat(id))
      if (method === 'DELETE') {
        store.clearChat(id)
        return json(res, 200, { ok: true })
      }
      if (method === 'POST') {
        const body = (await readBody(req)) as { problem?: unknown; primer?: { track?: unknown; topic?: unknown }; answer?: unknown; run?: unknown; message?: unknown }
        const message = typeof body.message === 'string' ? body.message.trim().slice(0, 8000) : ''
        if (!message) throw new ValidationError('message is empty')
        // The context is either a problem (thread id = problem id) or a primer (thread id = primer:<track>:<topic>).
        let system: string
        if (body.primer) {
          const track = TRACKS.find((t) => t.id === body.primer?.track)?.id
          const topic = typeof body.primer.topic === 'string' ? body.primer.topic : ''
          const primer = track ? primerFor(track, topic) : undefined
          if (!primer) throw new ValidationError('no such primer')
          if (id !== `primer:${track}:${topic}`) throw new ValidationError('primer id mismatch')
          system = primerChatPrompt(primer)
        } else {
          const problem = problemFromBody(body.problem)
          if (problem.id !== id) throw new ValidationError('problem id mismatch')
          const answer = typeof body.answer === 'string' ? body.answer.slice(0, 60_000) : ''
          const run = body.run && typeof body.run === 'object' ? (body.run as RunResult) : null
          system = chatPrompt(problem, answer, run, store.listReviews(id, 1)[0]?.text ?? null)
        }
        const history = store.listChat(id, CHAT_HISTORY).map((c) => ({ role: c.role, content: c.content }))
        const userTurn = store.addChat(id, 'user', message)
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' })
        const send = (event: unknown): void => { res.write(`data: ${JSON.stringify(event)}\n\n`) }
        send({ type: 'user', message: userTurn })
        const ac = new AbortController()
        req.on('close', () => ac.abort())
        try {
          const { text } = await chatStream(
            store.getSettings(),
            { system, history, user: message, maxTokens: CHAT_MAX_TOKENS, temperature: 0.4, signal: ac.signal },
            (delta) => send({ type: 'delta', text: delta }),
            fetchImpl,
          )
          const reply = store.addChat(id, 'assistant', text || '(no reply)')
          send({ type: 'done', message: reply })
        } catch (err) {
          if (!ac.signal.aborted) send({ type: 'error', message: (err as Error).message })
        }
        res.end()
        return
      }
    }

    // A hint ladder for a problem: GET what exists, POST to (re)write one for
    // the current attempt, PUT revealed to remember how far it has been read.
    if ((m = /^\/api\/guides\/([^/]+)$/.exec(p))) {
      const id = decodeURIComponent(m[1]!)
      if (method === 'GET') return json(res, 200, { guide: store.getGuide(id) })
      if (method === 'POST') {
        const body = (await readBody(req)) as { problem?: unknown; answer?: unknown; run?: unknown }
        const problem = problemFromBody(body.problem)
        if (problem.id !== id) throw new ValidationError('problem id mismatch')
        const answer = typeof body.answer === 'string' ? body.answer.slice(0, 60_000) : ''
        const run = body.run && typeof body.run === 'object' ? (body.run as RunResult) : null
        const { system, user, schema } = guidePrompt(problem, answer, run)
        const { data, model } = await chatJson<unknown>(store.getSettings(), { system, user, maxTokens: GUIDE_MAX_TOKENS, temperature: 0.5, signal: AbortSignal.timeout(600_000) }, schema, fetchImpl)
        return json(res, 201, { guide: store.saveGuide(id, guideFromModel(data), model) })
      }
      if (method === 'PUT') {
        const { revealed } = (await readBody(req)) as { revealed?: unknown }
        return json(res, 200, { guide: store.setGuideRevealed(id, revealed) })
      }
    }

    return json(res, 404, { error: 'no such endpoint' })
  }

  const middleware: Middleware = (req, res, next) => {
    if (!(req.url || '').startsWith('/api/')) return next()
    if (!sameOrigin(req)) return json(res, 403, { error: 'cross-origin write refused' })
    route(req, res).catch((err: unknown) => {
      if (res.headersSent) return res.end()
      if (err instanceof ValidationError) return json(res, 400, { error: err.message })
      if (err instanceof LlmError) return json(res, 502, { error: err.message })
      if ((err as Error)?.name === 'TimeoutError') return json(res, 504, { error: 'The model took too long.' })
      console.log(`[whetstone] ${req.method} ${req.url}: ${(err as Error)?.message}`)
      return json(res, 500, { error: 'server error' })
    })
  }

  return { middleware, store }
}

export default function api(options: ApiOptions = {}): Plugin {
  const { middleware } = createApi(options)
  return {
    name: 'whetstone-api',
    configureServer(server) { server.middlewares.use(middleware) },
    configurePreviewServer(server) { server.middlewares.use(middleware) },
  }
}
