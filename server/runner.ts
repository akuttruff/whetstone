import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { JAVA_HARNESS } from './harness-java.ts'
import { RUBY_HARNESS } from './harness-ruby.ts'
import { TS_HARNESS } from './harness-ts.ts'
import { javaBins, missingMessage, rubyBin } from './langs.ts'
import { languageNeutral, normaliseTests, testLabel } from '../src/lib/tests.ts'
import type { Language, RunResult, TestCase, TestResult } from '../src/types.ts'

/**
 * Runs a draft against its problem's tests in a separate process: Node with
 * its own TypeScript support, Ruby, or a javac + java pair. Each language has
 * a harness that calls the tested function with the JSON arguments and
 * prints one line of raw outcomes; the comparison with the expected values
 * is done here, once, the same way for every language. This is the user's
 * own code on their own machine, so the sandboxing is a timeout and a
 * scratch directory, not a security boundary.
 */

export const RUN_TIMEOUT_MS = 15_000
export const PER_TEST_TIMEOUT_MS = 3_000
/** Compiling Java is slow to start; it gets its own budget before the run. */
export const COMPILE_TIMEOUT_MS = 30_000
export const CODE_MAX = 200_000
const MARK = '__WHETSTONE_RESULT__'

export interface RunOptions {
  /** Where scratch directories go; one per run, removed afterwards. */
  dir: string
  timeoutMs?: number
  language?: Language
}

/** What a harness reports per test, before comparison. */
interface RawEntry {
  name?: string
  actual?: unknown
  error?: string
  ms: number
}
interface RawResult {
  error?: string
  output: string
  results: RawEntry[]
}

const sortDeep = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(sortDeep).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0))
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {}
    for (const k of Object.keys(v as object).sort()) o[k] = sortDeep((v as Record<string, unknown>)[k])
    return o
  }
  return v
}
const sortKeys = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {}
    for (const k of Object.keys(v as object).sort()) o[k] = sortKeys((v as Record<string, unknown>)[k])
    return o
  }
  return v
}

/**
 * The JSON form two values are compared in: object keys in sorted order
 * (a Java object's field order or a Ruby hash's insertion order must not
 * matter), arrays sorted at every depth when the test is unordered.
 */
export function normalise(v: unknown, unordered?: boolean): unknown {
  const json = JSON.stringify(v === undefined ? null : v)
  const plain: unknown = JSON.parse(json === undefined ? 'null' : json)
  return unordered ? sortDeep(plain) : sortKeys(plain)
}
const show = (v: unknown): string => {
  const s = JSON.stringify(v)
  return s.length > 400 ? s.slice(0, 400) + '…' : s
}

function compare(tests: TestCase[], raw: RawResult, language: Language, ms: number): RunResult {
  const results: TestResult[] = tests.map((t, i) => {
    const r = raw.results[i]
    const expectedNorm = normalise(t.expected, t.unordered)
    const entry: TestResult = { name: testLabel(t, language), pass: false, expected: show(expectedNorm), actual: '', ms: r?.ms ?? 0 }
    if (!r) {
      entry.error = 'not run'
      entry.actual = 'not run'
    } else if (r.error !== undefined) {
      entry.error = r.error
      entry.actual = 'threw: ' + r.error
    } else {
      const actualNorm = normalise(r.actual, t.unordered)
      entry.actual = show(actualNorm)
      entry.pass = JSON.stringify(actualNorm) === JSON.stringify(expectedNorm)
    }
    return entry
  })
  const passed = results.filter((r) => r.pass).length
  return {
    ok: !raw.error && passed === tests.length,
    passed,
    total: tests.length,
    results,
    output: (raw.output ?? '').slice(0, 20_000),
    ...(raw.error ? { error: raw.error } : {}),
    ms,
  }
}

const failed = (tests: TestCase[], error: string, ms: number, output = ''): RunResult => ({ ok: false, passed: 0, total: tests.length, results: [], output, error, ms })

/**
 * The Java harness never changes, so it is compiled once per server into a
 * shared directory and every run only compiles the solution against it. The
 * promise is dropped on failure or when the directory has gone, so the next
 * run tries again.
 */
let harnessClasses: Promise<string> | null = null
let harnessDone = false
function compiledHarness(javac: string, root: string): Promise<string> {
  const dir = path.join(root, 'java-harness')
  // Reuse a compile in flight; once done, reuse it as long as the classes are still there.
  if (harnessClasses && (!harnessDone || fs.existsSync(path.join(dir, 'Harness.class')))) return harnessClasses
  harnessDone = false
  harnessClasses = (async () => {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'Harness.java'), JAVA_HARNESS(MARK, PER_TEST_TIMEOUT_MS))
    const r = await run(javac, ['-d', '.', '-encoding', 'UTF-8', '-nowarn', '-Xlint:none', 'Harness.java'], dir, COMPILE_TIMEOUT_MS)
    if (r.code !== 0) throw new Error('the Java harness did not compile: ' + tidy(r.stderr))
    harnessDone = true
    return dir
  })()
  harnessClasses.catch(() => { harnessClasses = null })
  return harnessClasses
}

export async function runTests(code: string, input: TestCase[], opts: RunOptions): Promise<RunResult> {
  const language = opts.language ?? 'typescript'
  const tests = normaliseTests(input)
  if (typeof code !== 'string' || code.length > CODE_MAX) return failed(tests, 'code is missing or too long', 0)
  if (language !== 'typescript' && !languageNeutral(tests)) {
    return failed(tests, 'These tests are written as TypeScript expressions, so they can only run against TypeScript.', 0)
  }
  const dir = path.join(opts.dir, `run-${randomUUID()}`)
  fs.mkdirSync(dir, { recursive: true })
  const started = Date.now()
  const timeoutMs = opts.timeoutMs ?? RUN_TIMEOUT_MS
  try {
    fs.writeFileSync(path.join(dir, 'tests.json'), JSON.stringify(tests.map((t) => ({ name: t.name, fn: t.fn, args: t.args, call: t.call }))))
    let proc: Spawned
    if (language === 'ruby') {
      const ruby = rubyBin()
      if (!ruby) return failed(tests, missingMessage('ruby'), 0)
      fs.writeFileSync(path.join(dir, 'solution.rb'), code)
      fs.writeFileSync(path.join(dir, 'harness.rb'), RUBY_HARNESS(MARK, PER_TEST_TIMEOUT_MS))
      proc = await run(ruby, ['-W0', 'harness.rb'], dir, timeoutMs)
    } else if (language === 'java') {
      const bins = javaBins()
      if (!bins) return failed(tests, missingMessage('java'), 0)
      fs.writeFileSync(path.join(dir, 'Solution.java'), code)
      let harnessDir: string
      try {
        harnessDir = await compiledHarness(bins.javac, opts.dir)
      } catch (e) {
        return failed(tests, (e as Error).message, Date.now() - started)
      }
      const compiled = await run(bins.javac, ['-d', 'out', '-cp', harnessDir, '-encoding', 'UTF-8', '-nowarn', '-Xlint:none', '-Xdiags:compact', 'Solution.java'], dir, COMPILE_TIMEOUT_MS)
      if (compiled.timedOut) return failed(tests, 'Compiling took too long.', Date.now() - started)
      if (compiled.code !== 0) return failed(tests, 'Your code could not be compiled:\n' + tidyJavac(compiled.stderr || compiled.stdout), Date.now() - started)
      proc = await run(bins.java, ['-Xss64m', '-XX:+UseSerialGC', '-XX:TieredStopAtLevel=1', '-cp', `out${path.delimiter}${harnessDir}`, 'Harness'], dir, timeoutMs)
    } else {
      fs.writeFileSync(path.join(dir, 'solution.ts'), code)
      fs.writeFileSync(path.join(dir, 'harness.mjs'), TS_HARNESS(MARK, PER_TEST_TIMEOUT_MS))
      proc = await run(process.execPath, ['--no-warnings', '--experimental-transform-types', 'harness.mjs'], dir, timeoutMs, { NODE_OPTIONS: '' })
    }
    const ms = Date.now() - started
    const at = proc.stdout.lastIndexOf(MARK)
    if (at >= 0) {
      const line = proc.stdout.slice(at + MARK.length).split('\n')[0]!
      try {
        return compare(tests, JSON.parse(line) as RawResult, language, ms)
      } catch {
        /* fall through to the generic error */
      }
    }
    const error = proc.timedOut
      ? `Timed out after ${Math.round(timeoutMs / 1000)} s (an infinite loop?)`
      : `The run failed (exit ${proc.code}): ${tidy(proc.stderr) || tidy(proc.stdout) || 'no output'}`
    return failed(tests, error, ms, tidy(proc.stdout.replace(MARK, '')))
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

/** javac's errors without the scratch path, the "N errors" footer, or notes. */
function tidyJavac(s: string): string {
  return s
    .split('\n')
    .filter((l) => !/^\d+ errors?$/.test(l.trim()) && !l.startsWith('Note:'))
    .map((l) => l.replace(/^.*[\\/]Solution\.java:/, 'Solution.java:'))
    .join('\n')
    .trim()
    .slice(0, 4000)
}

interface Spawned {
  stdout: string
  stderr: string
  timedOut: boolean
  code: number | null
}

function run(cmd: string, args: string[], cwd: string, timeoutMs: number, env: Record<string, string> = {}): Promise<Spawned> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', LANG: 'en_US.UTF-8', ...env },
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
