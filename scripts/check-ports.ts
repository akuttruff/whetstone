// Runs a language's ports through the real sandbox, like the content test
// but for a few problems at a time while writing them:
//   node --experimental-strip-types --no-warnings scripts/check-ports.ts rust two-sum valid-anagram
//   node --experimental-strip-types --no-warnings scripts/check-ports.ts rust --file src/data/ports-rust-arrays.ts
// With --file, every id in that file's exported table is checked. Each
// solution must pass its tests and each starter must at least compile.
import os from 'node:os'
import path from 'node:path'
import { isCode } from '../src/types.ts'
import type { Language, Port } from '../src/types.ts'
import { runTests } from '../server/runner.ts'

const [language, ...rest] = process.argv.slice(2) as [Language, ...string[]]
if (!language) { console.error('usage: check-ports.ts <language> (<id>... | --file <path>)'); process.exit(2) }
const dir = path.join(os.tmpdir(), 'whetstone-check-ports')
// With --file only the base content is loaded (not every language's port files), so a half-written file elsewhere cannot get in the way.
const fileMode = process.argv.includes('--file')
const { BUILTIN_PROBLEMS } = fileMode ? await import('../src/data/index.ts') : await import('../src/data/full.ts')
const code = BUILTIN_PROBLEMS.filter(isCode)

let table: Record<string, Port> = {}
let ids: string[]
const fileAt = rest.indexOf('--file')
if (fileAt >= 0) {
  const mod = (await import(path.resolve(rest[fileAt + 1]!))) as Record<string, Record<string, Port>>
  table = Object.assign({}, ...Object.values(mod).filter((v) => v && typeof v === 'object'))
  ids = Object.keys(table)
} else {
  ids = rest
  for (const p of code) if (ids.includes(p.id)) { const port = language === 'typescript' ? { starter: p.starter, solution: p.solution } : p.ports?.[language]; if (port) table[p.id] = port }
}

let failures = 0
for (const id of ids) {
  const p = code.find((x) => x.id === id)
  const port = table[id]
  if (!p) { console.log(`✗ ${id}: no such code problem`); failures++; continue }
  if (!port) { console.log(`✗ ${id}: no ${language} port`); failures++; continue }
  const r = await runTests(port.solution, p.tests, { dir, language, timeoutMs: 60_000 })
  if (!r.ok) {
    failures++
    console.log(`✗ ${id} solution: ${r.error ?? r.results.filter((t) => !t.pass).map((t) => `${t.name} -> ${t.error ?? t.actual} (expected ${t.expected})`).join('; ')}`)
  }
  const s = await runTests(port.starter, p.tests, { dir, language, timeoutMs: 60_000 })
  if (s.error) { failures++; console.log(`✗ ${id} starter: ${s.error}`) }
  if (r.ok && !s.error) console.log(`✓ ${id} (${r.passed}/${r.total}, ${r.ms} ms)`)
}
console.log(failures ? `${failures} problem(s)` : `all ${ids.length} ok`)
process.exit(failures ? 1 : 0)
