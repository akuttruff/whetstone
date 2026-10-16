import { describe, expect, it } from 'vitest'
import { Store, ValidationError } from './store.ts'
import type { Problem } from '../src/types.ts'

const mem = (): Store => new Store({ memory: true })

describe('settings', () => {
  it('starts from defaults, hides the key, and validates patches', () => {
    const s = mem()
    expect(s.getPublicSettings()).toMatchObject({ baseUrl: 'http://127.0.0.1:8000/v1', hasApiKey: false, autoFeedback: false })
    s.setSettings({ apiKey: 'secret', autoFeedback: true, autoDelayS: 12 })
    expect(s.getPublicSettings()).toMatchObject({ hasApiKey: true, autoFeedback: true, autoDelayS: 12 })
    expect(s.getSettings().apiKey).toBe('secret')
    s.setSettings({ model: 'x' }) // key untouched when not in the patch
    expect(s.getSettings().apiKey).toBe('secret')
    expect(s.getSettings().showTechniques).toBe(true)
    s.setSettings({ showTechniques: false })
    expect(s.getPublicSettings().showTechniques).toBe(false)
    expect(() => s.setSettings({ baseUrl: 'not a url' })).toThrow(ValidationError)
    expect(() => s.setSettings({ autoDelayS: 0 })).toThrow(ValidationError)
    s.setSettings({ baseUrl: 'http://x:1/v1/' })
    expect(s.getSettings().baseUrl).toBe('http://x:1/v1')
  })
})

describe('drafts', () => {
  it('round-trips and deletes', () => {
    const s = mem()
    expect(s.getDraft('a')).toBeNull()
    s.setDraft('a', 'code')
    expect(s.getDraft('a')?.text).toBe('code')
    s.deleteDraft('a')
    expect(s.getDraft('a')).toBeNull()
    expect(() => s.setDraft('a', 5)).toThrow(ValidationError)
  })
})

describe('reviews and progress', () => {
  const review = (s: Store, problemId: string, pattern: string, score: number | null): void => {
    s.addReview({ problemId, track: 'coding', topic: 'T', pattern, score, correct: score === 10, focus: 'f', text: 'review', model: 'm' })
  }
  it('lists newest first and aggregates per pattern', () => {
    const s = mem()
    review(s, 'p1', 'A', 4)
    review(s, 'p1', 'A', 8)
    review(s, 'p2', 'B', 9)
    review(s, 'p3', 'C', null)
    expect(s.listReviews('p1').map((r) => r.score)).toEqual([8, 4])
    const progress = s.progress()
    expect(progress.patterns.map((p) => [p.pattern, p.attempts, p.avg, p.last])).toEqual([['A', 2, 6, 8], ['B', 1, 9, 9]])
    expect(progress.latest).toEqual({ p1: 8, p2: 9, p3: null })
  })
  it('clamps scores', () => {
    const s = mem()
    review(s, 'p', 'A', 14)
    expect(s.listReviews('p')[0]!.score).toBe(10)
  })
})

describe('generated problems', () => {
  const problem: Problem = {
    id: 'gen-1', track: 'knowledge', title: 'Q', topic: 'T', pattern: 'P', difficulty: 'easy', source: 'generated', parentId: 'x',
    question: ['why?'], keyPoints: ['because'], followUps: [],
  }
  it('saves, lists and deletes along with the draft', () => {
    const s = mem()
    const saved = s.addProblem(problem)
    expect(saved.createdAt).toBeTruthy()
    expect(s.hasProblem('gen-1')).toBe(true)
    s.setDraft('gen-1', 'answer')
    expect(s.listProblems()).toHaveLength(1)
    s.deleteProblem('gen-1')
    expect(s.listProblems()).toHaveLength(0)
    expect(s.getDraft('gen-1')).toBeNull()
  })
  it('rejects bad tracks', () => {
    expect(() => mem().addProblem({ ...problem, track: 'nope' as never })).toThrow(ValidationError)
  })
})

describe('guides', () => {
  it('saves, reveals within range, and goes away with its problem', () => {
    const s = mem()
    expect(s.getGuide('p')).toBeNull()
    const g = s.saveGuide('p', [{ title: 'a', hint: 'h', tryThis: 't' }, { title: 'b', hint: 'h2', tryThis: '' }], 'm')
    expect(g.revealed).toBe(0)
    expect(s.setGuideRevealed('p', 2).revealed).toBe(2)
    expect(() => s.setGuideRevealed('p', 3)).toThrow(ValidationError)
    expect(() => s.setGuideRevealed('nope', 1)).toThrow(ValidationError)
    // a rewrite starts hidden again
    expect(s.saveGuide('p', [{ title: 'c', hint: 'h', tryThis: '' }, { title: 'd', hint: 'h', tryThis: '' }, { title: 'e', hint: 'h', tryThis: '' }], 'm').revealed).toBe(0)
    s.deleteGuide('p')
    expect(s.getGuide('p')).toBeNull()
  })
})

describe('chat threads', () => {
  it('keeps turns in order per thread and clears with the problem', () => {
    const s = mem()
    s.addChat('p', 'user', 'how?')
    s.addChat('p', 'assistant', 'like this')
    s.addChat('primer:coding:X', 'user', 'other thread')
    expect(s.listChat('p').map((m) => [m.role, m.content])).toEqual([['user', 'how?'], ['assistant', 'like this']])
    expect(s.listChat('p', 1).map((m) => m.content)).toEqual(['like this'])
    expect(() => s.addChat('p', 'user', '   ')).toThrow(ValidationError)
    s.addProblem({ id: 'p', track: 'knowledge', title: 'Q', topic: 'T', pattern: 'P', difficulty: 'easy', source: 'generated', question: ['q'], keyPoints: [], followUps: [] })
    s.deleteProblem('p')
    expect(s.listChat('p')).toEqual([])
    expect(s.listChat('primer:coding:X')).toHaveLength(1)
  })
})
