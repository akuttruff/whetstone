import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { runTests } from './runner.ts'

const dir = path.join(os.tmpdir(), 'whetstone-runner-test')

describe('runTests', () => {
  it('passes a correct solution and reports per-test results', async () => {
    const r = await runTests(
      'export function add(a: number, b: number): number { return a + b }',
      [{ call: 'add(1, 2)', expected: 3 }, { name: 'negatives', call: 'add(-1, -2)', expected: -3 }],
      { dir },
    )
    expect(r.ok).toBe(true)
    expect(r.passed).toBe(2)
    expect(r.results[1]!.name).toBe('negatives')
  }, 20_000)

  it('reports failures with expected and actual', async () => {
    const r = await runTests('export const f = (x: number) => x * 3', [{ call: 'f(2)', expected: 4 }], { dir })
    expect(r.ok).toBe(false)
    expect(r.results[0]).toMatchObject({ pass: false, expected: '4', actual: '6' })
  }, 20_000)

  it('supports async calls, unordered comparison, console output and parameter properties', async () => {
    const code = `
export class Box { constructor(private readonly n: number) {} get(): number { return this.n } }
export async function later(xs: number[]): Promise<number[]> { console.log('hi', 1); await new Promise((r) => setTimeout(r, 5)); return xs.reverse() }
export function box(n: number): number { return new Box(n).get() }`
    const r = await runTests(code, [
      { call: 'later([1, 2, 3])', expected: [1, 2, 3], unordered: true },
      { call: 'box(7)', expected: 7 },
    ], { dir })
    expect(r.ok).toBe(true)
    expect(r.output).toContain('hi 1')
  }, 20_000)

  it('turns a syntax error into a load error, not a crash', async () => {
    const r = await runTests('export function broken( {', [{ call: 'broken()', expected: 1 }], { dir })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/could not be loaded/)
  }, 20_000)

  it('catches a thrown error per test', async () => {
    const r = await runTests('export function boom(): number { throw new Error("nope") }', [{ call: 'boom()', expected: 1 }], { dir })
    expect(r.results[0]!.error).toBe('nope')
  }, 20_000)

  it('kills an infinite loop', async () => {
    const r = await runTests('export function spin(): number { for (;;) {} }', [{ call: 'spin()', expected: 1 }], { dir, timeoutMs: 1500 })
    expect(r.error).toMatch(/Timed out/)
  }, 20_000)
})
