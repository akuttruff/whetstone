import type { Problem, Track } from '../types.ts'
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

export const BUILTIN_PROBLEMS: Problem[] = [
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
]

export const byTrack = (problems: Problem[], track: Track): Problem[] => problems.filter((p) => p.track === track)
