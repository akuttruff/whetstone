/**
 * The TypeScript harness: runs in a child Node process with the solution
 * imported as a module. Each test is a function name with JSON arguments
 * (resolved as written, or in camelCase when the content was written for
 * Ruby), or a TypeScript expression (`call`) evaluated with the solution's
 * exports in scope. It writes the raw outcome per test to the result file;
 * comparison with the expected values happens in runner.ts.
 *
 * The tests run in a worker thread, not in the harness's own thread: a
 * timer cannot interrupt a synchronous infinite loop, but terminating the
 * worker can. When a test overruns, the worker is terminated, that test is
 * reported as timed out, and a fresh worker (the solution imported anew)
 * carries on from the next test.
 */
export const TS_HARNESS = (resultFile: string, perTestMs: number, heapMb: number): string => String.raw`
import { readFileSync, writeFileSync } from 'node:fs'
import { format } from 'node:util'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'

const RESULT_FILE = '${resultFile}'
const PER_TEST_MS = ${perTestMs}
const HEAP_MB = ${heapMb}
const MAX_LOG_LINES = 200
const tests = JSON.parse(readFileSync('./tests.json', 'utf8'))
const message = (e) => (e && typeof e.message === 'string' ? e.message : String(e))
const timedOut = 'test timed out after ' + PER_TEST_MS + ' ms'

if (isMainThread) {
  const logs = []
  const result = { results: [], output: '' }
  const finish = () => {
    result.output = logs.join('\n').slice(0, 20000)
    writeFileSync(RESULT_FILE, JSON.stringify(result))
    process.exit(0)
  }

  // One worker runs tests from 'from' until it finishes them all or one overruns.
  const stretch = (from) => new Promise((done) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { from }, resourceLimits: { maxOldGenerationSizeMb: HEAP_MB } })
    let current = -1
    let timer
    let over = false
    const end = () => {
      if (over) return
      over = true
      clearTimeout(timer)
      void w.terminate()
      done()
    }
    w.on('message', (m) => {
      if (over) return // a straggler from a worker already given up on
      if (m.log !== undefined) {
        if (logs.length < MAX_LOG_LINES) logs.push(m.log)
      } else if (m.loadError !== undefined) {
        result.error = 'Your code could not be loaded: ' + m.loadError
        end()
      } else if (m.start !== undefined) {
        current = m.start
        // The worker's own timer reports an async overrun; this one, a little later, catches a loop that never yields.
        timer = setTimeout(() => {
          result.results.push({ name: tests[current].name, error: timedOut, ms: PER_TEST_MS })
          end()
        }, PER_TEST_MS + 250)
      } else if (m.entry !== undefined) {
        clearTimeout(timer)
        result.results.push(m.entry)
        current = -1
      } else if (m.done) {
        end()
      }
    })
    // Out of memory, or an error thrown outside any test: blame the test running, if there is one.
    w.on('error', (e) => {
      if (current >= 0 && result.results.length === current) result.results.push({ name: tests[current].name, error: message(e), ms: 0 })
      end()
    })
    w.on('exit', () => {
      if (current >= 0 && result.results.length === current) result.results.push({ name: tests[current].name, error: 'the test ended the process', ms: 0 })
      end()
    })
  })

  while (result.results.length < tests.length && !result.error) {
    const before = result.results.length
    await stretch(before)
    if (result.results.length === before) break // no progress: never loop forever
  }
  finish()
} else {
  let lines = 0
  const log = (...a) => { if (lines++ < MAX_LOG_LINES) parentPort.postMessage({ log: format(...a) }) }
  console.log = console.info = console.debug = console.warn = console.error = log
  const withTimeout = (p, ms) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(timedOut)), ms)
    Promise.resolve(p).then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
  const RESERVED = new Set(['default', 'class', 'function', 'var', 'let', 'const', 'new', 'delete', 'typeof', 'in', 'of', 'import', 'export', 'await', 'yield', 'this', 'super'])
  const camel = (s) => s.replace(/_+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase())

  let mod
  try {
    mod = await import('./solution.ts')
  } catch (e) {
    parentPort.postMessage({ loadError: message(e) })
  }
  if (mod) {
    const names = Object.keys(mod).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && !RESERVED.has(n))
    const values = names.map((n) => mod[n])
    const resolve = (fn) => {
      for (const n of [fn, camel(fn)]) if (typeof mod[n] === 'function') return mod[n]
      throw new Error('no exported function named ' + fn + (camel(fn) !== fn ? ' (or ' + camel(fn) + ')' : ''))
    }

    for (let i = workerData.from; i < tests.length; i++) {
      const t = tests[i]
      parentPort.postMessage({ start: i })
      const t0 = performance.now()
      const entry = { name: t.name, ms: 0 }
      try {
        let value
        if (typeof t.fn === 'string') {
          value = await withTimeout(resolve(t.fn)(...t.args), PER_TEST_MS)
        } else {
          const fn = new Function(...names, 'return (async () => (' + t.call + '))()')
          value = await withTimeout(fn(...values), PER_TEST_MS)
        }
        const json = JSON.stringify(value === undefined ? null : value)
        entry.actual = JSON.parse(json === undefined ? 'null' : json)
      } catch (e) {
        entry.error = message(e)
      }
      entry.ms = Math.round(performance.now() - t0)
      parentPort.postMessage({ entry })
    }
    parentPort.postMessage({ done: true })
  }
}
`
