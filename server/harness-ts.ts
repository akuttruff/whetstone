/**
 * The TypeScript harness: runs in a child Node process with the solution
 * imported as a module. Each test is a function name with JSON arguments
 * (resolved as written, or in camelCase when the content was written for
 * Ruby), or a TypeScript expression (`call`) evaluated with the solution's
 * exports in scope. It prints one JSON line with the raw outcome per test;
 * comparison with the expected values happens in runner.ts.
 */
export const TS_HARNESS = (mark: string, perTestMs: number): string => String.raw`
import { readFileSync } from 'node:fs'
import { format } from 'node:util'

const MARK = '${mark}'
const PER_TEST_MS = ${perTestMs}
const tests = JSON.parse(readFileSync('./tests.json', 'utf8'))
const logs = []
const log = (...a) => { if (logs.length < 200) logs.push(format(...a)) }
console.log = console.info = console.debug = console.warn = console.error = log
const result = { results: [], output: '' }

const finish = () => {
  result.output = logs.join('\n').slice(0, 20000)
  process.stdout.write('\n' + MARK + JSON.stringify(result) + '\n')
  process.exit(0)
}
const message = (e) => (e && typeof e.message === 'string' ? e.message : String(e))
const withTimeout = (p, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('test timed out after ' + ms + ' ms')), ms)
  Promise.resolve(p).then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
})
const RESERVED = new Set(['default', 'class', 'function', 'var', 'let', 'const', 'new', 'delete', 'typeof', 'in', 'of', 'import', 'export', 'await', 'yield', 'this', 'super'])
const camel = (s) => s.replace(/_+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase())

let mod
try {
  mod = await import('./solution.ts')
} catch (e) {
  result.error = 'Your code could not be loaded: ' + message(e)
  finish()
}
const names = Object.keys(mod).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && !RESERVED.has(n))
const values = names.map((n) => mod[n])

const resolve = (fn) => {
  for (const n of [fn, camel(fn)]) if (typeof mod[n] === 'function') return mod[n]
  throw new Error('no exported function named ' + fn + (camel(fn) !== fn ? ' (or ' + camel(fn) + ')' : ''))
}

for (const t of tests) {
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
  result.results.push(entry)
}
finish()
`
