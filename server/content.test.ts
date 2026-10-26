import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BUILTIN_PROBLEMS } from '../src/data/full.ts'
import { languageNeutral } from '../src/lib/tests.ts'
import { isCode, isPrompt } from '../src/types.ts'
import type { Language } from '../src/types.ts'
import { availability } from './langs.ts'
import { runTests } from './runner.ts'

const dir = path.join(os.tmpdir(), 'whetstone-content-test')
const code = BUILTIN_PROBLEMS.filter(isCode)
const have = availability()

describe('built-in content', () => {
  it('has unique ids and the required fields', () => {
    const ids = new Set<string>()
    for (const p of BUILTIN_PROBLEMS) {
      expect(ids.has(p.id), `duplicate id ${p.id}`).toBe(false)
      ids.add(p.id)
      expect(p.title.length, p.id).toBeGreaterThan(0)
      expect(p.topic.length, p.id).toBeGreaterThan(0)
      expect(p.pattern.length, p.id).toBeGreaterThan(0)
    }
  })

  it('every code problem has tests and its starter is not its solution', () => {
    for (const p of code) {
      expect(p.tests.length, `${p.id} has no tests`).toBeGreaterThan(0)
      expect(p.starter, p.id).not.toBe(p.solution)
    }
  })

  it('gives each language its own knowledge topic, tagged so only that language lists it', () => {
    const knowledge = BUILTIN_PROBLEMS.filter(isPrompt).filter((p) => p.track === 'knowledge')
    for (const [language, topic] of [['typescript', 'TypeScript & JavaScript'], ['ruby', 'Ruby'], ['java', 'Java'], ['rust', 'Rust']] as const) {
      const own = knowledge.filter((p) => p.language === language)
      expect(own.length, language).toBeGreaterThanOrEqual(10)
      expect(new Set(own.map((p) => p.topic)), language).toEqual(new Set([topic]))
    }
    // The shared topics name no language in their questions.
    const shared = knowledge.filter((p) => !p.language)
    expect(shared.filter((p) => /typescript|\bnode\b|ruby|\bjava\b|\brust\b/i.test(p.question.join(' '))).map((p) => p.id)).toEqual([])
  })

  it('every code problem has language-neutral tests (function name plus JSON arguments)', () => {
    const stuck = code.filter((p) => !languageNeutral(p.tests)).map((p) => p.id)
    expect(stuck).toEqual([])
  })

  // The reference solutions through the real runner, a few at a time.
  it('every reference solution passes its own tests', async () => {
    const failures: string[] = []
    const queue = code.slice()
    const worker = async (): Promise<void> => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        const r = await runTests(p.solution, p.tests, { dir })
        if (!r.ok) failures.push(`${p.id}: ${r.error ?? r.results.filter((t) => !t.pass).map((t) => `${t.name} -> ${t.actual}`).join('; ')}`)
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker))
    expect(failures).toEqual([])
  }, 300_000)
})

/**
 * The other languages: every coding problem is ported by hand, the port's
 * solution passes the same tests in that language's sandbox, and its
 * starter at least loads (or compiles) so a candidate starts from
 * something that runs.
 */
const portSuite = (language: Exclude<Language, 'typescript'>): void => {
  describe.skipIf(!have[language])(`${language} ports`, () => {
    it('cover every coding and practical problem, with a starter that differs from the solution', () => {
      const missing = code.filter((p) => !p.ports?.[language]).map((p) => p.id)
      expect(missing).toEqual([])
      for (const p of code) {
        const port = p.ports![language]!
        expect(port.starter.trim().length, `${p.id} starter`).toBeGreaterThan(0)
        expect(port.starter, p.id).not.toBe(port.solution)
      }
    })

    it('every solution passes its tests and every starter loads', async () => {
      const failures: string[] = []
      const queue = code.filter((p) => p.ports?.[language]).slice()
      const worker = async (): Promise<void> => {
        for (let p = queue.shift(); p; p = queue.shift()) {
          const port = p.ports![language]!
          const r = await runTests(port.solution, p.tests, { dir, language, timeoutMs: 30_000 })
          if (!r.ok) failures.push(`${p.id} solution: ${r.error ?? r.results.filter((t) => !t.pass).map((t) => `${t.name} -> ${t.actual}`).join('; ')}`)
          const s = await runTests(port.starter, p.tests, { dir, language, timeoutMs: 30_000 })
          if (s.error) failures.push(`${p.id} starter: ${s.error}`)
        }
      }
      // Java and Rust compile each run, so fewer at once.
      await Promise.all(Array.from({ length: language === 'ruby' ? 6 : 4 }, worker))
      expect(failures).toEqual([])
    }, 900_000)
  })
}
portSuite('ruby')
portSuite('java')
portSuite('rust')

describe('practical problems are told in each language', () => {
  const practical = code.filter((p) => p.track === 'practical')
  // Words that belong to the TypeScript telling and have no place in another language's statement.
  const tsOnly = /\bPromise\b|AbortSignal|setTimeout|\bawait\b|\bundefined\b/
  it('each has TypeScript nuances and, per port, its own statement, hints and nuances', () => {
    const problems: string[] = []
    for (const p of practical) {
      if ((p.nuances?.length ?? 0) < 3) problems.push(`${p.id}: typescript nuances`)
      for (const language of ['ruby', 'java', 'rust'] as const) {
        const port = p.ports?.[language]
        if (!port) continue
        if ((port.description?.length ?? 0) < 1) problems.push(`${p.id}: ${language} description`)
        if ((port.hints?.length ?? 0) < 2) problems.push(`${p.id}: ${language} hints`)
        if ((port.nuances?.length ?? 0) < 3) problems.push(`${p.id}: ${language} nuances`)
        const text = [...(port.description ?? []), ...(port.hints ?? []), ...(port.nuances ?? []), ...(port.examples ?? []).map((e) => `${e.input} ${e.output} ${e.note ?? ''}`)].join(' ')
        const leak = tsOnly.exec(text)
        if (leak) problems.push(`${p.id}: ${language} statement says "${leak[0]}"`)
      }
    }
    expect(problems).toEqual([])
  })
})

import { PRIMERS, primerFor } from '../src/data/primers.ts'
import { PRIMER_TEMPLATES } from '../src/data/primer-templates.ts'

describe('primers', () => {
  it('cover every topic in every track, and nothing else', () => {
    const topics = new Set(BUILTIN_PROBLEMS.map((p) => `${p.track}::${p.topic}`))
    const missing = [...topics].filter((t) => { const [track, topic] = t.split('::'); return !primerFor(track as never, topic!) })
    expect(missing).toEqual([])
    const orphans = PRIMERS.filter((p) => !topics.has(`${p.track}::${p.topic}`)).map((p) => `${p.track}::${p.topic}`)
    expect(orphans).toEqual([])
  })
  it('have every coding and practical template in Ruby, Java and Rust, and no orphan templates', () => {
    const coding = PRIMERS.filter((p) => p.track === 'coding' || p.track === 'practical')
    const keys = new Set(coding.flatMap((p) => p.techniques.filter((t) => t.template).map((t) => `${p.topic}::${t.name}`)))
    expect([...keys].filter((k) => !PRIMER_TEMPLATES[k])).toEqual([])
    expect(Object.keys(PRIMER_TEMPLATES).filter((k) => !keys.has(k))).toEqual([])
    for (const p of coding) for (const t of p.techniques) if (t.template) {
      expect(t.templates?.ruby?.trim().length, `${t.name} ruby`).toBeGreaterThan(0)
      expect(t.templates?.java?.trim().length, `${t.name} java`).toBeGreaterThan(0)
      expect(t.templates?.rust?.trim().length, `${t.name} rust`).toBeGreaterThan(0)
    }
  })
  it('are substantive', () => {
    for (const p of PRIMERS) {
      expect(p.techniques.length, `${p.topic} techniques`).toBeGreaterThanOrEqual(2)
      expect(p.recognize.length, `${p.topic} recognize`).toBeGreaterThanOrEqual(1)
      expect(p.terms.length, `${p.topic} terms`).toBeGreaterThanOrEqual(2)
      expect(p.pitfalls.length, `${p.topic} pitfalls`).toBeGreaterThanOrEqual(2)
      expect(p.checklist.length, `${p.topic} checklist`).toBeGreaterThanOrEqual(2)
    }
  })
})
