import { describe, expect, it } from 'vitest'
import { parseVerdict, reviewPrompt, stepDifficulty, validateProblem, variantFromModel, variantPrompt } from './prompts.ts'
import { ValidationError } from './store.ts'
import { BUILTIN_PROBLEMS } from '../src/data/index.ts'
import type { CodeProblem, Problem } from '../src/types.ts'

const twoSum = BUILTIN_PROBLEMS.find((p) => p.id === 'two-sum') as CodeProblem
const design = BUILTIN_PROBLEMS.find((p) => p.track === 'design')!
const behav = BUILTIN_PROBLEMS.find((p) => p.track === 'behavioral')!

describe('parseVerdict', () => {
  it('splits the verdict line off and clamps', () => {
    const v = parseVerdict('Good start.\n\n- one thing\n\nVERDICT: {"score": 12, "correct": false, "focus": "edge cases"}')
    expect(v).toEqual({ text: 'Good start.\n\n- one thing', score: 10, correct: false, focus: 'edge cases' })
  })
  it('tolerates a missing verdict', () => {
    const v = parseVerdict('No structured ending here. I would give it a score of 6 out of 10.')
    expect(v.score).toBe(6)
    expect(v.correct).toBeNull()
  })
  it('tolerates broken json', () => {
    expect(parseVerdict('text\nVERDICT: {score: 3}').score).toBeNull()
  })
})

describe('reviewPrompt', () => {
  it('includes test results and the code for code problems', () => {
    const { system, user } = reviewPrompt(twoSum, 'const x = 1', { ok: false, passed: 1, total: 2, ms: 3, output: '', results: [{ name: 't', pass: false, expected: '1', actual: '2', ms: 1 }] })
    expect(system).toMatch(/VERDICT/)
    expect(user).toContain('1/2 passed')
    expect(user).toContain('FAIL t')
    expect(user).toContain('const x = 1')
  })
  it('gives each track its own framing', () => {
    expect(reviewPrompt(design, 'notes').system).toMatch(/system design/)
    expect(reviewPrompt(behav, 'story').system).toMatch(/STAR/)
  })
})

describe('variants', () => {
  it('steps difficulty within bounds', () => {
    expect(stepDifficulty('easy', 'easier')).toBe('easy')
    expect(stepDifficulty('easy', 'harder')).toBe('medium')
    expect(stepDifficulty('hard', 'harder')).toBe('hard')
  })
  it('asks for the right schema per track', () => {
    expect(variantPrompt(twoSum, 'harder').schema.name).toBe('code_problem')
    expect(variantPrompt(design, 'easier').schema.name).toBe('design_problem')
    expect(variantPrompt(behav, 'easier').schema.name).toBe('prompt_problem')
    expect(variantPrompt(twoSum, 'easier').user).toMatch(/EASIER/)
  })
  it('turns model JSON into a saved-shape problem under its parent', () => {
    const raw = {
      title: 'Pair Sum Exists', description: ['Is there a pair?'], examples: [{ input: '[1,2]', output: 'true' }], hints: ['set'],
      starter: 'export function pairSum(): boolean { return false }', solution: 'export function pairSum(): boolean { return true }',
      tests: [{ call: 'pairSum()', expectedJson: 'true' }, { call: 'bad', expectedJson: '{not json' }, { call: '', expectedJson: '1' }],
    }
    const p = variantFromModel(raw, twoSum, 'easier', (id) => id === 'pair-sum-exists-easier') as CodeProblem
    expect(p).toMatchObject({ id: 'pair-sum-exists-easier-2', track: 'coding', topic: twoSum.topic, pattern: twoSum.pattern, difficulty: 'easy', source: 'generated', parentId: 'two-sum' })
    expect(p.tests).toEqual([{ call: 'pairSum()', expected: true }])
  })
  it('refuses a variant without the essentials', () => {
    expect(() => variantFromModel({ title: 'x' }, twoSum, 'easier', () => false)).toThrow(ValidationError)
  })
})

describe('validateProblem', () => {
  it('accepts every built-in problem as sent by the client', () => {
    for (const p of BUILTIN_PROBLEMS) {
      const v = validateProblem(p, { track: 'coding', topic: 'x', pattern: 'x', difficulty: 'medium' })
      expect(v.id).toBe(p.id)
      expect(v.track).toBe(p.track)
    }
  })
  it('rejects junk', () => {
    expect(() => validateProblem('nope', { track: 'coding', topic: 'x', pattern: 'x', difficulty: 'medium' })).toThrow(ValidationError)
    expect(() => validateProblem({ title: 'T', track: 'design' } as Partial<Problem>, { track: 'design', topic: 'x', pattern: 'x', difficulty: 'medium' })).toThrow(/prompt/)
  })
})
