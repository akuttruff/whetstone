import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { DEFAULT_SETTINGS, DIFFICULTIES, LANGUAGES, TRACKS } from '../src/types.ts'
import { normaliseTests } from '../src/lib/tests.ts'
import type { ChatMessage, Guide, GuideStep, PatternStat, Problem, Progress, PublicSettings, Review, Settings, Track } from '../src/types.ts'

/**
 * Everything the app remembers lives here, on the machine running the
 * server: drafts, saved reviews (the profile), generated variants and the
 * model settings. The phone and the desktop see the same state.
 */

export class ValidationError extends Error {}

const DRAFT_MAX = 200_000
const REVIEW_TEXT_MAX = 50_000

const now = (): string => new Date().toISOString()

export class Store {
  private readonly db: DatabaseSync

  constructor(options: { dir?: string; memory?: boolean } = {}) {
    if (options.memory) {
      this.db = new DatabaseSync(':memory:')
    } else {
      const dir = options.dir ?? path.resolve(process.cwd(), '.data')
      fs.mkdirSync(dir, { recursive: true })
      this.db = new DatabaseSync(path.join(dir, 'whetstone.sqlite'))
      this.db.exec('PRAGMA journal_mode = WAL')
    }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS drafts (
        problem_id TEXT PRIMARY KEY, text TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, track TEXT NOT NULL, topic TEXT NOT NULL,
        pattern TEXT NOT NULL, score INTEGER, correct INTEGER, focus TEXT NOT NULL, text TEXT NOT NULL,
        model TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS reviews_problem ON reviews (problem_id, created_at);
      CREATE TABLE IF NOT EXISTS problems (
        id TEXT PRIMARY KEY, json TEXT NOT NULL, parent_id TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS chats_problem ON chats (problem_id, created_at);
      CREATE TABLE IF NOT EXISTS guides (
        problem_id TEXT PRIMARY KEY, steps TEXT NOT NULL, revealed INTEGER NOT NULL DEFAULT 0,
        model TEXT NOT NULL, created_at TEXT NOT NULL
      );
    `)
  }

  close(): void {
    this.db.close()
  }

  // ── settings ─────────────────────────────────────────────────────────

  getSettings(): Settings {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('settings') as { value: string } | undefined
    if (!row) return { ...DEFAULT_SETTINGS }
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value) as Partial<Settings>) }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  getPublicSettings(): PublicSettings {
    const { apiKey, ...rest } = this.getSettings()
    return { ...rest, hasApiKey: apiKey.length > 0 }
  }

  /** Apply a partial update; `apiKey` is only changed when the patch includes it. */
  setSettings(patch: unknown): PublicSettings {
    if (!patch || typeof patch !== 'object') throw new ValidationError('settings must be an object')
    const p = patch as Record<string, unknown>
    const current = this.getSettings()
    const next: Settings = { ...current }
    if (p.baseUrl !== undefined) {
      const s = typeof p.baseUrl === 'string' ? p.baseUrl.trim().replace(/\/+$/, '') : ''
      if (!/^https?:\/\/[^\s]+$/.test(s)) throw new ValidationError('baseUrl must be an http(s) URL')
      next.baseUrl = s
    }
    if (p.model !== undefined) {
      const s = typeof p.model === 'string' ? p.model.trim() : ''
      if (!s) throw new ValidationError('model is required')
      next.model = s.slice(0, 200)
    }
    if (p.apiKey !== undefined) {
      if (typeof p.apiKey !== 'string') throw new ValidationError('apiKey must be a string')
      next.apiKey = p.apiKey.trim().slice(0, 500)
    }
    if (p.autoFeedback !== undefined) next.autoFeedback = p.autoFeedback === true
    if (p.thinking !== undefined) next.thinking = p.thinking === true
    if (p.showTechniques !== undefined) next.showTechniques = p.showTechniques === true
    if (p.language !== undefined) {
      const l = LANGUAGES.find((x) => x.id === p.language)
      if (!l) throw new ValidationError('unknown language')
      next.language = l.id
    }
    if (p.autoDelayS !== undefined) {
      const n = Number(p.autoDelayS)
      if (!Number.isFinite(n) || n < 2 || n > 120) throw new ValidationError('autoDelayS must be between 2 and 120')
      next.autoDelayS = Math.round(n)
    }
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('settings', JSON.stringify(next))
    return this.getPublicSettings()
  }

  // ── drafts ───────────────────────────────────────────────────────────

  getDraft(problemId: string): { text: string; updatedAt: string } | null {
    const row = this.db.prepare('SELECT text, updated_at FROM drafts WHERE problem_id = ?').get(problemId) as
      | { text: string; updated_at: string }
      | undefined
    return row ? { text: row.text, updatedAt: row.updated_at } : null
  }

  setDraft(problemId: string, text: unknown): { text: string; updatedAt: string } {
    if (!problemId) throw new ValidationError('problem id is required')
    if (typeof text !== 'string') throw new ValidationError('text must be a string')
    if (text.length > DRAFT_MAX) throw new ValidationError('draft is too long')
    const at = now()
    this.db.prepare('INSERT OR REPLACE INTO drafts (problem_id, text, updated_at) VALUES (?, ?, ?)').run(problemId, text, at)
    return { text, updatedAt: at }
  }

  deleteDraft(problemId: string): void {
    this.db.prepare('DELETE FROM drafts WHERE problem_id = ?').run(problemId)
  }

  // ── reviews ──────────────────────────────────────────────────────────

  addReview(input: Omit<Review, 'id' | 'createdAt'>): Review {
    if (!input.problemId) throw new ValidationError('problem id is required')
    if (!TRACKS.some((t) => t.id === input.track)) throw new ValidationError('unknown track')
    const score = input.score === null ? null : Math.max(0, Math.min(10, Math.round(input.score)))
    const review: Review = {
      ...input,
      score,
      text: input.text.slice(0, REVIEW_TEXT_MAX),
      id: randomUUID(),
      createdAt: now(),
    }
    this.db
      .prepare(
        `INSERT INTO reviews (id, problem_id, track, topic, pattern, score, correct, focus, text, model, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        review.id, review.problemId, review.track, review.topic, review.pattern, review.score,
        review.correct === null ? null : review.correct ? 1 : 0, review.focus, review.text, review.model, review.createdAt,
      )
    return review
  }

  listReviews(problemId: string, limit = 10): Review[] {
    const rows = this.db
      .prepare('SELECT * FROM reviews WHERE problem_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(problemId, limit) as Record<string, unknown>[]
    return rows.map(rowToReview)
  }

  progress(): Progress {
    const rows = this.db
      .prepare(
        `SELECT track, topic, pattern, COUNT(*) AS attempts, AVG(score) AS avg, MAX(created_at) AS last_at
         FROM reviews WHERE score IS NOT NULL GROUP BY track, topic, pattern ORDER BY avg ASC`,
      )
      .all() as { track: Track; topic: string; pattern: string; attempts: number; avg: number; last_at: string }[]
    const patterns: PatternStat[] = rows.map((r) => {
      const last = this.db
        .prepare('SELECT score FROM reviews WHERE track = ? AND topic = ? AND pattern = ? AND score IS NOT NULL ORDER BY created_at DESC, rowid DESC LIMIT 1')
        .get(r.track, r.topic, r.pattern) as { score: number } | undefined
      return {
        track: r.track, topic: r.topic, pattern: r.pattern, attempts: r.attempts,
        avg: Math.round(r.avg * 10) / 10, last: last?.score ?? null, lastAt: r.last_at,
      }
    })
    const latestRows = this.db
      .prepare(
        'SELECT problem_id, score FROM reviews WHERE rowid IN (SELECT MAX(rowid) FROM reviews GROUP BY problem_id)',
      )
      .all() as { problem_id: string; score: number | null }[]
    const latest: Record<string, number | null> = {}
    for (const r of latestRows) latest[r.problem_id] = r.score
    return { patterns, latest }
  }

  // ── generated problems ───────────────────────────────────────────────

  addProblem(problem: Problem): Problem {
    if (!problem.id) throw new ValidationError('problem id is required')
    if (!TRACKS.some((t) => t.id === problem.track)) throw new ValidationError('unknown track')
    if (!DIFFICULTIES.includes(problem.difficulty)) throw new ValidationError('unknown difficulty')
    const saved: Problem = { ...problem, source: 'generated', createdAt: problem.createdAt ?? now() }
    this.db
      .prepare('INSERT INTO problems (id, json, parent_id, created_at) VALUES (?, ?, ?, ?)')
      .run(saved.id, JSON.stringify(saved), saved.parentId ?? null, saved.createdAt!)
    return saved
  }

  hasProblem(id: string): boolean {
    return Boolean(this.db.prepare('SELECT 1 FROM problems WHERE id = ?').get(id))
  }

  listProblems(): Problem[] {
    const rows = this.db.prepare('SELECT json FROM problems ORDER BY created_at ASC').all() as { json: string }[]
    const out: Problem[] = []
    for (const r of rows) {
      try {
        const p = JSON.parse(r.json) as Problem
        // Variants saved before tests were language-neutral carry TypeScript call expressions.
        if ('tests' in p && Array.isArray(p.tests)) p.tests = normaliseTests(p.tests)
        out.push(p)
      } catch { /* a corrupt row is skipped, not fatal */ }
    }
    return out
  }

  /** Save a port of a generated problem to another language, verified by the caller. */
  setPort(id: string, language: 'ruby' | 'java', port: { starter: string; solution: string }): Problem {
    const row = this.db.prepare('SELECT json FROM problems WHERE id = ?').get(id) as { json: string } | undefined
    if (!row) throw new ValidationError('no such generated problem')
    const p = JSON.parse(row.json) as Problem
    if (!('tests' in p)) throw new ValidationError('not a code problem')
    const next = { ...p, ports: { ...(p.ports ?? {}), [language]: port } }
    this.db.prepare('UPDATE problems SET json = ? WHERE id = ?').run(JSON.stringify(next), id)
    return next
  }

  /** Save the TypeScript version of a generated problem written in another language. */
  setTypeScript(id: string, port: { starter: string; solution: string }): Problem {
    const row = this.db.prepare('SELECT json FROM problems WHERE id = ?').get(id) as { json: string } | undefined
    if (!row) throw new ValidationError('no such generated problem')
    const p = JSON.parse(row.json) as Problem
    if (!('tests' in p)) throw new ValidationError('not a code problem')
    const next = { ...p, starter: port.starter, solution: port.solution }
    this.db.prepare('UPDATE problems SET json = ? WHERE id = ?').run(JSON.stringify(next), id)
    return next
  }

  deleteProblem(id: string): void {
    this.db.prepare('DELETE FROM problems WHERE id = ?').run(id)
    // Every language's attempt: the plain id (TypeScript) and <id>@<language>.
    for (const key of [id, ...LANGUAGES.filter((l) => l.id !== 'typescript').map((l) => `${id}@${l.id}`)]) {
      this.deleteDraft(key)
      this.deleteGuide(key)
      this.clearChat(key)
      this.clearChat(`about:${key}`)
    }
  }

  // ── follow-up conversation under a review ────────────────────────────

  listChat(problemId: string, limit = 60): ChatMessage[] {
    const rows = this.db
      .prepare('SELECT * FROM chats WHERE problem_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(problemId, limit) as { id: string; problem_id: string; role: 'user' | 'assistant'; content: string; created_at: string }[]
    return rows.reverse().map((r) => ({ id: r.id, problemId: r.problem_id, role: r.role, content: r.content, createdAt: r.created_at }))
  }

  addChat(problemId: string, role: 'user' | 'assistant', content: string): ChatMessage {
    if (!problemId) throw new ValidationError('problem id is required')
    const text = content.trim().slice(0, 20_000)
    if (!text) throw new ValidationError('message is empty')
    const m: ChatMessage = { id: randomUUID(), problemId, role, content: text, createdAt: now() }
    this.db.prepare('INSERT INTO chats (id, problem_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)').run(m.id, m.problemId, m.role, m.content, m.createdAt)
    return m
  }

  clearChat(problemId: string): void {
    this.db.prepare('DELETE FROM chats WHERE problem_id = ?').run(problemId)
  }

  // ── hint ladders ─────────────────────────────────────────────────────

  getGuide(problemId: string): Guide | null {
    const row = this.db.prepare('SELECT * FROM guides WHERE problem_id = ?').get(problemId) as
      | { problem_id: string; steps: string; revealed: number; model: string; created_at: string }
      | undefined
    if (!row) return null
    try {
      return { problemId: row.problem_id, steps: JSON.parse(row.steps) as GuideStep[], revealed: row.revealed, model: row.model, createdAt: row.created_at }
    } catch {
      return null
    }
  }

  /** Replace the ladder for a problem; a fresh one starts with nothing revealed. */
  saveGuide(problemId: string, steps: GuideStep[], model: string): Guide {
    if (!problemId) throw new ValidationError('problem id is required')
    if (steps.length === 0) throw new ValidationError('a guide needs at least one step')
    const at = now()
    this.db
      .prepare('INSERT OR REPLACE INTO guides (problem_id, steps, revealed, model, created_at) VALUES (?, ?, 0, ?, ?)')
      .run(problemId, JSON.stringify(steps), model, at)
    return { problemId, steps, revealed: 0, model, createdAt: at }
  }

  setGuideRevealed(problemId: string, revealed: unknown): Guide {
    const guide = this.getGuide(problemId)
    if (!guide) throw new ValidationError('no guide for this problem')
    const n = Number(revealed)
    if (!Number.isInteger(n) || n < 0 || n > guide.steps.length) throw new ValidationError('revealed is out of range')
    this.db.prepare('UPDATE guides SET revealed = ? WHERE problem_id = ?').run(n, problemId)
    return { ...guide, revealed: n }
  }

  deleteGuide(problemId: string): void {
    this.db.prepare('DELETE FROM guides WHERE problem_id = ?').run(problemId)
  }
}

function rowToReview(r: Record<string, unknown>): Review {
  return {
    id: String(r.id),
    problemId: String(r.problem_id),
    track: r.track as Track,
    topic: String(r.topic),
    pattern: String(r.pattern),
    score: r.score === null ? null : Number(r.score),
    correct: r.correct === null ? null : Number(r.correct) === 1,
    focus: String(r.focus),
    text: String(r.text),
    model: String(r.model),
    createdAt: String(r.created_at),
  }
}
