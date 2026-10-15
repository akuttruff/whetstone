import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BUILTIN_PROBLEMS } from '../src/data/index.ts'
import { isCode } from '../src/types.ts'
import { runTests } from './runner.ts'

const dir = path.join(os.tmpdir(), 'whetstone-content-test')
const code = BUILTIN_PROBLEMS.filter(isCode)

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

import { PRIMERS, primerFor } from '../src/data/primers.ts'

describe('primers', () => {
  it('cover every topic in every track, and nothing else', () => {
    const topics = new Set(BUILTIN_PROBLEMS.map((p) => `${p.track}::${p.topic}`))
    const missing = [...topics].filter((t) => { const [track, topic] = t.split('::'); return !primerFor(track as never, topic!) })
    expect(missing).toEqual([])
    const orphans = PRIMERS.filter((p) => !topics.has(`${p.track}::${p.topic}`)).map((p) => `${p.track}::${p.topic}`)
    expect(orphans).toEqual([])
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
