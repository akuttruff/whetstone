import type { Problem, Track } from '../types.ts'
import { normaliseTests } from '../lib/tests.ts'
import { RUBY_PORTS } from './ports-ruby.ts'
import { JAVA_PORTS } from './ports-java.ts'
import { RUBY_PRACTICAL } from './ports-practical-ruby.ts'
import { JAVA_PRACTICAL } from './ports-practical-java.ts'
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
 * arguments, so every language can run them; coding problems pick up their
 * Ruby and Java versions (hand-written in ports-*.ts, verified by the content test).
 */
const neutral = (ps: Problem[]): Problem[] =>
  ps.map((p) => {
    if (!('tests' in p)) return p
    const ruby = (p.track === 'coding' ? RUBY_PORTS : RUBY_PRACTICAL)[p.id]
    const java = (p.track === 'coding' ? JAVA_PORTS : JAVA_PRACTICAL)[p.id]
    const ports = ruby || java ? { ...(ruby ? { ruby } : {}), ...(java ? { java } : {}) } : undefined
    // Practical problems: the test driver rides along in the starter and the solution, and the tests call it.
    const drivers = p.track === 'practical' ? PRACTICAL_DRIVERS[p.id] : undefined
    const withDriver = drivers?.driver ? { starter: p.starter.trimEnd() + '\n\n' + drivers.driver, solution: p.solution.trimEnd() + '\n\n' + drivers.driver } : {}
    return { ...p, ...withDriver, tests: normaliseTests(drivers?.tests ?? p.tests), ...(ports ? { ports } : {}) }
  })

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
