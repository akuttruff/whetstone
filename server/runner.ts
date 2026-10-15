import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import type { RunResult, TestCase } from '../src/types.ts'

/**
 * Runs a draft against its problem's tests in a separate Node process, with
 * Node's own TypeScript support (type stripping plus the transform flag so
 * enums and parameter properties work too). This is the user's own code on
 * their own machine, so the sandboxing is a timeout and a scratch directory,
 * not a security boundary.
 */

export const RUN_TIMEOUT_MS = 15_000
export const PER_TEST_TIMEOUT_MS = 3_000
export const CODE_MAX = 200_000
const MARK = '__WHETSTONE_RESULT__'

export interface RunOptions {
  /** Where scratch directories go; one per run, removed afterwards. */
  dir: string
  timeoutMs?: number
}

const HARNESS = String.raw`
import { readFileSync } from 'node:fs'
import { format } from 'node:util'

const MARK = '${MARK}'
const PER_TEST_MS = ${PER_TEST_TIMEOUT_MS}
const tests = JSON.parse(readFileSync('./tests.json', 'utf8'))
const logs = []
const log = (...a) => { if (logs.length < 200) logs.push(format(...a)) }
console.log = console.info = console.debug = console.warn = console.error = log
const started = performance.now()
const result = { ok: false, passed: 0, total: tests.length, results: [], output: '', ms: 0 }

const finish = () => {
  result.ms = Math.round(performance.now() - started)
  result.output = logs.join('\n').slice(0, 20000)
  result.ok = !result.error && result.passed === result.total
  process.stdout.write('\n' + MARK + JSON.stringify(result) + '\n')
  process.exit(0)
}
const message = (e) => (e && typeof e.message === 'string' ? e.message : String(e))
const sortDeep = (v) => {
  if (Array.isArray(v)) return v.map(sortDeep).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0))
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = sortDeep(v[k]); return o }
  return v
}
const norm = (v, unordered) => {
  const json = JSON.stringify(v === undefined ? null : v)
  const plain = JSON.parse(json === undefined ? 'null' : json)
  return unordered ? sortDeep(plain) : plain
}
const show = (v) => { const s = JSON.stringify(v); return s.length > 400 ? s.slice(0, 400) + '…' : s }
const withTimeout = (p, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('test timed out after ' + ms + ' ms')), ms)
  Promise.resolve(p).then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
})
const RESERVED = new Set(['default', 'class', 'function', 'var', 'let', 'const', 'new', 'delete', 'typeof', 'in', 'of', 'import', 'export', 'await', 'yield', 'this', 'super'])

let mod
try {
  mod = await import('./solution.ts')
} catch (e) {
  result.error = 'Your code could not be loaded: ' + message(e)
  finish()
}
const names = Object.keys(mod).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && !RESERVED.has(n))
const values = names.map((n) => mod[n])

for (const t of tests) {
  const t0 = performance.now()
  const entry = { name: t.name || t.call, pass: false, expected: show(norm(t.expected, t.unordered)), actual: '', ms: 0 }
  try {
    const fn = new Function(...names, 'return (async () => (' + t.call + '))()')
    const value = await withTimeout(fn(...values), PER_TEST_MS)
    const actual = norm(value, t.unordered)
    entry.actual = show(actual)
    entry.pass = JSON.stringify(actual) === JSON.stringify(norm(t.expected, t.unordered))
  } catch (e) {
    entry.error = message(e)
    entry.actual = 'threw: ' + entry.error
  }
  entry.ms = Math.round(performance.now() - t0)
  if (entry.pass) result.passed++
  result.results.push(entry)
}
finish()
`

export async function runTests(code: string, tests: TestCase[], opts: RunOptions): Promise<RunResult> {
  if (typeof code !== 'string' || code.length > CODE_MAX) {
    return { ok: false, passed: 0, total: tests.length, results: [], output: '', error: 'code is missing or too long', ms: 0 }
  }
  const dir = path.join(opts.dir, `run-${randomUUID()}`)
  fs.mkdirSync(dir, { recursive: true })
  const started = Date.now()
  try {
    fs.writeFileSync(path.join(dir, 'solution.ts'), code)
    fs.writeFileSync(path.join(dir, 'tests.json'), JSON.stringify(tests))
    fs.writeFileSync(path.join(dir, 'harness.mjs'), HARNESS)
    const { stdout, stderr, timedOut, code: exitCode } = await spawnNode(dir, opts.timeoutMs ?? RUN_TIMEOUT_MS)
    const ms = Date.now() - started
    const at = stdout.lastIndexOf(MARK)
    if (at >= 0) {
      const line = stdout.slice(at + MARK.length).split('\n')[0]!
      try {
        return { ...(JSON.parse(line) as RunResult), ms }
      } catch {
        /* fall through to the generic error */
      }
    }
    const error = timedOut
      ? `Timed out after ${Math.round((opts.timeoutMs ?? RUN_TIMEOUT_MS) / 1000)} s (an infinite loop?)`
      : `The run failed (exit ${exitCode}): ${tidy(stderr) || tidy(stdout) || 'no output'}`
    return { ok: false, passed: 0, total: tests.length, results: [], output: tidy(stdout.replace(MARK, '')), error, ms }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function tidy(s: string): string {
  return s
    .split('\n')
    .filter((l) => !/ExperimentalWarning|--trace-warnings|^\(node:\d+\)/.test(l))
    .join('\n')
    .trim()
    .slice(0, 4000)
}

function spawnNode(cwd: string, timeoutMs: number): Promise<{ stdout: string; stderr: string; timedOut: boolean; code: number | null }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--no-warnings', '--experimental-transform-types', 'harness.mjs'], {
      cwd,
      env: { PATH: process.env.PATH ?? '', NODE_OPTIONS: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    child.stdout.on('data', (d: Buffer) => { if (stdout.length < 1_000_000) stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { if (stderr.length < 100_000) stderr += d.toString() })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ stdout, stderr: stderr + err.message, timedOut, code: null })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, timedOut, code })
    })
  })
}
