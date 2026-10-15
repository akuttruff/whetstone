import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { DEFAULT_SETTINGS, DIFFICULTIES, TRACKS } from '../src/types.ts'
import type { PatternStat, Problem, Progress, PublicSettings, Review, Settings, Track } from '../src/types.ts'

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
      try { out.push(JSON.parse(r.json) as Problem) } catch { /* a corrupt row is skipped, not fatal */ }
    }
    return out
  }

  deleteProblem(id: string): void {
    this.db.prepare('DELETE FROM problems WHERE id = ?').run(id)
    this.deleteDraft(id)
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
