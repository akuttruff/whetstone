import type { Problem, Track } from '../types.ts'
import type { Language, Port } from '../types.ts'
import { normaliseTests } from '../lib/tests.ts'
import { PRACTICAL_DRIVERS } from './practical-drivers.ts'
import { CODING_PROBLEMS } from './coding.ts'
import { CODING_ARRAYS } from './coding-arrays.ts'
import { CODING_STRUCTURES } from './coding-structures.ts'
import { CODING_GRAPHS_DP } from './coding-graphs-dp.ts'
import { PRACTICAL_PROBLEMS } from './practical.ts'
import { PRACTICAL_MORE } from './practical-more.ts'
import { DESIGN_PROBLEMS } from './design.ts'
import { DESIGN_MORE } from './design-more.ts'
import { KNOWLEDGE_PROBLEMS } from './knowledge.ts'
import { KNOWLEDGE_MORE } from './knowledge-more.ts'
import { BEHAVIORAL_PROBLEMS } from './behavioral.ts'
import { BEHAVIORAL_MORE } from './behavioral-more.ts'

/**
 * Test calls written as TypeScript expressions become function + JSON
 * arguments, so every language can run them. Practical problems get their
 * test driver appended to the starter and the solution, and the tests that
 * call it. The Ruby and Java ports are not attached here: the browser loads
 * them on demand (see ports.ts, `withPorts`) and the server uses full.ts.
 */
const neutral = (ps: Problem[]): Problem[] =>
  ps.map((p) => {
    if (!('tests' in p)) return p
    const drivers = p.track === 'practical' ? PRACTICAL_DRIVERS[p.id] : undefined
    const withDriver = drivers?.driver ? { starter: p.starter.trimEnd() + '\n\n' + drivers.driver, solution: p.solution.trimEnd() + '\n\n' + drivers.driver } : {}
    return { ...p, ...withDriver, tests: normaliseTests(drivers?.tests ?? p.tests) }
  })

export type PortTable = Record<string, Port>
export type PortTables = Partial<Record<Exclude<Language, 'typescript'>, PortTable>>

/** Problems with the given ports attached; a problem that already carries a port (a generated one) keeps it. */
export function withPorts(problems: Problem[], tables: PortTables): Problem[] {
  const langs = (Object.keys(tables) as (keyof PortTables)[]).filter((l) => tables[l])
  if (langs.length === 0) return problems
  return problems.map((p) => {
    if (!('tests' in p)) return p
    let ports = p.ports
    for (const l of langs) {
      const port = tables[l]![p.id]
      if (port && !ports?.[l]) ports = { ...ports, [l]: port }
    }
    return ports === p.ports ? p : { ...p, ports }
  })
}

export const BUILTIN_PROBLEMS: Problem[] = neutral([
  ...CODING_PROBLEMS,
  ...CODING_ARRAYS,
  ...CODING_STRUCTURES,
  ...CODING_GRAPHS_DP,
  ...PRACTICAL_PROBLEMS,
  ...PRACTICAL_MORE,
  ...DESIGN_PROBLEMS,
  ...DESIGN_MORE,
  ...KNOWLEDGE_PROBLEMS,
  ...KNOWLEDGE_MORE,
  ...BEHAVIORAL_PROBLEMS,
  ...BEHAVIORAL_MORE,
])

export const byTrack = (problems: Problem[], track: Track): Problem[] => problems.filter((p) => p.track === track)
