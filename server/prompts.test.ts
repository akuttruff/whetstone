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
    expect(stepDifficulty('medium', 'similar')).toBe('medium')
  })
  it('asks for the right schema per track', () => {
    expect(variantPrompt(twoSum, 'harder').schema.name).toBe('code_problem')
    expect(variantPrompt(design, 'easier').schema.name).toBe('design_problem')
    expect(variantPrompt(behav, 'easier').schema.name).toBe('prompt_problem')
    expect(variantPrompt(twoSum, 'easier').user).toMatch(/EASIER/)
  })
  it('asks for a same-level problem and lists titles to avoid', () => {
    const { user } = variantPrompt(twoSum, 'similar', ['Pair With Target', 'Pair With Target', ' ', 'Two Product'])
    expect(user).toMatch(/SIMILAR problem at the SAME difficulty \(easy\)/)
    expect(user).toContain('- Pair With Target\n- Two Product')
    expect(user.match(/Pair With Target/g)).toHaveLength(1)
    expect(variantPrompt(twoSum, 'harder').user).not.toMatch(/already exist/)
  })
  it('passes the candidate request through and stores it on the result', () => {
    const { user } = variantPrompt(twoSum, 'similar', [], '  focus on counting  ')
    expect(user).toContain('The candidate also asked for this: "focus on counting"')
    expect(variantPrompt(twoSum, 'similar', [], '   ').user).not.toMatch(/candidate also asked/)
    const raw = {
      title: 'Count Pairs', description: ['Count them.'], examples: [{ input: '[1,1]', output: '1' }], hints: ['map'],
      starter: 'export function countPairs(): number { return 0 }', solution: 'export function countPairs(): number { return 1 }',
      tests: [{ call: 'countPairs()', expectedJson: '1' }],
    }
    expect(variantFromModel(raw, twoSum, 'similar', () => false, ' focus on counting ')).toMatchObject({ direction: 'similar', request: 'focus on counting' })
    expect(variantFromModel(raw, twoSum, 'similar', () => false, '')).not.toHaveProperty('request')
  })
  it('turns model JSON into a saved-shape problem under its parent', () => {
    const raw = {
      title: 'Pair Sum Exists', description: ['Is there a pair?'], examples: [{ input: '[1,2]', output: 'true' }], hints: ['set'],
      starter: 'export function pairSum(): boolean { return false }', solution: 'export function pairSum(): boolean { return true }',
      tests: [{ call: 'pairSum()', expectedJson: 'true' }, { call: 'bad', expectedJson: '{not json' }, { call: '', expectedJson: '1' }],
    }
    const p = variantFromModel(raw, twoSum, 'easier', (id) => id === 'pair-sum-exists-easier') as CodeProblem
    expect(p).toMatchObject({ id: 'pair-sum-exists-easier-2', track: 'coding', topic: twoSum.topic, pattern: twoSum.pattern, difficulty: 'easy', source: 'generated', parentId: 'two-sum', direction: 'easier' })
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

import { guideFromModel, guidePrompt } from './prompts.ts'

describe('guides', () => {
  it('builds a per-track ladder prompt that includes the attempt but hides the solution from the learner', () => {
    const { system, user, schema } = guidePrompt(twoSum, 'let x = 1', null)
    expect(schema.name).toBe('hint_ladder')
    expect(system).toMatch(/Never include a complete solution/)
    expect(user).toContain('let x = 1')
    expect(user).toContain('Reference solution, for your reference only')
    expect(guidePrompt(design, '').system).toMatch(/system design/)
    expect(guidePrompt(behav, '').system).toMatch(/behavioural/)
  })
  it('cleans the model output and insists on a real ladder', () => {
    const steps = guideFromModel({ steps: [{ title: 'A', hint: 'one', tryThis: 'x' }, { hint: 'two' }, { title: 'C', hint: 'three', tryThis: 'z' }, { title: 'empty', hint: '' }] })
    expect(steps).toEqual([{ title: 'A', hint: 'one', tryThis: 'x' }, { title: 'Step 2', hint: 'two', tryThis: '' }, { title: 'C', hint: 'three', tryThis: 'z' }])
    expect(() => guideFromModel({ steps: [{ hint: 'only one' }] })).toThrow(ValidationError)
    expect(() => guideFromModel({})).toThrow(ValidationError)
  })
})

import { chatPrompt, aboutPrompt, aboutThreadId, primerChatPrompt } from './prompts.ts'
import { primerFor } from '../src/data/primers.ts'

describe('chat prompts', () => {
  it('makes an open tutor on the problem that holds nothing back', () => {
    const s = aboutPrompt(twoSum)
    expect(s).toMatch(/Do not hold back/)
    expect(s).toMatch(/complete solution/)
    expect(s).toContain(twoSum.examples[0]!.input)
    expect(s).toContain(twoSum.solution)
    expect(aboutPrompt(design)).toContain(design.functional[0]!)
    expect(aboutPrompt(design)).toContain(design.talkingPoints[0]!.bullets[0]!)
    expect(aboutThreadId('two-sum')).toBe('about:two-sum')
  })
  it('carries the code, tests and latest review, and allows snippets', () => {
    const s = chatPrompt(twoSum, 'my code', null, 'the review text')
    expect(s).toContain('my code')
    expect(s).toContain('the review text')
    expect(s).toMatch(/code snippet/)
    expect(chatPrompt(design, 'notes', null, null)).toContain('(no review yet)')
  })
  it('turns a primer into a tutor prompt with its techniques', () => {
    const primer = primerFor('coding', 'Arrays & Hashing')!
    const s = primerChatPrompt(primer)
    expect(s).toContain('Arrays & Hashing')
    expect(s).toContain(primer.techniques[0]!.name)
    expect(s).toContain(primer.pitfalls[0]!)
  })
})
